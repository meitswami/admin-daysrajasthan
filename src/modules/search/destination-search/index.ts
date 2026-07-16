export { searchDestinations } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "destination-search" as const,
  description: "Destination discovery via Knowledge Engine",
} as const;
