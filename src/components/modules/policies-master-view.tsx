"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageMain } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import {
  canCreateMasterData,
  canDeleteMasterRecord,
  canEditMasterRecord,
  isMasterDataLocked,
} from "@/lib/rbac/ownership";
import {
  createMasterPolicy,
  deleteMasterPolicy,
  listMasterPolicies,
  updateMasterPolicy,
  type MasterPolicyLine,
  type PolicySectionKey,
} from "@/lib/master-data/policies-store";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";

const SECTIONS: { key: PolicySectionKey; title: string; tone: string }[] = [
  { key: "terms", title: "Terms & Conditions", tone: "bg-slate-50" },
  { key: "cancellation", title: "Cancellation & Refund Policy", tone: "bg-orange-50" },
  { key: "payment", title: "Payment Policy", tone: "bg-violet-50" },
];

export function PoliciesMasterView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<MasterPolicyLine[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterPolicyLine | null>(null);
  const [locked, setLocked] = useState(false);
  const [section, setSection] = useState<PolicySectionKey>("terms");
  const [title, setTitle] = useState("");

  const canCreate = canCreateMasterData(currentMember);

  function refresh() {
    setItems(listMasterPolicies());
  }

  useEffect(() => {
    refresh();
  }, []);

  function openAdd(sec: PolicySectionKey) {
    if (!canCreate) {
      show("You do not have permission to add policies");
      return;
    }
    setEditing(null);
    setLocked(false);
    setSection(sec);
    setTitle("");
    setModalOpen(true);
  }

  function openEdit(item: MasterPolicyLine) {
    setEditing(item);
    setLocked(isMasterDataLocked(currentMember, item));
    setSection(item.section);
    setTitle(item.title);
    setModalOpen(true);
  }

  function save() {
    if (locked) return;
    if (!title.trim()) {
      show("Policy text is required");
      return;
    }
    if (editing) {
      if (!canEditMasterRecord(currentMember, editing)) {
        show("You can only edit your own policies");
        return;
      }
      updateMasterPolicy(editing.id, title);
      show("Updated");
    } else {
      createMasterPolicy(section, title, currentMember);
      show("Created");
    }
    setModalOpen(false);
    refresh();
  }

  function remove(item: MasterPolicyLine) {
    if (!canDeleteMasterRecord(currentMember, item)) {
      show("You can only delete your own policies (or need Admin)");
      return;
    }
    if (!confirm("Delete this policy line?")) return;
    deleteMasterPolicy(item.id);
    show("Deleted");
    refresh();
  }

  return (
    <>
      <Header
        title="Policies"
        description="Terms, Cancellation & Payment — editable with ownership locks"
      />
      <PageMain>
        <div className="space-y-6">
          {SECTIONS.map((sec) => {
            const lines = items.filter((i) => i.section === sec.key);
            return (
              <section
                key={sec.key}
                className={`rounded-2xl border border-stone-200 p-5 ${sec.tone}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-stone-900">{sec.title}</h2>
                  {canCreate && (
                    <Button type="button" size="sm" variant="outline" onClick={() => openAdd(sec.key)}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {lines.map((item, idx) => {
                    const editable = canEditMasterRecord(currentMember, item);
                    return (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="text-stone-800">
                            <span className="mr-2 text-stone-400">{idx + 1}.</span>
                            {item.title}
                          </p>
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
                            <Button type="button" size="sm" variant="ghost" onClick={() => remove(item)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? (locked ? "View policy" : "Edit policy") : "Add policy"}
      >
        <div className="space-y-4">
          {locked && (
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" /> View only
            </Badge>
          )}
          <div>
            <Label>Policy text *</Label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} />
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
