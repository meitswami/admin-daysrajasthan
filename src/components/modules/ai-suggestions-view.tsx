"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  canCreateMasterData,
  canDeleteMasterRecord,
  canEditMasterRecord,
  isMasterDataLocked,
} from "@/lib/rbac/ownership";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";

export function AiSuggestionsView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<AiSuggestion[]>([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locked, setLocked] = useState(false);

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
    setLocked(false);
  }

  function startAdd() {
    if (!canCreate) {
      show("You do not have permission to add suggestions");
      return;
    }
    setEditId(null);
    setLocked(false);
    setTitle("");
    setDescription("");
    setAdding(true);
  }

  function startEdit(item: AiSuggestion) {
    setAdding(false);
    setEditId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setLocked(isMasterDataLocked(currentMember, item));
  }

  function save() {
    if (locked) return;
    if (!title.trim()) {
      show("Suggestion title is required");
      return;
    }
    if (editId) {
      const existing = items.find((i) => i.id === editId);
      if (existing && !canEditMasterRecord(currentMember, existing)) {
        show("You can only edit your own suggestions");
        return;
      }
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
    if (!canDeleteMasterRecord(currentMember, item)) {
      show("You can only delete your own suggestions (or need Admin)");
      return;
    }
    if (!confirm("Delete this suggestion?")) return;
    deleteAiSuggestion(item.id);
    show("Suggestion deleted");
    refresh();
  }

  return (
    <>
      <Header
        title="AI Suggestions Manager"
        description="Day title & description templates. Sales Admins edit own only; Admin can edit any."
      />
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
                {editId ? (locked ? "View Suggestion" : "Edit Suggestion") : "Add New Suggestion"}
              </h3>
              {locked && (
                <Badge variant="warning" className="gap-1">
                  <Lock className="h-3 w-3" /> View only
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <Label>Suggestion Title</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Suggestion Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={locked}
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
                  disabled={locked}
                />
              </div>
              <div className="flex gap-2">
                {!locked && (
                  <Button type="button" onClick={save}>
                    Save Suggestion
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={resetForm}>
                  {locked ? "Close" : "Cancel"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => {
            const editable = canEditMasterRecord(currentMember, item);
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-stone-900">{item.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.description}</p>
                  <p className="mt-2 text-xs text-stone-400">
                    Created by {item.created_by_name ?? "System"}
                    {!editable && " · view only"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
                    {editable ? <Pencil className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {editable ? "Edit" : "View"}
                  </Button>
                  {canDeleteMasterRecord(currentMember, item) && (
                    <Button type="button" size="sm" variant="destructive" onClick={() => remove(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageMain>
    </>
  );
}
