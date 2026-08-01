"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import {
  createAiSuggestion,
  deleteAiSuggestion,
  listAiSuggestions,
  updateAiSuggestion,
  type AiSuggestion,
} from "@/lib/itinerary-builder/ai-suggestions";
import { canCreateMasterData, createdByAttribution } from "@/lib/rbac/ownership";
import { Plus, Search } from "lucide-react";

export function AiSuggestionsView() {
  const { show } = useToast();
  const { currentMember, dataMode } = useSystem();
  const [items, setItems] = useState<AiSuggestion[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = canCreateMasterData(currentMember);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.created_by_name ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listAiSuggestions());
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [dataMode]);

  function resetForm() {
    setModalOpen(false);
    setEditId(null);
    setTitle("");
    setDescription("");
  }

  function startAdd() {
    if (!canCreate) {
      show("You do not have permission to add suggestions");
      return;
    }
    setEditId(null);
    setTitle("");
    setDescription("");
    setModalOpen(true);
  }

  function startEdit(item: AiSuggestion) {
    setEditId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setModalOpen(true);
  }

  async function save() {
    if (!title.trim()) {
      show("Suggestion title is required");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateAiSuggestion(editId, { title, description });
        show("Suggestion updated");
      } else {
        await createAiSuggestion({
          title,
          description,
          source: "manual",
          created_by_id: currentMember.id,
          created_by_name: currentMember.name,
        });
        show("Suggestion saved");
      }
      resetForm();
      await refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AiSuggestion) {
    if (!confirm("Delete this suggestion?")) return;
    try {
      await deleteAiSuggestion(item.id);
      show("Suggestion deleted");
      await refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <Header />
      <PageMain>
        <PageToolbar>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search title or description…"
              className="h-10 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-stone-500">
              {search.trim()
                ? `Showing ${filtered.length} of ${items.length}`
                : `Showing ${items.length}`}
            </p>
            {canCreate && (
              <Button type="button" onClick={startAdd}>
                <Plus className="h-4 w-4" />
                Add New Suggestion
              </Button>
            )}
          </div>
        </PageToolbar>

        {loading ? (
          <p className="text-sm text-stone-500">Loading suggestions…</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, index) => {
              const createdBy = createdByAttribution(currentMember, item);
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="mt-0.5 w-8 shrink-0 text-sm font-medium tabular-nums text-stone-400">
                      {index + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-stone-900">{item.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.description}</p>
                      {createdBy ? (
                        <p className="mt-2 text-xs text-stone-400">{createdBy}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:pl-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => void remove(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <p className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
                {items.length
                  ? "No suggestions match your search."
                  : "No suggestions yet. Add day titles and descriptions for the itinerary builder."}
              </p>
            )}
          </div>
        )}
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={resetForm}
        title={editId ? "Edit Suggestion" : "Add New Suggestion"}
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              className="mt-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Arrival At Jaipur"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1.5"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Day description shown in itinerary builder suggestions"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
