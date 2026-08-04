"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageMain } from "@/components/ui/data-table";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import { canCreateMasterData } from "@/lib/rbac/ownership";
import {
  emptyAchievement,
  emptyAddress,
  emptyBankAccount,
  emptyPaymentMethod,
  emptyStaffContact,
  getCompanyStructure,
  saveCompanyStructure,
} from "@/lib/master-data/structure-store";
import type {
  BankAccount,
  CompanyAchievement,
  CompanyAddress,
  CompanyStructure,
  PaymentMethod,
  StaffContact,
} from "@/types/company-structure";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type EditKind =
  | "logo"
  | "staff"
  | "address"
  | "social"
  | "support"
  | "bank"
  | "payment"
  | "achievement";

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-stone-700">
      <span className="font-semibold text-stone-900">{label}:</span>{" "}
      <span className="break-all">{value || "—"}</span>
    </p>
  );
}

function IconBtn({
  onClick,
  tone,
  children,
  label,
}: {
  onClick: () => void;
  tone: "edit" | "delete";
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        tone === "edit"
          ? "inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
          : "inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
      }
    >
      {children}
    </button>
  );
}

export function StructureMasterView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const canEdit = canCreateMasterData(currentMember);

  const [data, setData] = useState<CompanyStructure | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editKind, setEditKind] = useState<EditKind | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draftStaff, setDraftStaff] = useState<StaffContact>(emptyStaffContact());
  const [draftAddress, setDraftAddress] = useState<CompanyAddress>(emptyAddress());
  const [draftBank, setDraftBank] = useState<BankAccount>(emptyBankAccount());
  const [draftPayment, setDraftPayment] = useState<PaymentMethod>(emptyPaymentMethod());
  const [draftAchievement, setDraftAchievement] = useState<CompanyAchievement>(emptyAchievement());
  const [draftLogo, setDraftLogo] = useState<string | null>(null);
  const [draftSupport, setDraftSupport] = useState("");
  const [draftSocial, setDraftSocial] = useState({
    facebook: "",
    instagram: "",
    youtube: "",
    website: "",
  });

  async function refresh() {
    setLoading(true);
    try {
      const next = await getCompanyStructure();
      setData(next);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to load structure");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openLogo() {
    if (!data) return;
    setDraftLogo(data.logo_url);
    setEditKind("logo");
  }

  function openStaff(index: number | null) {
    if (!data) return;
    if (index === null) {
      setDraftStaff(emptyStaffContact());
      setEditIndex(null);
    } else {
      setDraftStaff({ ...data.staff_contacts[index] });
      setEditIndex(index);
    }
    setEditKind("staff");
  }

  function openAddress(index: number | null) {
    if (!data) return;
    if (index === null) {
      setDraftAddress(emptyAddress());
      setEditIndex(null);
    } else {
      setDraftAddress({ ...data.addresses[index] });
      setEditIndex(index);
    }
    setEditKind("address");
  }

  function openBank(index: number | null) {
    if (!data) return;
    if (index === null) {
      setDraftBank(emptyBankAccount());
      setEditIndex(null);
    } else {
      setDraftBank({ ...data.bank_accounts[index] });
      setEditIndex(index);
    }
    setEditKind("bank");
  }

  function openPayment(index: number | null) {
    if (!data) return;
    if (index === null) {
      setDraftPayment(emptyPaymentMethod());
      setEditIndex(null);
    } else {
      setDraftPayment({ ...data.payment_methods[index] });
      setEditIndex(index);
    }
    setEditKind("payment");
  }

  function openSocial() {
    if (!data) return;
    setDraftSocial({ ...data.social_links });
    setEditKind("social");
  }

  function openSupport() {
    if (!data) return;
    setDraftSupport(data.support_number);
    setEditKind("support");
  }

  function openAchievement(index: number | null) {
    if (!data) return;
    if (index === null) {
      setDraftAchievement(emptyAchievement());
      setEditIndex(null);
    } else {
      setDraftAchievement({
        ...data.achievements[index],
        image_urls: [...(data.achievements[index].image_urls ?? [])],
      });
      setEditIndex(index);
    }
    setEditKind("achievement");
  }

  function applyModalSave() {
    if (!data || !editKind) return;

    let next: CompanyStructure | null = null;

    if (editKind === "logo") {
      next = { ...data, logo_url: draftLogo };
    } else if (editKind === "support") {
      next = { ...data, support_number: draftSupport.trim() };
    } else if (editKind === "social") {
      next = { ...data, social_links: { ...draftSocial } };
    } else if (editKind === "staff") {
      if (!draftStaff.name.trim()) {
        show("Name is required");
        return;
      }
      const list = [...data.staff_contacts];
      if (editIndex === null) list.push({ ...draftStaff });
      else list[editIndex] = { ...draftStaff };
      next = { ...data, staff_contacts: list };
    } else if (editKind === "address") {
      if (!draftAddress.street.trim() && !draftAddress.city.trim()) {
        show("Street or city is required");
        return;
      }
      const list = [...data.addresses];
      if (editIndex === null) list.push({ ...draftAddress });
      else list[editIndex] = { ...draftAddress };
      next = { ...data, addresses: list };
    } else if (editKind === "bank") {
      if (!draftBank.bank_name.trim() || !draftBank.account_number.trim()) {
        show("Bank name and account number are required");
        return;
      }
      const list = [...data.bank_accounts];
      if (editIndex === null) list.push({ ...draftBank });
      else list[editIndex] = { ...draftBank };
      next = { ...data, bank_accounts: list };
    } else if (editKind === "payment") {
      if (!draftPayment.upi_id.trim()) {
        show("UPI ID / Value is required");
        return;
      }
      const list = [...data.payment_methods];
      if (editIndex === null) list.push({ ...draftPayment });
      else list[editIndex] = { ...draftPayment };
      next = { ...data, payment_methods: list };
    } else if (editKind === "achievement") {
      if (!draftAchievement.name.trim()) {
        show("Achievement name is required");
        return;
      }
      const list = [...data.achievements];
      const nextItem = {
        ...draftAchievement,
        image_urls: draftAchievement.image_urls.filter(Boolean),
      };
      if (editIndex === null) list.push(nextItem);
      else list[editIndex] = nextItem;
      next = { ...data, achievements: list };
    }

    if (!next) return;
    setEditKind(null);
    setEditIndex(null);
    void persistStructure(next, "Saved");
  }

  async function persistStructure(next: CompanyStructure, successMessage: string) {
    if (!canEdit) {
      show("You do not have permission to save structure");
      return;
    }
    setData(next);
    setSaving(true);
    try {
      const saved = await saveCompanyStructure(next, currentMember);
      setData(saved);
      show(successMessage);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save structure");
      // Reload cloud truth so this PC does not keep unsaved local-only edits
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function removeStaff(index: number) {
    if (!data || !confirm("Delete this contact?")) return;
    void persistStructure(
      {
        ...data,
        staff_contacts: data.staff_contacts.filter((_, i) => i !== index),
      },
      "Contact deleted"
    );
  }

  function removeAddress(index: number) {
    if (!data || !confirm("Delete this address?")) return;
    void persistStructure(
      {
        ...data,
        addresses: data.addresses.filter((_, i) => i !== index),
      },
      "Address deleted"
    );
  }

  function removeBank(index: number) {
    if (!data || !confirm("Delete this bank account?")) return;
    void persistStructure(
      {
        ...data,
        bank_accounts: data.bank_accounts.filter((_, i) => i !== index),
      },
      "Bank account deleted"
    );
  }

  function removePayment(index: number) {
    if (!data || !confirm("Delete this payment method?")) return;
    void persistStructure(
      {
        ...data,
        payment_methods: data.payment_methods.filter((_, i) => i !== index),
      },
      "Payment method deleted"
    );
  }

  function removeAchievement(index: number) {
    if (!data || !confirm("Delete this achievement?")) return;
    void persistStructure(
      {
        ...data,
        achievements: data.achievements.filter((_, i) => i !== index),
      },
      "Achievement deleted"
    );
  }

  async function saveAll() {
    if (!data) return;
    await persistStructure(data, "Structure saved");
  }

  const modalTitle =
    editKind === "logo"
      ? "Company Logo"
      : editKind === "staff"
        ? editIndex === null
          ? "Add Staff Contact"
          : "Edit Staff Contact"
        : editKind === "address"
          ? editIndex === null
            ? "Add Address"
            : "Edit Address"
          : editKind === "bank"
            ? editIndex === null
              ? "Add Bank Account"
              : "Edit Bank Account"
            : editKind === "payment"
              ? editIndex === null
                ? "Add Payment Method"
                : "Edit Payment Method"
              : editKind === "social"
                ? "Company Social Links"
                : editKind === "support"
                  ? "Support Number"
                  : editKind === "achievement"
                    ? editIndex === null
                      ? "Add Achievement"
                      : "Edit Achievement"
                    : "";

  return (
    <>
      <Header title="Structure" description="Company contacts, address, bank & payment details" />
      <PageMain>
        {loading || !data ? (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading structure…
          </div>
        ) : (
          <div className="space-y-8 pb-24">
            {/* Company Logo */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-700">Company Logo</h2>
                {canEdit && (
                  <IconBtn label="Edit logo" tone="edit" onClick={openLogo}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconBtn>
                )}
              </div>
              <div className="inline-flex rounded-xl border border-stone-200 bg-stone-950 p-4 shadow-sm">
                {data.logo_url ? (
                  <Image
                    src={data.logo_url}
                    alt="Company logo"
                    width={180}
                    height={120}
                    unoptimized
                    className="h-[120px] w-[180px] rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-[120px] w-[180px] items-center justify-center rounded-lg bg-stone-900 text-xs text-stone-400">
                    No logo
                  </div>
                )}
              </div>
            </section>

            {/* Staff Contacts */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-blue-700">Staff Contact Information</h2>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => openStaff(null)}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.staff_contacts.map((c, idx) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900">Contact {idx + 1}</h3>
                      {canEdit && (
                        <div className="flex gap-2">
                          <IconBtn label="Edit contact" tone="edit" onClick={() => openStaff(idx)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Delete contact"
                            tone="delete"
                            onClick={() => removeStaff(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <FieldRow label="Name" value={c.name} />
                      <FieldRow label="Emails" value={c.emails} />
                      <FieldRow label="Mobiles" value={c.mobiles} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Addresses */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-blue-700">Company Addresses</h2>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => openAddress(null)}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.addresses.map((a, idx) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900">Address {idx + 1}</h3>
                      {canEdit && (
                        <div className="flex gap-2">
                          <IconBtn
                            label="Edit address"
                            tone="edit"
                            onClick={() => openAddress(idx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Delete address"
                            tone="delete"
                            onClick={() => removeAddress(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <FieldRow label="Street" value={a.street} />
                      <FieldRow label="Area" value={a.area} />
                      <FieldRow label="City" value={a.city} />
                      <FieldRow label="State" value={a.state} />
                      <FieldRow label="Pincode" value={a.pincode} />
                      <FieldRow label="Landmark" value={a.landmark} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Social Links */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-700">Company Social Links</h2>
                {canEdit && (
                  <IconBtn label="Edit social links" tone="edit" onClick={openSocial}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconBtn>
                )}
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="space-y-1.5">
                  <FieldRow label="Facebook" value={data.social_links.facebook} />
                  <FieldRow label="Instagram" value={data.social_links.instagram} />
                  <FieldRow label="YouTube" value={data.social_links.youtube} />
                  <FieldRow label="Website" value={data.social_links.website} />
                </div>
              </div>
            </section>

            {/* Support Number */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-700">Support Number</h2>
                {canEdit && (
                  <IconBtn label="Edit support number" tone="edit" onClick={openSupport}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconBtn>
                )}
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <FieldRow label="Number" value={data.support_number} />
              </div>
            </section>

            {/* Bank Details */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-blue-700">Bank Details</h2>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => openBank(null)}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.bank_accounts.map((b, idx) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900">Bank Account {idx + 1}</h3>
                      {canEdit && (
                        <div className="flex gap-2">
                          <IconBtn label="Edit bank" tone="edit" onClick={() => openBank(idx)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Delete bank"
                            tone="delete"
                            onClick={() => removeBank(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <FieldRow label="Bank Name" value={b.bank_name} />
                      <FieldRow label="IFSC Code" value={b.ifsc_code} />
                      <FieldRow label="Account Name" value={b.account_name} />
                      <FieldRow label="Account Number" value={b.account_number} />
                      <FieldRow label="Account Type" value={b.account_type} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment Methods */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-blue-700">Payment ID (Wallet/UPI)</h2>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => openPayment(null)}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.payment_methods.map((p, idx) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900">Payment Method {idx + 1}</h3>
                      {canEdit && (
                        <div className="flex gap-2">
                          <IconBtn
                            label="Edit payment"
                            tone="edit"
                            onClick={() => openPayment(idx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Delete payment"
                            tone="delete"
                            onClick={() => removePayment(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <FieldRow label="Type" value={p.type} />
                      <FieldRow label="UPI ID / Value" value={p.upi_id} />
                      <FieldRow label="Receiver Name" value={p.receiver_name} />
                      <FieldRow label="Mobile Number" value={p.mobile_number} />
                    </div>
                    {p.qr_image_url && (
                      <div className="mt-3">
                        <p className="mb-2 text-sm font-semibold text-stone-900">QR Image</p>
                        <Image
                          src={p.qr_image_url}
                          alt="UPI QR"
                          width={160}
                          height={160}
                          unoptimized
                          className="h-40 w-40 rounded-lg border border-stone-200 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Company Achievements */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-blue-700">Company - Achievements</h2>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => openAchievement(null)}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {data.achievements.map((a, idx) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900">Achievements</h3>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => openAchievement(idx)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removeAchievement(idx)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <FieldRow label="Name" value={a.name} />
                      <div>
                        <p className="text-sm font-semibold text-stone-900">Descriptions:</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                          {a.description || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-stone-900">
                          Achievements Images:
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {a.image_urls.length > 0 ? (
                            a.image_urls.map((url) => (
                              <Image
                                key={url}
                                src={url}
                                alt="Achievement"
                                width={220}
                                height={120}
                                unoptimized
                                className="h-[120px] w-[220px] rounded-lg border border-stone-200 object-cover"
                              />
                            ))
                          ) : (
                            <p className="text-sm text-stone-400">No images</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sticky Save All */}
            {canEdit && (
              <div className="fixed bottom-6 right-6 z-20">
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
                  disabled={saving}
                  onClick={() => void saveAll()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save All
                </Button>
              </div>
            )}
          </div>
        )}
      </PageMain>

      <Modal open={editKind !== null} onClose={() => setEditKind(null)} title={modalTitle}>
        <div className="space-y-4">
          {editKind === "logo" && (
            <FileUploadField
              label="Company Logo"
              hint="(Recommended: square PNG/JPG)"
              value={draftLogo}
              onChange={setDraftLogo}
              folder="structure"
            />
          )}

          {editKind === "support" && (
            <div>
              <Label>Support Number</Label>
              <Input
                className="mt-1"
                value={draftSupport}
                onChange={(e) => setDraftSupport(e.target.value)}
                placeholder="9509911614"
              />
            </div>
          )}

          {editKind === "social" && (
            <>
              {(
                [
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["youtube", "YouTube"],
                  ["website", "Website"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1"
                    value={draftSocial[key]}
                    onChange={(e) =>
                      setDraftSocial({ ...draftSocial, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </>
          )}

          {editKind === "staff" && (
            <>
              <div>
                <Label>Name</Label>
                <Input
                  className="mt-1"
                  value={draftStaff.name}
                  onChange={(e) => setDraftStaff({ ...draftStaff, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Emails</Label>
                <Input
                  className="mt-1"
                  value={draftStaff.emails}
                  onChange={(e) => setDraftStaff({ ...draftStaff, emails: e.target.value })}
                />
              </div>
              <div>
                <Label>Mobiles</Label>
                <Input
                  className="mt-1"
                  value={draftStaff.mobiles}
                  onChange={(e) => setDraftStaff({ ...draftStaff, mobiles: e.target.value })}
                />
              </div>
            </>
          )}

          {editKind === "address" && (
            <>
              {(
                [
                  ["street", "Street"],
                  ["area", "Area"],
                  ["city", "City"],
                  ["state", "State"],
                  ["pincode", "Pincode"],
                  ["landmark", "Landmark"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1"
                    value={draftAddress[key]}
                    onChange={(e) =>
                      setDraftAddress({ ...draftAddress, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </>
          )}

          {editKind === "bank" && (
            <>
              {(
                [
                  ["bank_name", "Bank Name"],
                  ["ifsc_code", "IFSC Code"],
                  ["account_name", "Account Name"],
                  ["account_number", "Account Number"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1"
                    value={draftBank[key]}
                    onChange={(e) => setDraftBank({ ...draftBank, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <Label>Account Type</Label>
                <Select
                  className="mt-1"
                  value={draftBank.account_type}
                  onChange={(e) =>
                    setDraftBank({ ...draftBank, account_type: e.target.value })
                  }
                >
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                </Select>
              </div>
            </>
          )}

          {editKind === "payment" && (
            <>
              <div>
                <Label>Type</Label>
                <Select
                  className="mt-1"
                  value={draftPayment.type}
                  onChange={(e) => setDraftPayment({ ...draftPayment, type: e.target.value })}
                >
                  <option value="UPI">UPI</option>
                  <option value="Wallet">Wallet</option>
                </Select>
              </div>
              <div>
                <Label>UPI ID / Value</Label>
                <Input
                  className="mt-1"
                  value={draftPayment.upi_id}
                  onChange={(e) => setDraftPayment({ ...draftPayment, upi_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Receiver Name</Label>
                <Input
                  className="mt-1"
                  value={draftPayment.receiver_name}
                  onChange={(e) =>
                    setDraftPayment({ ...draftPayment, receiver_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input
                  className="mt-1"
                  value={draftPayment.mobile_number}
                  onChange={(e) =>
                    setDraftPayment({ ...draftPayment, mobile_number: e.target.value })
                  }
                />
              </div>
              <FileUploadField
                label="QR Image"
                value={draftPayment.qr_image_url}
                onChange={(v) => setDraftPayment({ ...draftPayment, qr_image_url: v })}
                folder="structure"
              />
            </>
          )}

          {editKind === "achievement" && (
            <>
              <div>
                <Label>Name</Label>
                <Input
                  className="mt-1"
                  value={draftAchievement.name}
                  onChange={(e) =>
                    setDraftAchievement({ ...draftAchievement, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Descriptions</Label>
                <Textarea
                  className="mt-1 min-h-[180px]"
                  value={draftAchievement.description}
                  onChange={(e) =>
                    setDraftAchievement({ ...draftAchievement, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <Label>Achievements Images</Label>
                {draftAchievement.image_urls.map((url, i) => (
                  <div key={`${url}-${i}`} className="rounded-lg border border-stone-200 p-3">
                    <FileUploadField
                      label={`Image ${i + 1}`}
                      value={url}
                      onChange={(v) => {
                        const next = [...draftAchievement.image_urls];
                        if (v) next[i] = v;
                        else next.splice(i, 1);
                        setDraftAchievement({ ...draftAchievement, image_urls: next });
                      }}
                      folder="structure"
                      previewWide
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        setDraftAchievement({
                          ...draftAchievement,
                          image_urls: draftAchievement.image_urls.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      Remove image
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraftAchievement({
                      ...draftAchievement,
                      image_urls: [...draftAchievement.image_urls, ""],
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Add image
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditKind(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={saving}
              onClick={applyModalSave}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
