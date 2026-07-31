"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageMain, PageToolbar, TableRowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import { canCreateMasterData, createdByAttribution } from "@/lib/rbac/ownership";
import {
  createMasterCategory,
  deleteMasterCategory,
  listMasterCategories,
  updateMasterCategory,
  type MasterCategory,
} from "@/lib/master-data/categories-store";
import { Plus } from "lucide-react";

export function MasterDataCategoriesView() {
  const { show } = useToast();
  const { currentMember, dataMode } = useSystem();
  const [items, setItems] = useState<MasterCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterCategory | null>(null);
  const [label, setLabel] = useState("");
  const [roomCategory, setRoomCategory] = useState("");
  const [key, setKey] = useState("");

  const canCreate = canCreateMasterData(currentMember);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listMasterCategories());
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [dataMode]);

  function openAdd() {
    if (!canCreate) {
      show("You do not have permission to add categories");
      return;
    }
    setEditing(null);
    setLabel("");
    setRoomCategory("");
    setKey("");
    setModalOpen(true);
  }

  function openEdit(item: MasterCategory) {
    setEditing(item);
    setLabel(item.label);
    setRoomCategory(item.room_category);
    setKey(item.key);
    setModalOpen(true);
  }

  async function save() {
    if (!label.trim() || !key.trim()) {
      show("Label and key are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateMasterCategory(
          editing.id,
          { label, room_category: roomCategory, key },
          currentMember
        );
        show("Updated");
      } else {
        await createMasterCategory(
          { label, room_category: roomCategory, key },
          currentMember
        );
        show("Created");
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: MasterCategory) {
    if (!confirm(`Delete “${item.label}”?`)) return;
    try {
      await deleteMasterCategory(item.id, currentMember);
      show("Deleted");
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
          <Badge className="h-10 px-3">{items.length} categories</Badge>
          {canCreate && (
            <Button type="button" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          )}
        </PageToolbar>
        {loading ? (
          <p className="text-sm text-stone-500">Loading categories…</p>
        ) : (
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
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-900">{item.label}</td>
                    <td className="px-4 py-3 text-stone-700">{item.room_category}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {createdByAttribution(currentMember, item) ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <TableRowActions>
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
                        </TableRowActions>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit category" : "Add category"}
      >
        <div className="space-y-4">
          <div>
            <Label>Label *</Label>
            <Input className="mt-1.5" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <Label>Room category</Label>
            <Input
              className="mt-1.5"
              value={roomCategory}
              onChange={(e) => setRoomCategory(e.target.value)}
            />
          </div>
          <div>
            <Label>Key *</Label>
            <Input className="mt-1.5" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
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
