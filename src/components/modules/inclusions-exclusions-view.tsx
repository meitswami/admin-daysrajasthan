"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import { canCreateMasterData } from "@/lib/rbac/ownership";
import {
  createInclusionExclusion,
  deleteInclusionExclusion,
  listInclusionExclusions,
  updateInclusionExclusion,
  type InclusionExclusionItem,
  type InclusionExclusionKind,
} from "@/lib/master-data/inclusions-store";
import { Plus } from "lucide-react";

export function InclusionsExclusionsView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<InclusionExclusionItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InclusionExclusionItem | null>(null);
  const [kind, setKind] = useState<InclusionExclusionKind>("inclusion");
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const canCreate = canCreateMasterData(currentMember);

  const refresh = useCallback(async () => {
    setItems(await listInclusionExclusions());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openAdd(defaultKind: InclusionExclusionKind) {
    if (!canCreate) {
      show("You do not have permission to add master data");
      return;
    }
    setEditing(null);
    setKind(defaultKind);
    setText("");
    setDescription("");
    setImageUrl(null);
    setModalOpen(true);
  }

  function openEdit(item: InclusionExclusionItem) {
    setEditing(item);
    setKind(item.kind);
    setText(item.text);
    setDescription(item.description ?? "");
    setImageUrl(item.kind === "inclusion" ? item.image_url : null);
    setModalOpen(true);
  }

  async function save() {
    if (!text.trim()) {
      show("Title is required");
      return;
    }
    const image = kind === "inclusion" ? imageUrl : null;
    if (editing) {
      await updateInclusionExclusion(
        editing.id,
        { text, description, image_url: image, kind },
        currentMember
      );
      show("Updated");
    } else {
      await createInclusionExclusion(kind, text, currentMember, image, description);
      show("Created");
    }
    setModalOpen(false);
    void refresh();
  }

  async function remove(item: InclusionExclusionItem) {
    if (!confirm("Delete this line?")) return;
    await deleteInclusionExclusion(item.id, currentMember);
    show("Deleted");
    void refresh();
  }

  const inclusions = items.filter((i) => i.kind === "inclusion");
  const exclusions = items.filter((i) => i.kind === "exclusion");

  function renderList(list: InclusionExclusionItem[], title: string, addKind: InclusionExclusionKind) {
    const showImages = addKind === "inclusion";
    return (
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h2 className="font-semibold text-stone-900">{title}</h2>
          {canCreate && (
            <Button type="button" size="sm" variant="outline" onClick={() => openAdd(addKind)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}
        </div>
        <ul className="divide-y divide-stone-100">
          {list.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {showImages && item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-14 w-20 shrink-0 rounded-md border border-stone-200 object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800">{item.text}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-stone-500">{item.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-stone-400">
                    Created by {item.created_by_name ?? "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => openEdit(item)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void remove(item)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {!list.length && (
            <li className="px-4 py-6 text-center text-sm text-stone-500">No items yet</li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <>
      <Header />
      <PageMain>
        <PageToolbar>
          <p className="text-sm text-stone-500">
            Shared library used when building itinerary packages. Inclusions may include an optional
            image.
          </p>
        </PageToolbar>
        <div className="grid gap-6 lg:grid-cols-2">
          {renderList(inclusions, "Inclusions", "inclusion")}
          {renderList(exclusions, "Exclusions", "exclusion")}
        </div>
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit line" : "Add line"}
        description={
          editing ? `Created by ${editing.created_by_name ?? "Unknown"}` : undefined
        }
      >
        <div className="space-y-4">
          {!editing && (
            <div>
              <Label>Type</Label>
              <Select
                className="mt-1.5"
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as InclusionExclusionKind;
                  setKind(next);
                  if (next === "exclusion") setImageUrl(null);
                }}
              >
                <option value="inclusion">Inclusion</option>
                <option value="exclusion">Exclusion</option>
              </Select>
            </div>
          )}
          <div>
            <Label>Title *</Label>
            <Input
              className="mt-1.5"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1.5"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
            />
          </div>
          {kind === "inclusion" && (
            <FileUploadField
              label="Image (optional)"
              value={imageUrl}
              onChange={setImageUrl}
              folder="inclusions"
              previewWide
            />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
