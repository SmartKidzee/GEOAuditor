"""Rank-position scoring shared by the probe engine and the scoring module."""

from typing import Optional

# How prominent a brand is when an AI lists it: rank 1 is worth the most.
RANK_SCORES = {1: 1.0, 2: 0.85, 3: 0.7, 4: 0.55, 5: 0.4}
DEFAULT_RANK_SCORE = 0.3  # rank 6+, or mentioned in free text with no rank available


def rank_score(rank: Optional[int]) -> float:
    if rank is None:
        return DEFAULT_RANK_SCORE
    return RANK_SCORES.get(rank, DEFAULT_RANK_SCORE)
