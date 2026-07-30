"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageMain } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import { canCreateMasterData, createdByAttribution } from "@/lib/rbac/ownership";
import {
  createMasterPolicy,
  deleteMasterPolicy,
  listMasterPolicies,
  updateMasterPolicy,
  type MasterPolicyLine,
  type PolicySectionKey,
} from "@/lib/master-data/policies-store";
import { Plus } from "lucide-react";

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
    setSection(sec);
    setTitle("");
    setModalOpen(true);
  }

  function openEdit(item: MasterPolicyLine) {
    setEditing(item);
    setSection(item.section);
    setTitle(item.title);
    setModalOpen(true);
  }

  function save() {
    if (!title.trim()) {
      show("Policy text is required");
      return;
    }
    if (editing) {
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
    if (!confirm("Delete this policy line?")) return;
    deleteMasterPolicy(item.id);
    show("Deleted");
    refresh();
  }

  return (
    <>
      <Header />
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
                    const createdBy = createdByAttribution(currentMember, item);
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
                        {createdBy ? (
                          <p className="mt-1 text-xs text-stone-400">{createdBy}</p>
                        ) : null}
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
                          onClick={() => remove(item)}
                        >
                          Delete
                        </Button>
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
        title={editing ? "Edit policy" : "Add policy"}
      >
        <div className="space-y-4">
          <div>
            <Label>Policy text *</Label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
