"""
Deterministic Ownership Factor Calculation.

Pure function computing the ownership factor for evidence strength adjustments.
Follows the CareerLens Ownership Map specification:

Rules:
1. 0 surviving meaningful lines (or student has 0 lines):
   factor = 0.0
2. student_share >= 0.50 (full_at):
   factor = 1.00
3. student has fewer than 20 meaningful lines AND share < 0.25 (floor):
   factor = 0.10 (token)
4. otherwise:
   factor = max(floor, min(1.0, student_share / full_at))
"""

from typing import Optional


def calculate_ownership_factor(
    student_share: float,
    total_lines: float,
    full_at: float = 0.50,
    floor: float = 0.25,
    token: float = 0.10,
    min_lines: int = 20,
) -> float:
    """
    Computes a deterministic ownership factor in [0.0, 1.0].

    Parameters
    ----------
    student_share : float
        Candidate's share of surviving meaningful lines in [0.0, 1.0].
    total_lines : float
        Total surviving meaningful lines for this repository / skill.
    full_at : float
        Share threshold at which candidate receives full 1.0 factor (default 0.50).
    floor : float
        Baseline floor factor for non-token contributions (default 0.25).
    token : float
        Factor for low-line, low-share contributions (default 0.10).
    min_lines : int
        Minimum lines threshold to avoid token attribution (default 20).

    Returns
    -------
    float
        Deterministic factor in [0.0, 1.0], rounded to 4 decimal places.
    """
    if total_lines <= 0 or student_share <= 0:
        return 0.0

    student_lines = student_share * total_lines
    if student_lines <= 0:
        return 0.0

    # Rule 2: Full credit at or above 50% share
    if student_share >= full_at:
        return 1.00

    # Rule 3: Token attribution for tiny contributions
    if student_lines < min_lines and student_share < floor:
        return round(token, 4)

    # Rule 4: Scaled attribution with floor
    scaled = student_share / full_at
    factor = max(floor, min(1.0, scaled))
    return round(factor, 4)


def get_ownership_confidence_label(
    status: str,
    coverage: float,
    incomplete: bool = False,
    unknown_share: float = 0.0,
) -> str:
    """
    Returns the confidence tier of an ownership analysis.

    HIGH: Full blame, sufficient coverage (>= 0.70), not incomplete, unknown_share <= 0.30.
    PARTIAL: Analysis completed but incomplete coverage or unresolved attribution.
    LOW: Statistical / fallback analysis.
    NOT_ANALYSED: Not yet analysed or unavailable.
    FAILED: Analysis failed.
    """
    status_lower = status.lower()
    if status_lower in ("failed", "error", "shallow_rejected"):
        return "FAILED"
    if status_lower in ("not_analysed", "discovered", "queued", "analysing"):
        return "NOT_ANALYSED"

    if status_lower in ("complete", "success"):
        if coverage >= 0.70 and not incomplete and unknown_share <= 0.30:
            return "HIGH"
        return "PARTIAL"

    if status_lower in ("partial", "incomplete"):
        return "PARTIAL"

    return "LOW"
