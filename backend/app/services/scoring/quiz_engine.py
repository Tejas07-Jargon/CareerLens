from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.dynamic_profile import (
    SkillProfile,
    SkillTopic,
    QuizAttempt,
    QuizQuestionResult,
    ProfileSnapshot,
    Recommendation,
)
from app.models.profile import Profile


async def process_quiz_submission(
    db: AsyncSession,
    profile_id: str,
    quiz_id: str,
    answers: List[Dict[str, Any]],
    time_taken: int
) -> dict:
    """
    answers format:
    [
      {
        "question_id": 1,
        "skill": "DSA",
        "topic": "Arrays",
        "difficulty": "medium",
        "is_correct": true,
        "selected_answer": "A",
        "time_taken": 10
      }, ...
    ]
    """
    total_questions = len(answers)
    correct_answers = sum(1 for a in answers if a.get("is_correct"))
    incorrect_answers = total_questions - correct_answers
    percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0.0

    # 1. Create Quiz Attempt
    attempt = QuizAttempt(
        profile_id=profile_id,
        quiz_id=quiz_id,
        score=correct_answers,
        percentage=percentage,
        total_questions=total_questions,
        correct_answers=correct_answers,
        incorrect_answers=incorrect_answers,
        time_taken=time_taken
    )
    db.add(attempt)
    await db.flush()

    # 2. Add Question Results & Group by Skill/Topic
    skill_perf = {}
    topic_perf = {}

    for ans in answers:
        skill = ans.get("skill", "General")
        topic = ans.get("topic", "General")
        is_correct = ans.get("is_correct", False)

        q_res = QuizQuestionResult(
            attempt_id=attempt.id,
            question_id=ans.get("question_id"),
            skill=skill,
            topic=topic,
            difficulty=ans.get("difficulty"),
            is_correct=is_correct,
            selected_answer=ans.get("selected_answer"),
            time_taken=ans.get("time_taken")
        )
        db.add(q_res)

        # Aggregate skill stats
        if skill not in skill_perf:
            skill_perf[skill] = {"total": 0, "correct": 0}
        skill_perf[skill]["total"] += 1
        if is_correct:
            skill_perf[skill]["correct"] += 1

        # Aggregate topic stats
        if skill not in topic_perf:
            topic_perf[skill] = {}
        if topic not in topic_perf[skill]:
            topic_perf[skill][topic] = {"total": 0, "correct": 0}
        topic_perf[skill][topic]["total"] += 1
        if is_correct:
            topic_perf[skill][topic]["correct"] += 1

    # 3. Update Skills and Topics
    skill_updates = []
    topic_updates = []

    for skill, stats in skill_perf.items():
        quiz_skill_score = (stats["correct"] / stats["total"]) * 100
        
        stmt = select(SkillProfile).where(SkillProfile.profile_id == profile_id, SkillProfile.skill_name == skill)
        result = await db.execute(stmt)
        skill_prof = result.scalars().first()

        if not skill_prof:
            skill_prof = SkillProfile(
                profile_id=profile_id,
                skill_name=skill,
                mastery_score=quiz_skill_score,
                quiz_score=quiz_skill_score,
                trend="up"
            )
            db.add(skill_prof)
            await db.flush()
            
            skill_updates.append({
                "skill": skill,
                "previous_score": 0.0,
                "new_score": quiz_skill_score,
                "change": quiz_skill_score,
                "trend": "up"
            })
        else:
            prev_score = skill_prof.mastery_score
            # 70/30 algorithm
            new_score = (0.7 * prev_score) + (0.3 * quiz_skill_score)
            
            trend = "stable"
            if new_score > prev_score + 1.0:
                trend = "up"
            elif new_score < prev_score - 1.0:
                trend = "down"
                
            skill_prof.mastery_score = new_score
            skill_prof.quiz_score = quiz_skill_score
            skill_prof.trend = trend
            skill_prof.last_assessed_at = datetime.utcnow()
            
            skill_updates.append({
                "skill": skill,
                "previous_score": round(prev_score, 1),
                "new_score": round(new_score, 1),
                "change": round(new_score - prev_score, 1),
                "trend": trend
            })

        # Update Topics
        for topic, t_stats in topic_perf[skill].items():
            topic_score = (t_stats["correct"] / t_stats["total"]) * 100
            
            t_stmt = select(SkillTopic).where(SkillTopic.skill_profile_id == skill_prof.id, SkillTopic.topic_name == topic)
            t_result = await db.execute(t_stmt)
            topic_prof = t_result.scalars().first()
            
            if not topic_prof:
                topic_prof = SkillTopic(
                    skill_profile_id=skill_prof.id,
                    topic_name=topic,
                    mastery_score=topic_score,
                    questions_attempted=t_stats["total"],
                    questions_correct=t_stats["correct"],
                    last_assessed_at=datetime.utcnow()
                )
                db.add(topic_prof)
                
                topic_updates.append({
                    "topic": topic,
                    "score": round(topic_score, 1),
                    "change": round(topic_score, 1)
                })
            else:
                prev_t_score = topic_prof.mastery_score
                new_t_score = (0.7 * prev_t_score) + (0.3 * topic_score)
                topic_prof.mastery_score = new_t_score
                topic_prof.questions_attempted += t_stats["total"]
                topic_prof.questions_correct += t_stats["correct"]
                topic_prof.last_assessed_at = datetime.utcnow()
                
                topic_updates.append({
                    "topic": topic,
                    "score": round(new_t_score, 1),
                    "change": round(new_t_score - prev_t_score, 1)
                })

    # 4. Update Profile Overall Stats
    stmt = select(Profile).where(Profile.id == profile_id)
    p_res = await db.execute(stmt)
    prof = p_res.scalars().first()
    
    if prof:
        prof.total_quizzes += 1
        prof.quiz_streak += 1 # simplistic streak
        prof.last_quiz_at = datetime.utcnow()
        
        # Recalculate average
        stmt_avg = select(QuizAttempt.percentage).where(QuizAttempt.profile_id == profile_id)
        res_avg = await db.execute(stmt_avg)
        all_percentages = res_avg.scalars().all()
        if all_percentages:
            prof.quiz_average = sum(all_percentages) / len(all_percentages)
            
        # Recalculate Readiness (simplistic example: 50% quiz avg, 50% evidence if exists)
        # Assuming Evidence Score might be computed elsewhere, we just combine what we have.
        # This can be made more sophisticated.
        evidence = 0.0 # Placeholder if no evidence score on profile model
        # Try to pull evidence from dynamic skill profiles or evidence records if needed
        # We'll just use quiz average for readiness right now or bump it slightly.
        if prof.overall_readiness_score is None:
            prof.overall_readiness_score = prof.quiz_average
        else:
            prof.overall_readiness_score = (0.8 * prof.overall_readiness_score) + (0.2 * prof.quiz_average)

        readiness = round(prof.overall_readiness_score, 1)
        quiz_avg = round(prof.quiz_average, 1)
    else:
        readiness = 0.0
        quiz_avg = 0.0

    # 5. Create Snapshot
    snap = ProfileSnapshot(
        profile_id=profile_id,
        overall_score=readiness,
        readiness_score=readiness,
        snapshot_reason=f"Quiz submitted: {quiz_id}"
    )
    db.add(snap)

    # 6. Generate basic recommendations
    # Remove old quiz recommendations
    await db.execute(
        select(Recommendation).where(Recommendation.profile_id == profile_id, Recommendation.type == "quiz")
    )
    # Note: deletion could be done, or status="resolved"
    # Create new recommendation for lowest skill
    stmt_skills = select(SkillProfile).where(SkillProfile.profile_id == profile_id).order_by(SkillProfile.mastery_score.asc())
    skills_res = await db.execute(stmt_skills)
    lowest = skills_res.scalars().first()
    
    recs = []
    if lowest and lowest.mastery_score < 70:
        rec = Recommendation(
            profile_id=profile_id,
            type="quiz",
            title=f"Practice {lowest.skill_name}",
            description=f"Your {lowest.skill_name} mastery is {round(lowest.mastery_score, 1)}%. Take another quiz to improve it.",
            priority="HIGH",
            skill=lowest.skill_name
        )
        db.add(rec)
        recs.append({
            "title": rec.title,
            "description": rec.description
        })

    await db.commit()

    return {
        "attempt": {
            "score": correct_answers,
            "percentage": round(percentage, 1),
            "correct": correct_answers,
            "incorrect": incorrect_answers
        },
        "skill_updates": skill_updates,
        "topic_updates": topic_updates,
        "profile": {
            "readiness_score": readiness,
            "quiz_average": quiz_avg
        },
        "recommendations": recs
    }
