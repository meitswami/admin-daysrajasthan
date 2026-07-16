export type { BlogRecord } from "../types";
export { getBlogBySlug, listBlogs } from "../service";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "blogs" as const,
  description: "Blog content access",
} as const;
