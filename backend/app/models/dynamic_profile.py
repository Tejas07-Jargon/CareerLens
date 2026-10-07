import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base


class SkillProfile(Base):
    __tablename__ = "skill_profiles"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    skill_name: Mapped[str] = mapped_column(String(128))
    category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    quiz_score: Mapped[float] = mapped_column(Float, default=0.0)
    project_score: Mapped[float] = mapped_column(Float, default=0.0)
    activity_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    trend: Mapped[str] = mapped_column(String(16), default="stable")
    last_assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    profile = relationship("Profile", back_populates="skill_profiles")
    topics = relationship("SkillTopic", back_populates="skill_profile", cascade="all, delete-orphan")


class SkillTopic(Base):
    __tablename__ = "skill_topics"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("skill_profiles.id", ondelete="CASCADE"), index=True)
    topic_name: Mapped[str] = mapped_column(String(128))
    
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0)
    questions_attempted: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)
    last_assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    skill_profile = relationship("SkillProfile", back_populates="topics")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    quiz_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    
    score: Mapped[int] = mapped_column(Integer, default=0)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    incorrect_answers: Mapped[int] = mapped_column(Integer, default=0)
    time_taken: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    profile = relationship("Profile", back_populates="quiz_attempts")
    question_results = relationship("QuizQuestionResult", back_populates="attempt", cascade="all, delete-orphan")


class QuizQuestionResult(Base):
    __tablename__ = "quiz_question_results"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    skill: Mapped[str] = mapped_column(String(128))
    topic: Mapped[str] = mapped_column(String(128))
    difficulty: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    selected_answer: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    time_taken: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    attempt = relationship("QuizAttempt", back_populates="question_results")


class ProfileSnapshot(Base):
    __tablename__ = "profile_snapshots"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    readiness_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    snapshot_reason: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    profile = relationship("Profile", back_populates="snapshots")


class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(64)) # "quiz", "project", "learning"
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(32), default="medium")
    skill: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    profile = relationship("Profile", back_populates="recommendations")
