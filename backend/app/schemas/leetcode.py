from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from datetime import datetime


# Common / Base Models
class LeetCodeBadge(BaseModel):
    id: str
    name: str
    icon_url: str
    creation_date: Optional[str] = None

class LeetCodeSnapshotBase(BaseModel):
    snapshot_date: datetime
    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    acceptance_rate: Optional[float]
    global_ranking: Optional[int]

class LeetCodeSnapshotResponse(LeetCodeSnapshotBase):
    id: str
    model_config = ConfigDict(from_attributes=True)


# Provider Models (For JSON Import)
class ImportProviderPayload(BaseModel):
    profile: Dict[str, Any]
    submissions: List[Dict[str, Any]]
    contests: List[Dict[str, Any]]


# Sync & Run Models
class LeetCodeSyncRunResponse(BaseModel):
    id: str
    status: str
    provider_name: str
    capabilities_used: List[str]
    error_message: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Profile Models
class LeetCodeProfileResponse(BaseModel):
    id: str
    profile_id: str
    username: str
    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    acceptance_rate: Optional[float]
    global_ranking: Optional[int]
    reputation: int
    badges: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Problem Models
class LeetCodeProblemTopicResponse(BaseModel):
    topic_slug: str
    topic_name: str
    model_config = ConfigDict(from_attributes=True)

class LeetCodeProblemResponse(BaseModel):
    question_id: int
    title: str
    title_slug: str
    difficulty: str
    acceptance_rate: Optional[float]
    is_premium: bool
    topics: List[LeetCodeProblemTopicResponse]
    model_config = ConfigDict(from_attributes=True)


class LeetCodeSolvedProblemResponse(BaseModel):
    id: str
    status: str
    recent_submission_time: Optional[datetime]
    attempts: Optional[int]
    problem: LeetCodeProblemResponse
    model_config = ConfigDict(from_attributes=True)


class LeetCodeSubmissionResponse(BaseModel):
    submission_id: int
    status_display: str
    lang: str
    runtime_percentile: Optional[float]
    memory_percentile: Optional[float]
    timestamp: datetime
    code: Optional[str]
    problem: LeetCodeProblemResponse
    model_config = ConfigDict(from_attributes=True)


class LeetCodeContestResponse(BaseModel):
    id: str
    contest_name: str
    rating: float
    global_rank: int
    problems_solved: int
    total_problems: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
