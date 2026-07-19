"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import {
  canCreateMasterData,
  canDeleteMasterRecord,
  canEditMasterRecord,
  isMasterDataLocked,
} from "@/lib/rbac/ownership";
import {
  createInclusionExclusion,
  deleteInclusionExclusion,
  listInclusionExclusions,
  updateInclusionExclusion,
  type InclusionExclusionItem,
  type InclusionExclusionKind,
} from "@/lib/master-data/inclusions-store";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";

export function InclusionsExclusionsView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<InclusionExclusionItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InclusionExclusionItem | null>(null);
  const [locked, setLocked] = useState(false);
  const [kind, setKind] = useState<InclusionExclusionKind>("inclusion");
  const [text, setText] = useState("");

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
    setLocked(false);
    setKind(defaultKind);
    setText("");
    setModalOpen(true);
  }

  function openEdit(item: InclusionExclusionItem) {
    setEditing(item);
    setLocked(isMasterDataLocked(currentMember, item));
    setKind(item.kind);
    setText(item.text);
    setModalOpen(true);
  }

  async function save() {
    if (locked) return;
    if (!text.trim()) {
      show("Text is required");
      return;
    }
    if (editing) {
      if (!canEditMasterRecord(currentMember, editing)) {
        show("You can only edit your own records");
        return;
      }
      await updateInclusionExclusion(editing.id, text);
      show("Updated");
    } else {
      await createInclusionExclusion(kind, text, currentMember);
      show("Created");
    }
    setModalOpen(false);
    void refresh();
  }

  async function remove(item: InclusionExclusionItem) {
    if (!canDeleteMasterRecord(currentMember, item)) {
      show("You can only delete your own records (or need Admin)");
      return;
    }
    if (!confirm("Delete this line?")) return;
    await deleteInclusionExclusion(item.id);
    show("Deleted");
    void refresh();
  }

  const inclusions = items.filter((i) => i.kind === "inclusion");
  const exclusions = items.filter((i) => i.kind === "exclusion");

  function renderList(list: InclusionExclusionItem[], title: string, addKind: InclusionExclusionKind) {
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
          {list.map((item) => {
            const editable = canEditMasterRecord(currentMember, item);
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-stone-800">{item.text}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    Created by {item.created_by_name ?? "Unknown"}
                    {!editable && " · view only"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(item)}>
                    {editable ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  {canDeleteMasterRecord(currentMember, item) && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void remove(item)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
          {!list.length && (
            <li className="px-4 py-6 text-center text-sm text-stone-500">No items yet</li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Inclusions & Exclusions"
        description="Reusable lines for packages. Visible to Sales Admin & Admin; edit only own unless Admin."
      />
      <PageMain>
        <PageToolbar>
          <p className="text-sm text-stone-500">
            Shared library used when building itinerary packages.
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
        title={editing ? (locked ? "View line" : "Edit line") : "Add line"}
        description={
          editing
            ? `Created by ${editing.created_by_name ?? "Unknown"}${locked ? " — locked" : ""}`
            : undefined
        }
      >
        <div className="space-y-4">
          {locked && (
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" /> View only
            </Badge>
          )}
          {!editing && (
            <div>
              <Label>Type</Label>
              <Select
                className="mt-1.5"
                value={kind}
                onChange={(e) => setKind(e.target.value as InclusionExclusionKind)}
              >
                <option value="inclusion">Inclusion</option>
                <option value="exclusion">Exclusion</option>
              </Select>
            </div>
          )}
          <div>
            <Label>Text *</Label>
            <Input
              className="mt-1.5"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={locked}
            />
          </div>
          {!locked && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()}>
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
