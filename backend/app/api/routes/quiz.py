"""
Quiz generation endpoint.

POST /quiz/generate  — Gemini generates hard role-specific MCQs
Uses the new google-genai SDK (google.genai package).
"""

import json
import re
from typing import List

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


# ── helper: strip markdown fences ────────────────────────────────────────────

def _extract_json(raw: str) -> str:
    """Remove ```json ... ``` fences and leading/trailing whitespace."""
    raw = raw.strip()
    # Remove fenced code blocks
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


# ── POST /quiz/generate ───────────────────────────────────────────────────────

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    """
    Use Gemini 2.5 Flash to generate extremely hard, expert-level MCQs
    tailored to the requested role and skill set.
    """
    from app.core.config import settings

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured.")

    try:
        from google import genai
        from google.genai import types as gtypes
        client = genai.Client(api_key=api_key)
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="google-genai package not installed. Run: pip install google-genai"
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not initialise Gemini client: {e}")

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
• Vary difficulty slightly but keep all questions hard.

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
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config=gtypes.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=8192,
            ),
        )
        raw = response.text or ""
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {e}")

    raw = _extract_json(raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Try to find a JSON array in the response as fallback
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {e}")
        else:
            raise HTTPException(status_code=502, detail="Gemini did not return a JSON array.")

    if not isinstance(data, list) or len(data) == 0:
        raise HTTPException(status_code=502, detail="Gemini returned an empty question list.")

    try:
        questions = [QuizQuestion(**q) for q in data]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Question schema mismatch: {e}")

    return QuizResponse(role=req.role, questions=questions)
