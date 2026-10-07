"""
Quiz generation endpoint - uses Gemini REST API directly via httpx.
No SDK dependency, automatic model fallback, robust JSON parsing.

POST /quiz/generate
"""

import json
import re
from typing import List

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Working models confirmed via live test (others are overloaded / return empty content)
MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
]

GEMINI_REST = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


# ── Schemas ───────────────────────────────────────────────────────────────────

class QuizRequest(BaseModel):
    role: str = "Software Engineer"
    skills: List[str] = []
    interests: str = ""
    num_questions: int = 10
    difficulty: str = "Expert"


class QuizOption(BaseModel):
    label: str
    text: str


class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[QuizOption]
    correct: str
    explanation: str
    topic: str
    difficulty: str = "expert"


class QuizResponse(BaseModel):
    role: str
    questions: List[QuizQuestion]


# ── helpers ───────────────────────────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```\s*$", "", raw)
    return raw.strip()


def _parse_json_array(raw: str) -> list:
    """
    Parse a JSON array from LLM output.
    LLMs often produce trailing commas, comments, etc.
    Tries: standard json → json5 → regex-strip trailing commas → extract first [...] block.
    """
    # 1. Standard JSON
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # 2. json5 (handles trailing commas, comments)
    try:
        import json5
        result = json5.loads(raw)
        if isinstance(result, list):
            return result
    except Exception:
        pass

    # 3. Regex: strip trailing commas before ] or }
    cleaned = re.sub(r",\s*([\]}])", r"\1", raw)
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # 4. Extract first [...] block and retry
    match = re.search(r"\[\s*\{[\s\S]*?\}\s*\]", raw)
    if match:
        block = re.sub(r",\s*([\]}])", r"\1", match.group())
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON array. Preview: {raw[:300]}")



async def _call_gemini(api_key: str, prompt: str) -> str:
    """
    Try each model in the fallback chain. Returns the raw text response.
    Raises HTTPException if all models fail.
    """
    last_error = "No models tried"

    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in MODELS:
            url = GEMINI_REST.format(model=model)
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 8192,
                },
            }
            try:
                resp = await client.post(
                    url,
                    params={"key": api_key},
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                if resp.status_code == 200:
                    data = resp.json()
                    # Extract text from candidates[0].content.parts[0].text
                    text = (
                        data
                        .get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    if text:
                        return text
                    last_error = f"Model {model}: empty text in response"

                elif resp.status_code in (429, 503):
                    # Overloaded or rate-limited — try next model
                    err = resp.json().get("error", {}).get("message", resp.text)
                    last_error = f"Model {model} unavailable: {err}"
                    continue

                else:
                    err = resp.json().get("error", {}).get("message", resp.text)
                    last_error = f"Model {model} error {resp.status_code}: {err}"
                    continue

            except httpx.TimeoutException:
                last_error = f"Model {model}: request timed out"
                continue
            except Exception as e:
                last_error = f"Model {model}: {e}"
                continue

    raise HTTPException(
        status_code=502,
        detail=f"All Gemini models failed. Last error: {last_error}"
    )


# ── POST /quiz/generate ───────────────────────────────────────────────────────

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    from app.core.config import settings

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set in .env")

    skills_str = ", ".join(req.skills) if req.skills else "general software engineering"
    n = min(max(req.num_questions, 3), 30)
    diff_lower = req.difficulty.lower()

    prompt = f"""You are a senior technical interviewer creating a quiz.

Role: {req.role}
Skills / topics: {skills_str}
Domain interests: {req.interests or "general"}
Difficulty: {req.difficulty}

Generate EXACTLY {n} {diff_lower}-level multiple-choice questions.

Rules:
- Difficulty must match the requested level ({req.difficulty}):
  - Easy: basic concepts, syntax, common definitions.
  - Hard: practical application, common edge cases, system architecture basics.
  - Expert: obscure edge cases, internals, deep trade-offs, concurrency, complexity.
- Each question has EXACTLY 4 options (A, B, C, D). Only ONE correct.
- Wrong options must be plausible.
- Cover variety: algorithms, system design, language internals, databases, networking, security.
- Keep the explanation CONCISE (1-2 short sentences max) to ensure the response isn't cut off.
- You must complete all {n} questions and properly close the JSON array.

IMPORTANT: Return ONLY a raw JSON array — no markdown, no code fences, no extra text:
[
  {{
    "id": 1,
    "question": "...",
    "options": [
      {{"label": "A", "text": "..."}},
      {{"label": "B", "text": "..."}},
      {{"label": "C", "text": "..."}},
      {{"label": "D", "text": "..."}}
    ],
    "correct": "A",
    "explanation": "...",
    "topic": "System Design",
    "difficulty": "{diff_lower}"
  }}
]"""

    # Call Gemini with model fallback
    raw = await _call_gemini(api_key, prompt)
    raw = _strip_fences(raw)

    # Parse JSON
    try:
        data = _parse_json_array(raw)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"JSON parse failed: {e}")

    if not data:
        raise HTTPException(status_code=502, detail="Gemini returned zero questions.")

    # Build validated questions
    try:
        questions = [QuizQuestion(**q) for q in data[:n]]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Question schema error: {e}")

    return QuizResponse(role=req.role, questions=questions)
