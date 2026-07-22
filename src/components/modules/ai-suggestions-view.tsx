"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
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
import { canCreateMasterData } from "@/lib/rbac/ownership";
import { Pencil, Plus, Trash2 } from "lucide-react";

export function AiSuggestionsView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<AiSuggestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = canCreateMasterData(currentMember);

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
    if (!canCreate) {
      show("You do not have permission to add suggestions");
      return;
    }
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
      createAiSuggestion({
        title,
        description,
        source: "manual",
        created_by_id: currentMember.id,
        created_by_name: currentMember.name,
      });
      show("Suggestion saved");
    }
    resetForm();
    refresh();
  }

  function remove(item: AiSuggestion) {
    if (!confirm("Delete this suggestion?")) return;
    deleteAiSuggestion(item.id);
    show("Suggestion deleted");
    refresh();
  }

  return (
    <>
      <Header />
      <PageMain>
        <PageToolbar>
          {canCreate && (
            <Button type="button" onClick={startAdd}>
              <Plus className="h-4 w-4" />
              Add New Suggestion
            </Button>
          )}
        </PageToolbar>

        {(adding || editId) && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-stone-900">
                {editId ? "Edit Suggestion" : "Add New Suggestion"}
              </h3>
            </div>
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
                  placeholder="Describe the day…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={save}>
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
                <p className="mt-2 text-xs text-stone-400">
                  Created by {item.created_by_name ?? "System"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(item)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PageMain>
    </>
  );
}
