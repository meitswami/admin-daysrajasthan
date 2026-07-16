/**
 * Deterministic ranking engine — AI ranking weight reserved (default 0).
 */

import { DEFAULT_RANKING_WEIGHTS } from "../constants";
import type { RankableCandidate, RankingWeights } from "../types";

function recencyScore(updatedAt: string | null | undefined): number {
  if (!updatedAt) return 0.3;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.75;
  if (ageDays <= 90) return 0.5;
  return 0.25;
}

/**
 * Score a candidate using configurable weights (0–1 normalized blend).
 */
export function scoreCandidate(
  candidate: RankableCandidate,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): number {
  const popularity = Math.min(1, (candidate.popularity ?? 0) / 100);
  const recency = recencyScore(candidate.updatedAt);
  const business = Math.min(1, candidate.businessWeight ?? 0.5);
  const featured = candidate.featured ? 1 : 0;
  const season = Math.min(1, candidate.seasonBoost ?? 0.4);
  const quality = Math.min(1, candidate.quality ?? 0.5);
  const ai = 0; // future AI ranking — never invent ranking via LLM in Task 09

  const score =
    popularity * weights.popularity +
    recency * weights.recency +
    business * weights.businessWeight +
    featured * weights.featured +
    season * weights.season +
    quality * weights.packageQuality +
    ai * weights.aiRanking;

  return Math.round(score * 1000) / 1000;
}

/**
 * Sort candidates by score descending (stable by title).
 */
export function rankCandidates(
  candidates: RankableCandidate[],
  weights?: RankingWeights
): Array<RankableCandidate & { score: number }> {
  return candidates
    .map((c) => ({ ...c, score: scoreCandidate(c, weights) }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
