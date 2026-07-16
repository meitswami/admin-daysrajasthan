/**
 * Parse model output into a draft structure before formatting.
 * Does not invent catalog facts — only extracts narrative text.
 */

export type ParsedModelOutput = {
  narrative: string;
  mentionedIds: string[];
};

export function parseProviderText(rawText: string): ParsedModelOutput {
  const narrative = rawText.trim();
  const mentionedIds = Array.from(
    narrative.matchAll(/\bid[=\s:]+([a-zA-Z0-9_-]+)/gi),
    (m) => m[1]
  );
  return { narrative, mentionedIds };
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "parser" as const,
  description: "Parses provider text into draft structured pieces",
} as const;
