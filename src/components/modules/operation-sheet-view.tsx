"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  costSheetTotals,
  formatDisplayDate,
  getOrCreateCostSheet,
  hasCostSheet,
  hotelRowTotal,
  hydrateOperationsFromSupabase,
  listConfirmedBookings,
  saveCostSheet,
} from "@/lib/operations/store";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";
import type { HotelCostRow, OperationCostSheet } from "@/types/operations";
import { FilePlus2, RefreshCw, Search, X } from "lucide-react";

export function OperationSheetView() {
  const { show } = useToast();
  const [bookings, setBookings] = useState<ClientItineraryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<OperationCostSheet | null>(null);
  const [createdMap, setCreatedMap] = useState<Record<string, boolean>>({});

  function refresh() {
    const list = listConfirmedBookings();
    setBookings(list);
    const map: Record<string, boolean> = {};
    for (const b of list) map[b.id] = hasCostSheet(b.id);
    setCreatedMap(map);
  }

  useEffect(() => {
    void hydrateOperationsFromSupabase().then(() => refresh());
  }, []);

  const agents = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.owner_name))).sort(),
    [bookings]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bookings.filter((b) => {
      if (agent !== "all" && b.owner_name !== agent) return false;
      if (from && (b.travel_date || "") < from) return false;
      if (to && (b.travel_date || "") > to) return false;
      if (!q) return true;
      return (
        b.client_name.toLowerCase().includes(q) ||
        b.quote_id.toLowerCase().includes(q) ||
        (b.client_phone || "").includes(q) ||
        b.owner_name.toLowerCase().includes(q)
      );
    });
  }, [bookings, search, agent, from, to]);

  const activeBooking = bookings.find((b) => b.id === activeId) ?? null;

  async function openSheet(id: string) {
    try {
      const next = await getOrCreateCostSheet(id);
      setSheet(next);
      setActiveId(id);
      setCreatedMap((m) => ({ ...m, [id]: true }));
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to open cost sheet");
    }
  }

  function updateRow(id: string, patch: Partial<HotelCostRow>) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      hotel_rows: sheet.hotel_rows.map((r) =>
        r.id === id ? { ...r, ...patch, status: patch.status ?? "manual" } : r
      ),
    });
  }

  async function regenerate() {
    if (!activeId || !sheet) return;
    try {
      const next = await saveCostSheet({
        ...sheet,
        hotel_rows: sheet.hotel_rows.map((r) => ({
          ...r,
          room_price: 0,
          extra_bed_count: 0,
          extra_bed_price: 0,
          notes: "",
          status: "original",
        })),
        total_vehicle_km: 0,
        price_per_km: 0,
        additional_charges: 0,
      });
      setSheet(next);
      show("Cost sheet regenerated");
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to regenerate");
    }
  }

  async function persist() {
    if (!sheet) return;
    try {
      setSheet(await saveCostSheet(sheet));
      show("Cost sheet saved");
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save cost sheet");
    }
  }

  const totals = sheet ? costSheetTotals(sheet) : null;

  return (
    <>
      <Header
        title="Booked Trips — Cost Sheets"
        description="Manage confirmed bookings operation sheets"
      />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="info">Total: {filtered.length}</Badge>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9"
              placeholder="Search customer, quote…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <Select value={agent} onChange={(e) => setAgent(e.target.value)}>
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => {
              setSearch("");
              setAgent("all");
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-800 text-left text-xs uppercase text-stone-100">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Travel Date</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                    No booked trips found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-amber-700">#{b.quote_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.client_name}</div>
                      {b.client_phone && (
                        <div className="text-xs text-stone-500">{b.client_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDisplayDate(b.travel_date)}</td>
                    <td className="px-4 py-3">{b.owner_name}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={createdMap[b.id] ? "outline" : "default"}
                        className={!createdMap[b.id] ? "bg-emerald-600 hover:bg-emerald-700" : undefined}
                        onClick={() => openSheet(b.id)}
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        {createdMap[b.id] ? "Open" : "Create"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(sheet && activeBooking)}
        onClose={() => {
          setSheet(null);
          setActiveId(null);
        }}
        title="Booking Sheet"
        description={
          activeBooking
            ? `Booking ID: #${activeBooking.quote_id} · Itinerary Amount: ${formatInr(activeBooking.grand_total)}`
            : undefined
        }
        className="sm:max-w-5xl"
      >
        {sheet && activeBooking && totals && (
          <div className="space-y-5">
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-stone-800 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2 text-left">Place</th>
                    <th className="px-2 py-2 text-left">Hotel Name</th>
                    <th className="px-2 py-2 text-right">Room Price</th>
                    <th className="px-2 py-2 text-right">Rooms</th>
                    <th className="px-2 py-2 text-right">Total Room</th>
                    <th className="px-2 py-2 text-right">Extra Bed</th>
                    <th className="px-2 py-2 text-right">Extra Price</th>
                    <th className="px-2 py-2 text-right">Total Extra</th>
                    <th className="px-2 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.hotel_rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={
                        row.status === "removed"
                          ? "bg-red-50"
                          : row.status === "manual"
                            ? "text-red-700"
                            : i % 2 === 0
                              ? "bg-sky-50/60"
                              : "bg-white"
                      }
                    >
                      <td className="px-2 py-1.5">{row.date}</td>
                      <td className="px-2 py-1.5">{row.place}</td>
                      <td className="px-2 py-1.5">{row.hotel_name || "—"}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-20 text-right"
                          value={row.room_price}
                          onChange={(e) =>
                            updateRow(row.id, { room_price: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-14 text-right"
                          value={row.room_count}
                          onChange={(e) =>
                            updateRow(row.id, { room_count: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatInr(row.room_price * row.room_count)}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-14 text-right"
                          value={row.extra_bed_count}
                          onChange={(e) =>
                            updateRow(row.id, { extra_bed_count: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-20 text-right"
                          value={row.extra_bed_price}
                          onChange={(e) =>
                            updateRow(row.id, { extra_bed_price: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatInr(row.extra_bed_count * row.extra_bed_price)}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-violet-900">Transport Details</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Total Vehicle KM</Label>
                  <Input
                    type="number"
                    value={sheet.total_vehicle_km}
                    onChange={(e) =>
                      setSheet({ ...sheet, total_vehicle_km: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Price per KM (₹)</Label>
                  <Input
                    type="number"
                    value={sheet.price_per_km}
                    onChange={(e) =>
                      setSheet({ ...sheet, price_per_km: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Calculated Vehicle Cost</Label>
                  <p className="mt-2 text-lg font-semibold text-emerald-700">
                    {formatInr(totals.vehicle)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-violet-900">Additional Charges</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Additional Charges (₹)</Label>
                  <Input
                    type="number"
                    value={sheet.additional_charges}
                    onChange={(e) =>
                      setSheet({ ...sheet, additional_charges: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1 text-sm sm:text-right">
                  <p>
                    Pax: <strong>{sheet.pax}</strong>
                  </p>
                  <p>Total Hotel Prices: {formatInr(totals.hotel)}</p>
                  <p>Vehicle Price: {formatInr(totals.vehicle)}</p>
                  <p>Additional Charges: {formatInr(totals.additional)}</p>
                  <p className="text-base font-semibold">
                    Grand Total: {formatInr(totals.grand)}
                  </p>
                  <p className="text-xs text-stone-500">
                    Row sum check: {formatInr(sheet.hotel_rows.reduce((s, r) => s + hotelRowTotal(r), 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
              <div className="flex flex-wrap gap-3 text-xs text-stone-600">
                <span>Original (black)</span>
                <span className="text-red-600">Manual Modified</span>
                <span className="text-emerald-600">Booking Updated</span>
                <span className="rounded bg-red-100 px-1">Removed</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={regenerate}>
                  Regenerate
                </Button>
                <Button type="button" variant="outline" onClick={() => { setSheet(null); setActiveId(null); }}>
                  <X className="h-4 w-4" />
                  Close
                </Button>
                <Button type="button" onClick={persist}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
