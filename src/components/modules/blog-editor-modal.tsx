"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { slugify } from "@/lib/utils/slugify";
import type { Blog, BlogCategory, BlogTag } from "@/types/database";
import { cn } from "@/lib/utils";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import { generateBlogSeo } from "@/lib/data/search";
import { Sparkles } from "lucide-react";

type BlogForm = {
  title: string;
  slug: string;
  featured_image_url: string;
  content_html: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  category_id: string;
  status: Blog["status"];
  tagIds: string[];
};

function toForm(blog: Blog | null, tagIds: string[]): BlogForm {
  if (!blog) {
    return {
      title: "",
      slug: "",
      featured_image_url: "",
      content_html: "<p></p>",
      meta_title: "",
      meta_description: "",
      keywords: "",
      category_id: "",
      status: "draft",
      tagIds: [],
    };
  }
  return {
    title: blog.title,
    slug: blog.slug,
    featured_image_url: blog.featured_image_url ?? "",
    content_html: blog.content_html ?? "",
    meta_title: blog.meta_title ?? "",
    meta_description: blog.meta_description ?? "",
    keywords: (blog.keywords ?? []).join(", "),
    category_id: blog.category_id ?? "",
    status: blog.status,
    tagIds,
  };
}

export function BlogEditorModal({
  open,
  onClose,
  blog,
  initialTagIds,
  categories,
  tags,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  blog: Blog | null;
  initialTagIds: string[];
  categories: BlogCategory[];
  tags: BlogTag[];
  onSave: (blog: Blog, tagIds: string[]) => void;
}) {
  const [tab, setTab] = useState("content");
  const [form, setForm] = useState<BlogForm>(() => toForm(blog, initialTagIds));

  useEffect(() => {
    if (open) {
      setForm(toForm(blog, initialTagIds));
      setTab("content");
    }
  }, [open, blog, initialTagIds]);

  function patch(p: Partial<BlogForm>) {
    setForm((prev) => {
      const next = { ...prev, ...p };
      if (p.title !== undefined && !blog) {
        next.slug = slugify(p.title);
        next.meta_title = p.title.slice(0, 60);
      }
      return next;
    });
  }

  function toggleTag(id: string) {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id) ? prev.tagIds.filter((t) => t !== id) : [...prev.tagIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const saved: Blog = {
      id: blog?.id ?? crypto.randomUUID(),
      title: form.title,
      slug: form.slug || slugify(form.title),
      featured_image_url: form.featured_image_url || null,
      content_html: form.content_html,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      keywords: form.keywords ? form.keywords.split(",").map((k) => k.trim()).filter(Boolean) : null,
      category_id: form.category_id || null,
      status: form.status,
      publish_date: form.status === "published" ? blog?.publish_date ?? now : null,
      created_at: blog?.created_at ?? now,
      updated_at: now,
    };
    onSave(saved, form.tagIds);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={blog ? "Edit blog" : "Create blog"}
      description="Content, SEO & preview — saved locally until the live database connects"
      className="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Tabs
          tabs={[
            { id: "content", label: "Content" },
            { id: "seo", label: "SEO" },
            { id: "preview", label: "Preview" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "content" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={form.slug} onChange={(e) => patch({ slug: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="image">Featured image URL</Label>
              <Input id="image" value={form.featured_image_url} onChange={(e) => patch({ featured_image_url: e.target.value })} className="mt-1.5" placeholder="https://images.unsplash.com/..." />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.category_id} onChange={(e) => patch({ category_id: e.target.value })} className="mt-1.5">
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                      form.tagIds.includes(t.id)
                        ? "bg-amber-100 text-amber-900 ring-amber-300"
                        : "bg-stone-100 text-stone-600 ring-stone-200 hover:bg-stone-200"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="content">Body (HTML)</Label>
              <RichTextToolbar value={form.content_html} onChange={(v) => patch({ content_html: v })} />
              <Textarea
                id="content"
                value={form.content_html}
                onChange={(e) => patch({ content_html: e.target.value })}
                className="min-h-[160px] rounded-t-none font-mono text-xs"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(e) => patch({ status: e.target.value as Blog["status"] })} className="mt-1.5">
                <option value="draft">draft</option>
                <option value="published">published</option>
              </Select>
            </div>
          </div>
        )}

        {tab === "seo" && (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!form.title) return;
                const seo = generateBlogSeo(form.title);
                patch(seo);
              }}
            >
              <Sparkles className="h-4 w-4" /> AI Generate SEO
            </Button>
            <div>
              <Label htmlFor="meta_title">Meta title</Label>
              <Input id="meta_title" value={form.meta_title} onChange={(e) => patch({ meta_title: e.target.value })} className="mt-1.5" />
              <p className="mt-1 text-xs text-stone-500">{form.meta_title.length}/60 chars</p>
            </div>
            <div>
              <Label htmlFor="meta_description">Meta description</Label>
              <Textarea id="meta_description" value={form.meta_description} onChange={(e) => patch({ meta_description: e.target.value })} className="mt-1.5" />
              <p className="mt-1 text-xs text-stone-500">{form.meta_description.length}/160 chars</p>
            </div>
            <div>
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input id="keywords" value={form.keywords} onChange={(e) => patch({ keywords: e.target.value })} className="mt-1.5" />
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            {form.featured_image_url && (
              <Image src={form.featured_image_url} alt="" width={600} height={240} className="mb-4 h-40 w-full rounded-lg object-cover" />
            )}
            <h3 className="text-xl font-bold text-stone-900">{form.title || "Untitled"}</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {form.tagIds.map((id) => {
                const t = tags.find((x) => x.id === id);
                return t ? <Badge key={id} variant="info">{t.name}</Badge> : null;
              })}
            </div>
            <div
              className="prose prose-sm mt-4 max-w-none text-stone-700"
              dangerouslySetInnerHTML={{ __html: form.content_html }}
            />
          </div>
        )}

        <div className="flex gap-2 border-t border-stone-100 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">{blog ? "Save changes" : "Create blog"}</Button>
        </div>
      </form>
    </Modal>
  );
}
