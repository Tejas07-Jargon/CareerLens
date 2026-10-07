import uuid
from datetime import datetime
from typing import List, Optional, Dict

from sqlalchemy import DateTime, ForeignKey, String, Text, Float, Integer, Boolean
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LeetCodeProfile(Base):
    __tablename__ = "leetcode_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    
    # Aggregated Stats
    total_solved: Mapped[int] = mapped_column(Integer, default=0)
    easy_solved: Mapped[int] = mapped_column(Integer, default=0)
    medium_solved: Mapped[int] = mapped_column(Integer, default=0)
    hard_solved: Mapped[int] = mapped_column(Integer, default=0)
    
    acceptance_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    global_ranking: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reputation: Mapped[int] = mapped_column(Integer, default=0)
    
    # Aggregate Stats (When question-level data is unavailable)
    aggregate_topics: Mapped[Dict] = mapped_column(JSON, default=dict)
    aggregate_languages: Mapped[Dict] = mapped_column(JSON, default=dict)
    aggregate_submissions: Mapped[Dict] = mapped_column(JSON, default=dict)
    
    # JSON for dynamic badge data
    badges: Mapped[List] = mapped_column(JSON, default=list)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="leetcode_profile")
    solved_problems = relationship("LeetCodeSolvedProblem", back_populates="leetcode_profile", cascade="all, delete-orphan")
    submissions = relationship("LeetCodeSubmission", back_populates="leetcode_profile", cascade="all, delete-orphan")
    contests = relationship("LeetCodeContest", back_populates="leetcode_profile", cascade="all, delete-orphan")
    snapshots = relationship("LeetCodeSnapshot", back_populates="leetcode_profile", cascade="all, delete-orphan")
    sync_runs = relationship("LeetCodeSyncRun", back_populates="leetcode_profile", cascade="all, delete-orphan")


class LeetCodeProblem(Base):
    __tablename__ = "leetcode_problems"

    # Canonical lookup table for problem metadata
    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    title_slug: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    difficulty: Mapped[str] = mapped_column(String(32))  # Easy, Medium, Hard
    acceptance_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    topics = relationship("LeetCodeProblemTopic", back_populates="problem", cascade="all, delete-orphan")


class LeetCodeProblemTopic(Base):
    __tablename__ = "leetcode_problem_topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("leetcode_problems.question_id"), index=True)
    topic_slug: Mapped[str] = mapped_column(String(128), index=True)
    topic_name: Mapped[str] = mapped_column(String(128))
    
    problem = relationship("LeetCodeProblem", back_populates="topics")


class LeetCodeSolvedProblem(Base):
    __tablename__ = "leetcode_solved_problems"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    leetcode_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("leetcode_profiles.id"), index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("leetcode_problems.question_id"), index=True)
    
    status: Mapped[str] = mapped_column(String(32)) # "Accepted", "Attempted"
    recent_submission_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Store attempts if available
    attempts: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    leetcode_profile = relationship("LeetCodeProfile", back_populates="solved_problems")
    problem = relationship("LeetCodeProblem")


class LeetCodeSubmission(Base):
    __tablename__ = "leetcode_submissions"

    submission_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    leetcode_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("leetcode_profiles.id"), index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("leetcode_problems.question_id"), index=True)
    
    status_display: Mapped[str] = mapped_column(String(64)) # "Accepted", "Wrong Answer", "Time Limit Exceeded"
    lang: Mapped[str] = mapped_column(String(64))
    runtime_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    memory_percentile: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    leetcode_profile = relationship("LeetCodeProfile", back_populates="submissions")
    problem = relationship("LeetCodeProblem")


class LeetCodeContest(Base):
    __tablename__ = "leetcode_contests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    leetcode_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("leetcode_profiles.id"), index=True)
    
    contest_name: Mapped[str] = mapped_column(String(256))
    rating: Mapped[float] = mapped_column(Float)
    global_rank: Mapped[int] = mapped_column(Integer)
    problems_solved: Mapped[int] = mapped_column(Integer)
    total_problems: Mapped[int] = mapped_column(Integer)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    
    leetcode_profile = relationship("LeetCodeProfile", back_populates="contests")


class LeetCodeSnapshot(Base):
    __tablename__ = "leetcode_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    leetcode_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("leetcode_profiles.id"), index=True)
    
    snapshot_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    total_solved: Mapped[int] = mapped_column(Integer)
    easy_solved: Mapped[int] = mapped_column(Integer)
    medium_solved: Mapped[int] = mapped_column(Integer)
    hard_solved: Mapped[int] = mapped_column(Integer)
    
    acceptance_rate: Mapped[float] = mapped_column(Float)
    global_ranking: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    leetcode_profile = relationship("LeetCodeProfile", back_populates="snapshots")


class LeetCodeSyncRun(Base):
    __tablename__ = "leetcode_sync_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    leetcode_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("leetcode_profiles.id"), index=True)
    
    status: Mapped[str] = mapped_column(String(32))  # "success", "failed"
    provider_name: Mapped[str] = mapped_column(String(64))  # "OfficialProvider", "ImportProvider"
    capabilities_used: Mapped[List] = mapped_column(JSON)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    leetcode_profile = relationship("LeetCodeProfile", back_populates="sync_runs")
