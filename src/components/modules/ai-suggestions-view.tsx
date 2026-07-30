"use client";

import { useEffect, useState } from "react";
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
import { Plus } from "lucide-react";

export function AiSuggestionsView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<AiSuggestion[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
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

        <div className="space-y-3">
          {items.map((item) => {
            const createdBy = createdByAttribution(currentMember, item);
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-stone-900">{item.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.description}</p>
                  {createdBy ? (
                    <p className="mt-2 text-xs text-stone-400">{createdBy}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => startEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => remove(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={resetForm}
        title={editId ? "Edit Suggestion" : "Add New Suggestion"}
      >
        <div className="space-y-4">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save Suggestion
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
