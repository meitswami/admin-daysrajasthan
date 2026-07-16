export { autocomplete, getSuggestions } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "suggestions" as const,
  description: "Autocomplete, trending, related suggestions",
} as const;
