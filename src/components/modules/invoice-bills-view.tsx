"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  addDaysIso,
  deleteInvoice,
  emptyParty,
  formatDisplayDate,
  listInvoices,
  nextInvoiceNumber,
  saveInvoice,
} from "@/lib/operations/store";
import { getCompanyStructure } from "@/lib/master-data/structure-store";
import { paymentDetailsFromStructure } from "@/lib/itinerary-builder/payment-details";
import type {
  InvoiceKind,
  InvoiceParty,
  InvoiceServiceLine,
  OpsInvoice,
  TripLeg,
} from "@/types/operations";
import { Download, Eye, Plus, Trash2 } from "lucide-react";

const MAIN_TABS = [
  { id: "sales", label: "Sales Invoice (Travel)" },
  { id: "car_rental", label: "Car Rental Invoice" },
  { id: "quotation", label: "Quotation Invoice" },
  { id: "all", label: "All Bills" },
] as const;

const ALL_SUB_TABS = [
  { id: "invoices", label: "Invoices" },
  { id: "quotations", label: "Quotations" },
  { id: "car_rentals", label: "Car Rentals" },
];

const INDIAN_STATES = [
  "Rajasthan",
  "Delhi",
  "Maharashtra",
  "Gujarat",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Haryana",
  "Punjab",
  "Other",
];

function newServiceLine(): InvoiceServiceLine {
  return {
    id: crypto.randomUUID(),
    tour_code: "",
    itinerary_name: "",
    travel_date: "",
    description: "",
    pax: 1,
    amount: 0,
  };
}

function newLeg(): TripLeg {
  return { id: crypto.randomUUID(), pickup: "", drop: "", km: 0 };
}

function blankInvoice(kind: InvoiceKind): OpsInvoice {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    kind,
    number: nextInvoiceNumber(kind),
    date: today,
    due_date: addDaysIso(30),
    agency: {
      ...emptyParty(),
      name: "Days Rajasthan",
      phone: "",
      email: "",
      state: "Rajasthan",
      district: "Jaipur",
    },
    client: emptyParty(),
    logo_data_url: null,
    services: [newServiceLine()],
    notes: "",
    terms: "",
    gst_rate: 18,
    total_paid: 0,
    driver_license: "",
    vehicle_number: "",
    aadhaar_name: "",
    vehicle_name: "",
    trip_legs: [newLeg()],
    rental_amount: 0,
    bank_name: "",
    account_number: "",
    ifsc: "",
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function blankInvoiceFromStructure(kind: InvoiceKind): Promise<OpsInvoice> {
  const invoice = blankInvoice(kind);
  try {
    const structure = await getCompanyStructure();
    const pay = paymentDetailsFromStructure(structure);
    return {
      ...invoice,
      bank_name: pay.bank.bank_name,
      account_number: pay.bank.account_number,
      ifsc: pay.bank.ifsc,
      logo_data_url: structure.logo_url,
      agency: {
        ...invoice.agency,
        phone: structure.support_number || invoice.agency.phone,
      },
    };
  } catch {
    return invoice;
  }
}

function PartyFields({
  title,
  party,
  onChange,
  selectLabel,
}: {
  title: string;
  party: InvoiceParty;
  onChange: (p: InvoiceParty) => void;
  selectLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-amber-800">{title}</h3>
      <div>
        <Label>{selectLabel}</Label>
        <Select
          value="new"
          onChange={() => {
            /* create-new only for now */
          }}
        >
          <option value="new">Create New</option>
        </Select>
      </div>
      {(
        [
          ["name", "Name"],
          ["address", "Address"],
          ["phone", "Phone"],
          ["email", "Email"],
          ["gstin", "GSTIN"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          {key === "address" ? (
            <Textarea
              rows={2}
              value={party[key]}
              onChange={(e) => onChange({ ...party, [key]: e.target.value })}
            />
          ) : (
            <Input
              value={party[key]}
              onChange={(e) => onChange({ ...party, [key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>State</Label>
          <Select
            value={party.state}
            onChange={(e) => onChange({ ...party, state: e.target.value })}
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>District</Label>
          <Input
            value={party.district}
            onChange={(e) => onChange({ ...party, district: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function moneySummary(
  subtotal: number,
  gstRate: number,
  totalPaid: number
) {
  const gst = (subtotal * gstRate) / 100;
  const total = subtotal + gst;
  const pending = Math.max(0, total - totalPaid);
  return { gst, total, pending };
}

export function InvoiceBillsView() {
  const { show } = useToast();
  const [tab, setTab] = useState<string>("sales");
  const [allSub, setAllSub] = useState("invoices");
  const [draft, setDraft] = useState<OpsInvoice>(() => blankInvoice("sales"));
  const [bills, setBills] = useState<OpsInvoice[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [billSearch, setBillSearch] = useState("");

  function refreshBills() {
    setBills(listInvoices());
  }

  useEffect(() => {
    refreshBills();
  }, []);

  useEffect(() => {
    if (tab === "all") return;
    const kind = tab as InvoiceKind;
    let cancelled = false;
    void blankInvoiceFromStructure(kind).then((inv) => {
      if (!cancelled) setDraft(inv);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const subtotal = useMemo(() => {
    if (draft.kind === "car_rental") return Number(draft.rental_amount) || 0;
    return draft.services.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  }, [draft]);

  const summary = moneySummary(subtotal, draft.gst_rate, draft.total_paid);

  function persist(status: OpsInvoice["status"] = "pending") {
    const next = saveInvoice({
      ...draft,
      status: summary.pending <= 0 && draft.total_paid > 0 ? "paid" : status,
      number: draft.number || nextInvoiceNumber(draft.kind),
    });
    setDraft(next);
    refreshBills();
    show(`${draft.kind === "quotation" ? "Quotation" : "Invoice"} saved (${next.number})`);
  }

  function previewText() {
    const lines = [
      `${draft.kind.toUpperCase()} ${draft.number}`,
      `Date: ${draft.date}`,
      `Agency: ${draft.agency.name}`,
      `Client: ${draft.client.name}`,
      `Subtotal: ${formatInr(subtotal)}`,
      `GST (${draft.gst_rate}%): ${formatInr(summary.gst)}`,
      `Total: ${formatInr(summary.total)}`,
      `Paid: ${formatInr(draft.total_paid)}`,
      `Pending: ${formatInr(summary.pending)}`,
    ];
    show(lines.join(" · "));
  }

  const filteredBills = useMemo(() => {
    let list = bills;
    if (allSub === "invoices") list = list.filter((b) => b.kind === "sales");
    if (allSub === "quotations") list = list.filter((b) => b.kind === "quotation");
    if (allSub === "car_rentals") list = list.filter((b) => b.kind === "car_rental");
    const q = billSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.number.toLowerCase().includes(q) ||
        b.client.name.toLowerCase().includes(q) ||
        b.agency.name.toLowerCase().includes(q)
    );
  }, [bills, allSub, billSearch]);

  const billStats = useMemo(() => {
    const scope =
      allSub === "quotations"
        ? bills.filter((b) => b.kind === "quotation")
        : allSub === "car_rentals"
          ? bills.filter((b) => b.kind === "car_rental")
          : bills.filter((b) => b.kind === "sales");
    const paid = scope.filter((b) => b.status === "paid");
    const pending = scope.filter((b) => b.status !== "paid");
    const paidAmt = paid.reduce((s, b) => s + b.total_paid, 0);
    const pendingAmt = pending.reduce((s, b) => {
      const sub =
        b.kind === "car_rental"
          ? Number(b.rental_amount) || 0
          : b.services.reduce((x, l) => x + l.amount, 0);
      const total = sub + (sub * b.gst_rate) / 100;
      return s + Math.max(0, total - b.total_paid);
    }, 0);
    return {
      total: scope.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      paidAmt,
      pendingAmt,
    };
  }, [bills, allSub]);

  return (
    <>
      <Header title="Invoice Generator" description="Sales, car rental, quotation & all bills" />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <Tabs tabs={[...MAIN_TABS]} active={tab} onChange={setTab} />

        {tab !== "all" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">
                {tab === "sales" && "Travel Sales Invoice"}
                {tab === "car_rental" && "LTC Car Rental Invoice"}
                {tab === "quotation" && "Travel & Tour Agency Quotation"}
              </h2>
              <div>
                <Label className="text-xs">Upload Logo (PNG)</Label>
                <Input
                  type="file"
                  accept="image/png,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      setDraft((d) => ({ ...d, logo_data_url: String(reader.result) }));
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <PartyFields
                title={tab === "car_rental" ? "Your Company" : "Your Travel Agency"}
                selectLabel={tab === "car_rental" ? "Select Company" : "Select Billing Agency"}
                party={draft.agency}
                onChange={(agency) => setDraft((d) => ({ ...d, agency }))}
              />
              <PartyFields
                title="Client Information"
                selectLabel="Select Billing Client"
                party={draft.client}
                onChange={(client) => setDraft((d) => ({ ...d, client }))}
              />
            </div>

            <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
              <div>
                <Label>{tab === "quotation" ? "Quotation Number" : "Invoice Number"}</Label>
                <Input
                  value={draft.number}
                  onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))}
                />
              </div>
              <div>
                <Label>{tab === "quotation" ? "Quote Date" : "Date"}</Label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>{tab === "quotation" ? "Valid Until" : "Due Date"}</Label>
                <Input
                  type="date"
                  value={draft.due_date}
                  onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                />
              </div>
            </div>

            {tab === "car_rental" && (
              <>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-amber-900">
                    Driver & Document Verification
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label>Driver License</Label>
                      <Input
                        value={draft.driver_license ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, driver_license: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Driver Vehicle Number</Label>
                      <Input
                        value={draft.vehicle_number ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, vehicle_number: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Aadhaar Name</Label>
                      <Input
                        value={draft.aadhaar_name ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, aadhaar_name: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-emerald-900">Vehicle Details</h3>
                  <Label>Vehicle Name</Label>
                  <Input
                    placeholder="e.g., Toyota Innova"
                    value={draft.vehicle_name ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, vehicle_name: e.target.value }))}
                  />
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-amber-800">Trip Legs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                        <tr>
                          <th className="px-2 py-2 text-left">Pickup Point</th>
                          <th className="px-2 py-2 text-left">Drop Point</th>
                          <th className="px-2 py-2 text-left">KM</th>
                          <th className="px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {(draft.trip_legs ?? []).map((leg) => (
                          <tr key={leg.id}>
                            <td className="px-2 py-1">
                              <Input
                                value={leg.pickup}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    trip_legs: (d.trip_legs ?? []).map((l) =>
                                      l.id === leg.id ? { ...l, pickup: e.target.value } : l
                                    ),
                                  }))
                                }
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                value={leg.drop}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    trip_legs: (d.trip_legs ?? []).map((l) =>
                                      l.id === leg.id ? { ...l, drop: e.target.value } : l
                                    ),
                                  }))
                                }
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                value={leg.km}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    trip_legs: (d.trip_legs ?? []).map((l) =>
                                      l.id === leg.id
                                        ? { ...l, km: Number(e.target.value) || 0 }
                                        : l
                                    ),
                                  }))
                                }
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    trip_legs: (d.trip_legs ?? []).filter((l) => l.id !== leg.id),
                                  }))
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-amber-700 hover:underline"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        trip_legs: [...(d.trip_legs ?? []), newLeg()],
                      }))
                    }
                  >
                    + Add Leg
                  </button>
                  <div className="mt-4">
                    <Label>Total Rental Amount (for entire trip)</Label>
                    <Input
                      type="number"
                      value={draft.rental_amount ?? 0}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, rental_amount: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {(tab === "sales" || tab === "quotation") && (
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-amber-800">Travel Services</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="bg-stone-800 text-xs uppercase text-white">
                      <tr>
                        <th className="px-2 py-2 text-left">Tour Code</th>
                        <th className="px-2 py-2 text-left">Itinerary Name</th>
                        <th className="px-2 py-2 text-left">Travel Date</th>
                        <th className="px-2 py-2 text-left">Description</th>
                        <th className="px-2 py-2 text-left">Pax</th>
                        <th className="px-2 py-2 text-left">Amount</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.services.map((line) => (
                        <tr key={line.id} className="border-b border-stone-100">
                          <td className="px-2 py-1">
                            <Input
                              value={line.tour_code}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === line.id ? { ...s, tour_code: e.target.value } : s
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              placeholder="e.g., Delhi Golden Triangle"
                              value={line.itinerary_name}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === line.id
                                      ? { ...s, itinerary_name: e.target.value }
                                      : s
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="date"
                              value={line.travel_date}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === line.id ? { ...s, travel_date: e.target.value } : s
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              value={line.description}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === line.id ? { ...s, description: e.target.value } : s
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              className="w-16"
                              value={line.pax}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === line.id
                                      ? { ...s, pax: Number(e.target.value) || 0 }
                                      : s
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              value={line.amount}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.map((s) =>
                                    s.id === line.id
                                      ? { ...s, amount: Number(e.target.value) || 0 }
                                      : s
                                  ),
                                }))
                              }
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  services: d.services.filter((s) => s.id !== line.id),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline"
                  onClick={() =>
                    setDraft((d) => ({ ...d, services: [...d.services, newServiceLine()] }))
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Travel Service
                </button>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {tab === "quotation" && (
                  <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-amber-800">Bank Details</h3>
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        value={draft.bank_name ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, bank_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input
                        value={draft.account_number ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, account_number: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>IFSC Code</Label>
                      <Input
                        value={draft.ifsc ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, ifsc: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                  <div>
                    <Label>{tab === "quotation" ? "Itinerary Notes" : "Notes"}</Label>
                    <Textarea
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Additional travel notes, inclusions/exclusions…"
                    />
                  </div>
                  <div>
                    <Label>Booking Terms & Conditions</Label>
                    <Textarea
                      value={draft.terms}
                      onChange={(e) => setDraft((d) => ({ ...d, terms: e.target.value }))}
                      placeholder="Cancellation policy, payment terms…"
                    />
                  </div>
                </div>
              </div>

              <Card className="h-fit border-amber-200 bg-amber-50/40">
                <CardContent className="space-y-3 pt-5">
                  <h3 className="font-semibold text-amber-900">
                    {tab === "quotation" ? "Quotation Summary" : "Summary"}
                  </h3>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatInr(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>GST Rate (%)</span>
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={draft.gst_rate}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, gst_rate: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  {tab === "car_rental" ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>CGST ({(draft.gst_rate / 2).toFixed(1)}%)</span>
                        <span>{formatInr(summary.gst / 2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>SGST ({(draft.gst_rate / 2).toFixed(1)}%)</span>
                        <span>{formatInr(summary.gst / 2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span>GST ({draft.gst_rate}%)</span>
                      <span>{formatInr(summary.gst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium">
                    <span>{tab === "quotation" ? "Total Quote" : "Total"}</span>
                    <span>{formatInr(summary.total)}</span>
                  </div>
                  {tab !== "quotation" && (
                    <>
                      <div>
                        <Label className="text-xs">Total Paid</Label>
                        <Input
                          type="number"
                          value={draft.total_paid}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              total_paid: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pending</span>
                        <span className="font-semibold text-red-600">
                          {formatInr(summary.pending)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200 pt-2 font-semibold">
                        <span>Grand Total</span>
                        <span>{formatInr(summary.total)}</span>
                      </div>
                    </>
                  )}
                  <Button
                    type="button"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={previewText}
                  >
                    <Eye className="h-4 w-4" />
                    Preview PDF
                  </Button>
                  <Button type="button" className="w-full" onClick={() => persist()}>
                    <Download className="h-4 w-4" />
                    {tab === "sales" && "Save Travel Sales Invoice"}
                    {tab === "car_rental" && "Save Car Rental Invoice"}
                    {tab === "quotation" && "Save Travel Quotation"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tab === "all" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-stone-900">All Bills Dashboard</h2>
            <div className="flex gap-4 border-b border-stone-200">
              {ALL_SUB_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAllSub(t.id)}
                  className={`pb-2 text-sm font-medium ${
                    allSub === t.id
                      ? "border-b-2 border-amber-600 text-amber-800"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Total Invoices", value: String(billStats.total), color: "text-amber-700" },
                {
                  label: "Paid Invoices",
                  value: String(billStats.paidCount),
                  color: "text-emerald-700",
                },
                {
                  label: "Pending Invoices",
                  value: String(billStats.pendingCount),
                  color: "text-red-600",
                },
                {
                  label: "Total Paid Amount",
                  value: formatInr(billStats.paidAmt),
                  color: "text-emerald-700",
                },
                {
                  label: "Total Pending Amount",
                  value: formatInr(billStats.pendingAmt),
                  color: "text-red-600",
                },
              ].map((c) => (
                <Card key={c.label}>
                  <CardContent className="pt-5">
                    <p className="text-xs uppercase text-stone-500">{c.label}</p>
                    <p className={`mt-1 text-lg font-semibold ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowFilters((v) => !v)}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
              {showFilters && (
                <Input
                  className="max-w-xs"
                  placeholder="Search number or client…"
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                />
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-stone-500">
                        No bills found.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const sub =
                        b.kind === "car_rental"
                          ? Number(b.rental_amount) || 0
                          : b.services.reduce((s, l) => s + l.amount, 0);
                      const total = sub + (sub * b.gst_rate) / 100;
                      const pending = Math.max(0, total - b.total_paid);
                      return (
                        <tr key={b.id} className="hover:bg-amber-50/30">
                          <td className="px-4 py-3 font-medium">{b.number}</td>
                          <td className="px-4 py-3">{b.client.name || "—"}</td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-stone-500">
                            {b.client.address || "—"}
                          </td>
                          <td className="px-4 py-3">{formatInr(total)}</td>
                          <td className="px-4 py-3 text-emerald-700">{formatInr(b.total_paid)}</td>
                          <td className="px-4 py-3 text-red-600">{formatInr(pending)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                b.status === "paid"
                                  ? "success"
                                  : b.status === "pending"
                                    ? "warning"
                                    : "default"
                              }
                            >
                              {b.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{formatDisplayDate(b.date)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTab(b.kind);
                                  setDraft(b);
                                  show(`Loaded ${b.number}`);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  deleteInvoice(b.id);
                                  refreshBills();
                                  show("Bill deleted");
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
