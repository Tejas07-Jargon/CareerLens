"""
Quiz generation endpoint.

POST /quiz/generate  — Gemini generates hard role-specific MCQs
"""

import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class QuizRequest(BaseModel):
    role: str = "Software Engineer"
    skills: List[str] = []
    interests: str = ""
    num_questions: int = 10


class QuizOption(BaseModel):
    label: str   # A | B | C | D
    text: str


class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[QuizOption]
    correct: str   # A | B | C | D
    explanation: str
    topic: str
    difficulty: str = "expert"


class QuizResponse(BaseModel):
    role: str
    questions: List[QuizQuestion]


# ── POST /quiz/generate ───────────────────────────────────────────────────────

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    """
    Use Gemini to generate extremely hard, expert-level MCQs tailored to the
    requested role and skill set.
    """
    from app.core.config import settings

    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API key not configured.")

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not initialise Gemini: {e}")

    skills_str = (", ".join(req.skills) if req.skills else "general software engineering")
    n = min(max(req.num_questions, 3), 15)   # clamp 3–15

    prompt = f"""You are a senior FAANG principal engineer creating an extremely hard technical interview quiz.

Role: {req.role}
Key skills / topics: {skills_str}
Candidate interests: {req.interests or "general"}

Generate exactly {n} EXPERT-LEVEL multiple-choice questions.

Rules:
• Every question must be genuinely hard — suitable for a senior/staff engineer interview.
• Questions should probe deep understanding: edge cases, internals, trade-offs, obscure but important behaviour.
• Each question has EXACTLY 4 options (A, B, C, D). Only ONE is correct.
• Wrong options must be plausible — not obviously wrong.
• Cover a variety of topics from: algorithms & complexity, system design, language internals, concurrency, databases, distributed systems, design patterns, security, networking.
• Write a detailed, educational explanation (3-5 sentences) for the correct answer.

Return ONLY a valid JSON array (no markdown fences, no prose) of exactly {n} objects:
[
  {{
    "id": 1,
    "question": "<full question text>",
    "options": [
      {{"label": "A", "text": "<option A>"}},
      {{"label": "B", "text": "<option B>"}},
      {{"label": "C", "text": "<option C>"}},
      {{"label": "D", "text": "<option D>"}}
    ],
    "correct": "<A|B|C|D>",
    "explanation": "<detailed explanation>",
    "topic": "<short topic name>",
    "difficulty": "expert"
  }},
  ...
]"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {e}")

    # Strip markdown fences if present
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:].strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {e}")

    try:
        questions = [QuizQuestion(**q) for q in data]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Question schema mismatch: {e}")

    return QuizResponse(role=req.role, questions=questions)
