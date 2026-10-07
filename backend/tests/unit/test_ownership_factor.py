"""
Unit Tests for Ownership Factor and Confidence Calculations.
"""

import pytest
from app.services.ownership.factor import (
    calculate_ownership_factor,
    get_ownership_confidence_label,
)


class TestOwnershipFactor:
    """Tests the deterministic ownership factor calculation rules."""

    def test_zero_lines_or_zero_share_produces_zero(self):
        assert calculate_ownership_factor(student_share=0.0, total_lines=100) == 0.0
        assert calculate_ownership_factor(student_share=0.5, total_lines=0) == 0.0
        assert calculate_ownership_factor(student_share=-0.1, total_lines=100) == 0.0

    def test_fifty_percent_or_higher_produces_full_factor(self):
        assert calculate_ownership_factor(student_share=0.50, total_lines=100) == 1.00
        assert calculate_ownership_factor(student_share=0.60, total_lines=200) == 1.00
        assert calculate_ownership_factor(student_share=0.95, total_lines=500) == 1.00
        assert calculate_ownership_factor(student_share=1.00, total_lines=50) == 1.00

    def test_forty_percent_produces_point_eight(self):
        # 0.40 / 0.50 = 0.80
        assert calculate_ownership_factor(student_share=0.40, total_lines=100) == 0.80

    def test_thirty_percent_produces_point_six(self):
        # 0.30 / 0.50 = 0.60
        assert calculate_ownership_factor(student_share=0.30, total_lines=100) == 0.60

    def test_twenty_percent_with_sufficient_lines_produces_point_four(self):
        # 0.20 * 200 = 40 lines (>= 20 min_lines)
        # 0.20 / 0.50 = 0.40
        assert calculate_ownership_factor(student_share=0.20, total_lines=200) == 0.40

    def test_low_share_with_sufficient_lines_produces_floor(self):
        # 5% of 1000 lines = 50 lines (>= 20 lines) -> max(0.25, 0.05/0.50 = 0.10) = 0.25
        assert calculate_ownership_factor(student_share=0.05, total_lines=1000) == 0.25

    def test_token_case_for_few_lines_and_low_share(self):
        # 8 lines out of 100 = 8% share (< 25% share and < 20 lines) -> token 0.10
        assert calculate_ownership_factor(student_share=0.08, total_lines=100) == 0.10

    def test_bounds_never_exceed_one_or_below_zero(self):
        for share in [-0.5, 0.0, 0.01, 0.15, 0.25, 0.50, 0.75, 1.0, 1.5]:
            for lines in [0, 5, 10, 50, 500]:
                factor = calculate_ownership_factor(student_share=share, total_lines=lines)
                assert 0.0 <= factor <= 1.0

    def test_monotonicity_with_share_for_fixed_lines(self):
        lines = 200
        shares = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 1.0]
        factors = [calculate_ownership_factor(s, lines) for s in shares]
        for i in range(len(factors) - 1):
            assert factors[i] <= factors[i + 1]


class TestOwnershipConfidenceLabel:
    """Tests confidence classification."""

    def test_high_confidence(self):
        label = get_ownership_confidence_label(
            status="complete",
            coverage=0.95,
            incomplete=False,
            unknown_share=0.05,
        )
        assert label == "HIGH"

    def test_partial_confidence_due_to_low_coverage(self):
        label = get_ownership_confidence_label(
            status="complete",
            coverage=0.50,
            incomplete=False,
            unknown_share=0.05,
        )
        assert label == "PARTIAL"

    def test_partial_confidence_due_to_high_unknown(self):
        label = get_ownership_confidence_label(
            status="complete",
            coverage=0.90,
            incomplete=False,
            unknown_share=0.40,
        )
        assert label == "PARTIAL"

    def test_not_analysed(self):
        assert get_ownership_confidence_label("discovered", 0.0) == "NOT_ANALYSED"
        assert get_ownership_confidence_label("queued", 0.0) == "NOT_ANALYSED"
        assert get_ownership_confidence_label("analysing", 0.0) == "NOT_ANALYSED"

    def test_failed(self):
        assert get_ownership_confidence_label("failed", 0.0) == "FAILED"
        assert get_ownership_confidence_label("shallow_rejected", 0.0) == "FAILED"
