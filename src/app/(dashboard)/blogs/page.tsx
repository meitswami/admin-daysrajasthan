import { Header } from "@/components/layout/header";
import { BlogsView } from "@/components/modules/blogs-view";
import { blogs, blogCategories, blogTags, blogTagMap } from "@/lib/data";

export default function BlogsPage() {
  return (
    <>
      <Header title="Blog CMS" description="Dynamic blog with categories, tags & SEO" />
      <BlogsView initialBlogs={blogs} categories={blogCategories} tags={blogTags} initialTagMap={blogTagMap} />
    </>
  );
}
