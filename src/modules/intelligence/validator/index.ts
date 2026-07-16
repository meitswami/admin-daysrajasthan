import { intelligenceBlockSchema } from "../schemas";
import type { GroundingIssue, IntelligenceBlock, RetrievedFacts } from "../types";

/**
 * Validate structured blocks and soft-ground mentions against Search hits.
 */
export function validateIntelligenceBlocks(
  blocks: IntelligenceBlock[],
  facts: RetrievedFacts
): { blocks: IntelligenceBlock[]; issues: GroundingIssue[] } {
  const issues: GroundingIssue[] = [];
  const knownIds = new Set(facts.hits.map((h) => h.id));
  const valid: IntelligenceBlock[] = [];

  for (const block of blocks) {
    const parsed = intelligenceBlockSchema.safeParse(block);
    if (!parsed.success) {
      issues.push({
        code: "INVALID_BLOCK",
        message: "Block failed schema validation",
      });
      continue;
    }

    for (const ref of block.refs) {
      if (facts.hits.length && !knownIds.has(ref.id)) {
        issues.push({
          code: "UNGROUNDED_REF",
          message: `Reference ${ref.id} not in retrieved Search results`,
          field: ref.id,
        });
      }
    }

    if (block.body && /<\/?[a-z][\s\S]*>/i.test(block.body)) {
      issues.push({
        code: "HTML_FORBIDDEN",
        message: "Block body must not contain HTML",
      });
      valid.push({ ...block, body: block.body.replace(/<[^>]+>/g, "") });
      continue;
    }

    valid.push(block);
  }

  return { blocks: valid, issues };
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "validator" as const,
  description: "JSON schema + grounding checks against Search facts",
} as const;
