"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { TableRowActions } from "@/components/ui/data-table";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import { getCurrentSnapshot } from "@/lib/itinerary-builder/storage";
import { listMasterContent } from "@/lib/master-data/content-store";
import {
  formatDisplayDate,
  getTransport,
  hydrateOperationsFromSupabase,
  listConfirmedBookings,
  upsertTransport,
} from "@/lib/operations/store";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";
import type { TransportAssignment } from "@/types/operations";
import type { WebsiteContentItem } from "@/types/database";
import {
  CalendarDays,
  Car,
  Download,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wallet,
} from "lucide-react";

type Row = ClientItineraryRecord & {
  transport: TransportAssignment | null;
  pickup: string;
  dropoff: string;
  vehicleLabel: string;
};

function emptyTransportForm(record: ClientItineraryRecord): Partial<TransportAssignment> {
  const snap = getCurrentSnapshot(record.id);
  const firstDay = snap?.days[0];
  const lastDay = snap?.days[snap.days.length - 1];
  const existing = getTransport(record.id);
  return {
    driver_name: existing?.driver_name ?? "",
    driver_phone: existing?.driver_phone ?? "",
    vehicle_id: existing?.vehicle_id ?? null,
    vehicle_name: existing?.vehicle_name ?? snap?.vehicle_types?.[0] ?? snap?.vehicle_type ?? "",
    vehicle_number: existing?.vehicle_number ?? "",
    vehicle_type: existing?.vehicle_type ?? "",
    vehicle_model: existing?.vehicle_model ?? existing?.vehicle_name ?? snap?.vehicle_types?.[0] ?? "",
    pickup_location: existing?.pickup_location ?? firstDay?.pickup_location ?? firstDay?.location ?? "",
    dropoff_location: existing?.dropoff_location ?? lastDay?.drop_location ?? "Departure",
    trip_end_date: existing?.trip_end_date ?? null,
    driver_advance: existing?.driver_advance ?? 0,
  };
}

export function TransportationSheetsView() {
  const { show } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<WebsiteContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [owner, setOwner] = useState("all");
  const [editRecord, setEditRecord] = useState<ClientItineraryRecord | null>(null);
  const [form, setForm] = useState<Partial<TransportAssignment>>({});
  const [advanceRecord, setAdvanceRecord] = useState<ClientItineraryRecord | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState(0);

  function refresh() {
    const bookings = listConfirmedBookings();
    setRows(
      bookings.map((r) => {
        const transport = getTransport(r.id);
        const snap = getCurrentSnapshot(r.id);
        const firstDay = snap?.days[0];
        const lastDay = snap?.days[snap.days.length - 1];
        return {
          ...r,
          transport,
          pickup: transport?.pickup_location || firstDay?.pickup_location || firstDay?.location || "—",
          dropoff: transport?.dropoff_location || lastDay?.drop_location || "Departure",
          vehicleLabel:
            transport?.vehicle_name ||
            snap?.vehicle_types?.join(", ") ||
            snap?.vehicle_type ||
            "—",
        };
      })
    );
  }

  useEffect(() => {
    void hydrateOperationsFromSupabase().then(() => refresh());
    void listMasterContent("vehicles").then(setVehicles);
  }, []);

  const owners = useMemo(
    () => Array.from(new Set(rows.map((r) => r.owner_name).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (owner !== "all" && r.owner_name !== owner) return false;
      if (month) {
        const td = r.travel_date?.slice(0, 7);
        if (td !== month) return false;
      }
      if (date && r.travel_date?.slice(0, 10) !== date) return false;
      if (!q) return true;
      return (
        r.client_name.toLowerCase().includes(q) ||
        r.quote_id.toLowerCase().includes(q) ||
        r.owner_name.toLowerCase().includes(q) ||
        r.vehicleLabel.toLowerCase().includes(q) ||
        (r.transport?.driver_name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, month, date, owner]);

  const totalAmount = filtered.reduce((s, r) => s + (r.grand_total || 0), 0);

  function openEdit(record: ClientItineraryRecord) {
    setEditRecord(record);
    setForm(emptyTransportForm(record));
  }

  function openAdvance(record: ClientItineraryRecord) {
    setAdvanceRecord(record);
    setAdvanceAmount(getTransport(record.id)?.driver_advance ?? 0);
  }

  async function saveEdit() {
    if (!editRecord) return;
    try {
      await upsertTransport(editRecord.id, form);
      show("Driver & vehicle updated");
      setEditRecord(null);
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save transport");
    }
  }

  async function saveAdvance() {
    if (!advanceRecord) return;
    try {
      await upsertTransport(advanceRecord.id, { driver_advance: Number(advanceAmount) || 0 });
      show("Driver advance updated");
      setAdvanceRecord(null);
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save advance");
    }
  }

  function exportCsv() {
    const header = [
      "Creator",
      "Client",
      "Travel Date",
      "Pickup",
      "End Date",
      "Dropoff",
      "Vehicle",
      "Driver",
      "Advance",
      "Amount",
    ];
    const lines = filtered.map((r) =>
      [
        r.owner_name,
        r.client_name,
        formatDisplayDate(r.travel_date),
        r.pickup,
        formatDisplayDate(r.transport?.trip_end_date),
        r.dropoff,
        r.vehicleLabel,
        r.transport?.driver_name || "",
        String(r.transport?.driver_advance ?? 0),
        String(r.grand_total),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transportation-sheets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header
        title="Transportation Sheets"
        description="Driver, vehicle & advance for confirmed bookings"
      />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white">
            <CalendarDays className="h-4 w-4" />
            Confirmed Bookings ({filtered.length})
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Total Booked</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-stone-500">Total Amount</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatInr(totalAmount)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="flex items-center gap-2 text-sm font-medium text-stone-800">
              <Search className="h-4 w-4 text-stone-400" />
              Filters
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px]">
                <Label className="text-xs">User</Label>
                <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
                  <option value="all">All Users</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-[140px]">
                <Label className="text-xs">Month</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="min-w-[140px]">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="relative min-w-[180px] flex-1">
                <Label className="text-xs">Search</Label>
                <Input
                  placeholder="Client, quote, driver…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="button" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setMonth("");
                  setDate("");
                  setOwner("all");
                }}
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Travel Date & Pickup</th>
                <th className="px-4 py-3">End & Dropoff</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Advance</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                    No confirmed bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3">{r.owner_name}</td>
                    <td className="px-4 py-3 font-medium">{r.client_name}</td>
                    <td className="px-4 py-3">
                      <div>{formatDisplayDate(r.travel_date)}</div>
                      <div className="text-xs text-stone-500">{r.pickup}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDisplayDate(r.transport?.trip_end_date)}</div>
                      <div className="text-xs text-stone-500">{r.dropoff}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.vehicleLabel !== "—" ? (
                        <Badge variant="info">{r.vehicleLabel}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.transport?.driver_name ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-stone-400" />
                          {r.transport.driver_name}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatInr(r.transport?.driver_advance ?? 0)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <TableRowActions className="gap-1.5">
                        <Button type="button" size="sm" className="shrink-0" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => openAdvance(r)}>
                          <Wallet className="h-3.5 w-3.5" />
                          Advance
                        </Button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(editRecord)}
        onClose={() => setEditRecord(null)}
        title="Edit Driver & Vehicle"
        description={
          editRecord
            ? `Client: ${editRecord.client_name} | Tour: ${editRecord.tour_code || editRecord.quote_id}`
            : undefined
        }
        className="sm:max-w-2xl"
      >
        <div className="space-y-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
              <User className="h-4 w-4 text-amber-600" />
              Driver Details
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.driver_name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.driver_phone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, driver_phone: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Car className="h-4 w-4 text-amber-600" />
              Vehicle Details
            </h3>
            <div className="space-y-3">
              <div>
                <Label>Select Vehicle</Label>
                <Select
                  value={form.vehicle_id ?? ""}
                  onChange={(e) => {
                    const v = vehicles.find((x) => x.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      vehicle_id: v?.id ?? null,
                      vehicle_name: v?.name ?? f.vehicle_name,
                      vehicle_model: v?.name ?? f.vehicle_model,
                      vehicle_type: v?.subtitle?.split("·")[0]?.trim() || f.vehicle_type || "",
                    }));
                  }}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.subtitle ? ` (${v.subtitle})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Number</Label>
                  <Input
                    value={form.vehicle_number ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))}
                    placeholder="RJ-14-XX-1234"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Input
                    value={form.vehicle_type ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={form.vehicle_model ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_model: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-stone-800">Trip Locations</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Pickup Location</Label>
                <Input
                  value={form.pickup_location ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))}
                />
              </div>
              <div>
                <Label>Dropoff Location</Label>
                <Input
                  value={form.dropoff_location ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, dropoff_location: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <div>
            <Label>Trip End Date</Label>
            <Input
              type="date"
              value={form.trip_end_date?.slice(0, 10) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, trip_end_date: e.target.value || null }))}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditRecord(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit}>
              OK
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(advanceRecord)}
        onClose={() => setAdvanceRecord(null)}
        title="Update Driver Advance"
        description={advanceRecord ? `Client: ${advanceRecord.client_name}` : undefined}
      >
        <div className="space-y-4">
          <div>
            <Label>
              Advance Amount (₹) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdvanceRecord(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveAdvance}>
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
