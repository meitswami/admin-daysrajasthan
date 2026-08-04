import { Header } from "@/components/layout/header";
import { BlogsView } from "@/components/modules/blogs-view";
import {
  getBlogCategories,
  getBlogTagMap,
  getBlogTags,
  getBlogs,
} from "@/lib/data/service";

export default async function BlogsPage() {
  const [blogs, categories, tags, initialTagMap] = await Promise.all([
    getBlogs(),
    getBlogCategories(),
    getBlogTags(),
    getBlogTagMap(),
  ]);
  return (
    <>
      <Header title="Blog CMS" description="Dynamic blog with categories, tags & SEO" />
      <BlogsView
        initialBlogs={blogs}
        categories={categories}
        tags={tags}
        initialTagMap={initialTagMap}
      />
    </>
  );
}
