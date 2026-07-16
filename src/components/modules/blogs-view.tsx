"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { DataTable, PageMain, PageToolbar, type Column } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogEditorModal } from "@/components/modules/blog-editor-modal";
import type { Blog, BlogCategory, BlogTag } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function BlogsView({
  initialBlogs,
  categories,
  tags,
  initialTagMap,
}: {
  initialBlogs: Blog[];
  categories: BlogCategory[];
  tags: BlogTag[];
  initialTagMap: Record<string, string[]>;
}) {
  const { show } = useToast();
  const [items, setItems] = useState(initialBlogs);
  const [cats, setCats] = useState(categories);
  const [tagList, setTagList] = useState(tags);
  const [tagMap, setTagMap] = useState(initialTagMap);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter((b) => b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [items, search]);

  function getCategoryName(id: string | null) {
    if (!id) return "—";
    return cats.find((c) => c.id === id)?.name ?? "—";
  }

  function getTagsForBlog(blogId: string) {
    return tagList.filter((t) => (tagMap[blogId] ?? []).includes(t.id));
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    const cat: BlogCategory = {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/\s+/g, "-"),
      created_at: new Date().toISOString(),
    };
    setCats((prev) => [...prev, cat]);
    setNewCatName("");
    setCatModalOpen(false);
    show("Category added");
  }

  function addTag() {
    if (!newTagName.trim()) return;
    const tag: BlogTag = {
      id: crypto.randomUUID(),
      name: newTagName.trim(),
      slug: newTagName.trim().toLowerCase().replace(/\s+/g, "-"),
    };
    setTagList((prev) => [...prev, tag]);
    setNewTagName("");
    setTagModalOpen(false);
    show("Tag added");
  }

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(blog: Blog) {
    setEditing(blog);
    setEditorOpen(true);
  }

  function handleSave(blog: Blog, tagIds: string[]) {
    setItems((prev) => {
      const exists = prev.some((b) => b.id === blog.id);
      return exists ? prev.map((b) => (b.id === blog.id ? blog : b)) : [blog, ...prev];
    });
    setTagMap((prev) => ({ ...prev, [blog.id]: tagIds }));
    show(editing ? "Blog updated" : "Blog created");
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this blog?")) return;
    setItems((prev) => prev.filter((b) => b.id !== id));
    show("Blog removed", "info");
  }

  const columns: Column<Blog>[] = [
    {
      key: "title",
      header: "Blog",
      cell: (row) => (
        <button type="button" className="flex items-center gap-3 text-left" onClick={() => openEdit(row)}>
          {row.featured_image_url && (
            <Image src={row.featured_image_url} alt="" width={56} height={56} className="hidden h-14 w-14 rounded-lg object-cover sm:block" />
          )}
          <div>
            <p className="font-medium text-amber-900 hover:underline">{row.title}</p>
            <p className="text-xs text-stone-500">/{row.slug}</p>
          </div>
        </button>
      ),
    },
    { key: "category", header: "Category", cell: (row) => getCategoryName(row.category_id), hideOnMobile: true },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "published", header: "Published", cell: (row) => (row.publish_date ? formatDate(row.publish_date) : "—"), hideOnMobile: true },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <PageMain>
      <PageToolbar>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input placeholder="Search blogs…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatModalOpen(true)}>+ Category</Button>
          <Button variant="outline" size="sm" onClick={() => setTagModalOpen(true)}>+ Tag</Button>
          <Badge className="h-10 px-3">{cats.length} categories</Badge>
          <Badge variant="info" className="h-10 px-3">{tagList.length} tags</Badge>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Create Blog</Button>
        </div>
      </PageToolbar>

      <DataTable
        columns={columns}
        data={filtered}
        mobileCard={(row) => (
          <div className="space-y-2">
            {row.featured_image_url && (
              <Image src={row.featured_image_url} alt="" width={400} height={160} className="h-32 w-full rounded-xl object-cover" />
            )}
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => openEdit(row)} className="text-left font-semibold text-amber-900">{row.title}</button>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge>{getCategoryName(row.category_id)}</Badge>
              {getTagsForBlog(row.id).map((t) => <Badge key={t.id} variant="info">{t.name}</Badge>)}
            </div>
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {cats.map((c) => <Badge key={c.id}>{c.name}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {tagList.map((t) => <Badge key={t.id} variant="info">{t.name}</Badge>)}
          </CardContent>
        </Card>
      </div>

      <BlogEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        blog={editing}
        initialTagIds={editing ? (tagMap[editing.id] ?? []) : []}
        categories={cats}
        tags={tagList}
        onSave={handleSave}
      />

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Add category">
        <div className="space-y-4">
          <div>
            <Label htmlFor="cat_name">Category name</Label>
            <Input id="cat_name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="mt-1.5" placeholder="Travel Tips" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={addCategory}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal open={tagModalOpen} onClose={() => setTagModalOpen(false)} title="Add tag">
        <div className="space-y-4">
          <div>
            <Label htmlFor="tag_name">Tag name</Label>
            <Input id="tag_name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="mt-1.5" placeholder="Desert Safari" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTagModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={addTag}>Add</Button>
          </div>
        </div>
      </Modal>
    </PageMain>
  );
}
