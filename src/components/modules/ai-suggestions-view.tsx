"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import {
  createAiSuggestion,
  deleteAiSuggestion,
  listAiSuggestions,
  updateAiSuggestion,
  type AiSuggestion,
} from "@/lib/itinerary-builder/ai-suggestions";
import { Pencil, Plus, Trash2 } from "lucide-react";

export function AiSuggestionsView() {
  const { show } = useToast();
  const [items, setItems] = useState<AiSuggestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function refresh() {
    setItems(listAiSuggestions());
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setAdding(false);
    setEditId(null);
    setTitle("");
    setDescription("");
  }

  function startAdd() {
    setEditId(null);
    setTitle("");
    setDescription("");
    setAdding(true);
  }

  function startEdit(item: AiSuggestion) {
    setAdding(false);
    setEditId(item.id);
    setTitle(item.title);
    setDescription(item.description);
  }

  function save() {
    if (!title.trim()) {
      show("Suggestion title is required");
      return;
    }
    if (editId) {
      updateAiSuggestion(editId, { title, description });
      show("Suggestion updated");
    } else {
      createAiSuggestion({ title, description, source: "manual" });
      show("Suggestion saved");
    }
    resetForm();
    refresh();
  }

  function remove(id: string) {
    if (!confirm("Delete this suggestion?")) return;
    deleteAiSuggestion(id);
    show("Suggestion deleted");
    refresh();
  }

  return (
    <>
      <Header
        title="AI Suggestions Manager"
        description="Day title & description templates used in Itinerary Builder autocomplete"
      />
      <PageMain>
        <PageToolbar>
          <Button type="button" onClick={startAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add New Suggestion
          </Button>
        </PageToolbar>

        {(adding || editId) && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">
              {editId ? "Edit Suggestion" : "Add New Suggestion"}
            </h3>
            <div className="space-y-3">
              <div>
                <Label>Suggestion Title</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Suggestion Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1.5"
                  rows={5}
                  placeholder="Describe what the AI should do..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={save} className="bg-blue-600 hover:bg-blue-700">
                  Save Suggestion
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-stone-900">{item.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.description}</p>
                {item.source === "learned" && (
                  <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                    Learned from builder
                  </span>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => startEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PageMain>
    </>
  );
}
