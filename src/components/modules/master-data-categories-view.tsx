"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
  createMasterCategory,
  deleteMasterCategory,
  listMasterCategories,
  updateMasterCategory,
  type MasterCategory,
} from "@/lib/master-data/categories-store";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";

export function MasterDataCategoriesView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<MasterCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterCategory | null>(null);
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState("");
  const [roomCategory, setRoomCategory] = useState("");
  const [key, setKey] = useState("");

  const canCreate = canCreateMasterData(currentMember);

  function refresh() {
    setItems(listMasterCategories());
  }

  useEffect(() => {
    refresh();
  }, []);

  function openAdd() {
    if (!canCreate) {
      show("You do not have permission to add categories");
      return;
    }
    setEditing(null);
    setLocked(false);
    setLabel("");
    setRoomCategory("");
    setKey("");
    setModalOpen(true);
  }

  function openEdit(item: MasterCategory) {
    setEditing(item);
    setLocked(isMasterDataLocked(currentMember, item));
    setLabel(item.label);
    setRoomCategory(item.room_category);
    setKey(item.key);
    setModalOpen(true);
  }

  function save() {
    if (locked) return;
    if (!label.trim() || !key.trim()) {
      show("Label and key are required");
      return;
    }
    if (editing) {
      if (!canEditMasterRecord(currentMember, editing)) {
        show("You can only edit your own categories");
        return;
      }
      updateMasterCategory(editing.id, { label, room_category: roomCategory, key });
      show("Updated");
    } else {
      createMasterCategory({ label, room_category: roomCategory, key }, currentMember);
      show("Created");
    }
    setModalOpen(false);
    refresh();
  }

  function remove(item: MasterCategory) {
    if (!canDeleteMasterRecord(currentMember, item)) {
      show("You can only delete your own categories (or need Admin)");
      return;
    }
    if (!confirm(`Delete “${item.label}”?`)) return;
    deleteMasterCategory(item.id);
    show("Deleted");
    refresh();
  }

  return (
    <>
      <Header title="Categories" description="Hotel category tiers used in itinerary pricing" />
      <PageMain>
        <PageToolbar>
          <Badge className="h-10 px-3">{items.length} categories</Badge>
          {canCreate && (
            <Button type="button" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          )}
        </PageToolbar>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Room category</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const editable = canEditMasterRecord(currentMember, item);
                return (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-900">{item.label}</td>
                    <td className="px-4 py-3 text-stone-700">{item.room_category}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {item.created_by_name ?? "Unknown"}
                      {!editable && " · view only"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          {editable ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                        {canDeleteMasterRecord(currentMember, item) && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => remove(item)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? (locked ? "View category" : "Edit category") : "Add category"}
      >
        <div className="space-y-4">
          <div>
            <Label>Label *</Label>
            <Input className="mt-1.5" value={label} onChange={(e) => setLabel(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Room category</Label>
            <Input
              className="mt-1.5"
              value={roomCategory}
              onChange={(e) => setRoomCategory(e.target.value)}
              disabled={locked}
            />
          </div>
          <div>
            <Label>Key *</Label>
            <Input className="mt-1.5" value={key} onChange={(e) => setKey(e.target.value)} disabled={locked} />
          </div>
          {!locked && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={save}>
                Save
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
