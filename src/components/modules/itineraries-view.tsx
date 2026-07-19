"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PackageTypeSelect, PackageDurationSelect } from "@/components/ui/package-selects";
import { PdfUploadField, CoverImageUploadField } from "@/components/ui/file-upload-field";
import { Toggle } from "@/components/ui/toggle";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { DataTable, PageMain, PageToolbar, type Column } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Sheet } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerLinkPanel } from "@/components/shared/customer-link-panel";
import { MediaOverlayCard, MediaThumb } from "@/components/shared/media-overlay-card";
import type { PlaceholderCategory } from "@/lib/constants/placeholder-images";
import { getCustomerByEmail } from "@/lib/data/customer-links";
import { downloadCsv } from "@/lib/utils/csv";
import type { Itinerary, ItineraryDownload, ItineraryStatus, DisplayMode, PackageType } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { Download, Search, Pencil, Grid3X3, List, Star, Copy, Trash2, FileUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils/slugify";
import { cn } from "@/lib/utils";
import { useSystem } from "@/components/providers/system-provider";
import {
  createMasterItinerary,
  deleteMasterItinerary,
  updateMasterItinerary,
} from "@/lib/master-data/itinerary-store";
import {
  canCreateMasterData,
  canDeleteMasterRecord,
  canEditMasterRecord,
} from "@/lib/rbac/ownership";

function itineraryImageCategory(row: Itinerary): PlaceholderCategory {
  if (row.destination?.toLowerCase().includes("ranthambore")) return "wildlife";
  return "destination";
}

function parseForm(fd: FormData, base?: Itinerary): Omit<Itinerary, "id" | "download_count" | "created_at"> & { id?: string } {
  return {
    id: base?.id,
    package_name: String(fd.get("package_name")),
    destination: String(fd.get("destination")),
    slug: slugify(String(fd.get("package_name"))),
    pdf_url: String(fd.get("pdf_url") || base?.pdf_url || "/uploads/itineraries/new.pdf"),
    cover_image_url: String(fd.get("cover_image_url") || "") || null,
    package_type: (fd.get("package_type") as PackageType) || "Domestic",
    package_duration: String(fd.get("package_duration") || "3 Days 2 Nights"),
    show_on_website: fd.get("show_on_website") === "on",
    is_trending: fd.get("is_trending") === "on",
    display_mode: (fd.get("display_mode") as DisplayMode) || "grid",
    status: (fd.get("status") as ItineraryStatus) || "active",
    updated_at: new Date().toISOString(),
  };
}

function ItineraryFormFields({
  item,
  cloneSource,
  existingPackages,
  cloneFrom,
  onCloneChange,
}: {
  item?: Itinerary | null;
  cloneSource?: Itinerary | null;
  existingPackages: Itinerary[];
  cloneFrom: string;
  onCloneChange: (id: string) => void;
}) {
  const seed = item ?? cloneSource ?? null;
  const [pdfUrl, setPdfUrl] = useState(seed?.pdf_url ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(seed?.cover_image_url ?? null);

  useEffect(() => {
    const next = item ?? cloneSource ?? null;
    setPdfUrl(next?.pdf_url ?? "");
    setCoverUrl(next?.cover_image_url ?? null);
  }, [item, cloneSource, cloneFrom]);

  return (
    <div className="space-y-4">
      {!item && existingPackages.length > 0 && (
        <div>
          <Label htmlFor="clone_from">Use existing package itinerary</Label>
          <Select id="clone_from" value={cloneFrom} onChange={(e) => onCloneChange(e.target.value)} className="mt-1.5">
            <option value="">Upload new itinerary from scratch</option>
            {existingPackages.map((p) => (
              <option key={p.id} value={p.id}>{p.package_name} — {p.package_duration}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-stone-500">Clone PDF & cover for a client/lead variant</p>
        </div>
      )}

      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
        <p className="text-sm font-semibold text-amber-900">Upload files</p>
        <PdfUploadField
          label="Upload PDF"
          hint="Accept PDF only — stored until Supabase storage connects"
          value={pdfUrl || null}
          onChange={(v) => setPdfUrl(v ?? "")}
          required
        />
        <CoverImageUploadField
          label="Upload Cover Image"
          hint="Recommended 800×600 — png, jpg, jpeg, gif, webp"
          value={coverUrl}
          onChange={setCoverUrl}
        />
        <input type="hidden" name="pdf_url" value={pdfUrl} />
        <input type="hidden" name="cover_image_url" value={coverUrl ?? ""} />
      </div>

      <div>
        <Label htmlFor="package_name">Package name *</Label>
        <Input id="package_name" name="package_name" required defaultValue={seed?.package_name} className="mt-1.5" placeholder="5 Days Rajasthan Tour" />
      </div>
      <div>
        <Label htmlFor="destination">Destination *</Label>
        <Input id="destination" name="destination" required defaultValue={seed?.destination ?? ""} className="mt-1.5" placeholder="Jaipur · Udaipur" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PackageTypeSelect defaultValue={seed?.package_type ?? "Domestic"} />
        <PackageDurationSelect defaultValue={seed?.package_duration ?? "3 Days 2 Nights"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="display_mode">Website display</Label>
          <Select id="display_mode" name="display_mode" defaultValue={seed?.display_mode ?? "grid"} className="mt-1.5">
            <option value="grid">Grid view</option>
            <option value="list">List view</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={seed?.status ?? "active"} className="mt-1.5">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-6 rounded-xl border border-stone-100 bg-stone-50 p-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="show_on_website" defaultChecked={seed?.show_on_website ?? true} className="rounded border-stone-300" />
          <span className="text-sm font-medium text-stone-700">Show on website</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_trending" defaultChecked={seed?.is_trending ?? false} className="rounded border-stone-300" />
          <span className="text-sm font-medium text-stone-700">Trending on Home</span>
        </label>
      </div>
    </div>
  );
}

export function ItinerariesView({
  initialItineraries,
  initialDownloads,
}: {
  initialItineraries: Itinerary[];
  initialDownloads: ItineraryDownload[];
}) {
  const [items, setItems] = useState(initialItineraries);
  const [downloads, setDownloads] = useState(initialDownloads);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<DisplayMode>("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Itinerary | null>(null);
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [cloneFrom, setCloneFrom] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [downloadSearch, setDownloadSearch] = useState("");
  const [downloadPackage, setDownloadPackage] = useState("all");
  const [downloadCrm, setDownloadCrm] = useState("all");
  const { show } = useToast();
  const { currentMember } = useSystem();
  const canCreate = canCreateMasterData(currentMember);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        row.package_name.toLowerCase().includes(q) ||
        (row.destination?.toLowerCase().includes(q) ?? false) ||
        (row.package_type?.toLowerCase().includes(q) ?? false);
      const matchStatus = status === "all" || row.status === status;
      return matchSearch && matchStatus;
    });
  }, [items, search, status]);

  const cloneSource = items.find((i) => i.id === cloneFrom);

  const packageOptions = useMemo(
    () => [...new Set(downloads.map((d) => d.package_name))].sort(),
    [downloads]
  );

  const filteredDownloads = useMemo(() => {
    const q = downloadSearch.toLowerCase();
    return downloads.filter((d) => {
      const matchSearch =
        !q ||
        d.customer_name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        (d.phone?.toLowerCase().includes(q) ?? false) ||
        (d.destination?.toLowerCase().includes(q) ?? false) ||
        d.package_name.toLowerCase().includes(q) ||
        (d.source_page?.toLowerCase().includes(q) ?? false);
      const matchPackage = downloadPackage === "all" || d.package_name === downloadPackage;
      const matchCrm =
        downloadCrm === "all" ||
        (downloadCrm === "synced" && d.synced_to_crm) ||
        (downloadCrm === "pending" && !d.synced_to_crm);
      return matchSearch && matchPackage && matchCrm;
    });
  }, [downloads, downloadSearch, downloadPackage, downloadCrm]);

  function toggleWebsite(id: string, v: boolean) {
    const row = items.find((i) => i.id === id);
    if (row && !canEditMasterRecord(currentMember, row)) {
      show("View only — you cannot edit this package");
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, show_on_website: v } : i)));
    void updateMasterItinerary(id, { show_on_website: v }, currentMember);
    show(v ? "Visible on website" : "Hidden from website");
  }

  function toggleTrending(id: string) {
    const row = items.find((i) => i.id === id);
    if (row && !canEditMasterRecord(currentMember, row)) {
      show("View only — you cannot edit this package");
      return;
    }
    const next = !row?.is_trending;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_trending: next } : i)));
    void updateMasterItinerary(id, { is_trending: next }, currentMember);
    show("Trending updated");
  }

  const columns: Column<Itinerary>[] = [
    {
      key: "package",
      header: "Package",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.cover_image_url && (
            <Image src={row.cover_image_url} alt="" width={48} height={48} className="hidden h-12 w-12 rounded-lg object-cover sm:block" />
          )}
          <div>
            <p className="font-medium text-stone-900">{row.package_name}</p>
            <p className="text-xs text-stone-500">{row.destination} · {row.package_duration}</p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (row) => <Badge variant="info">{row.package_type}</Badge>, hideOnMobile: true },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "website",
      header: "Website",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Toggle checked={row.show_on_website} onChange={(v) => toggleWebsite(row.id, v)} />
          {row.is_trending && <Star className="h-4 w-4 fill-amber-500 text-amber-500" />}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "downloads",
      header: "Downloads",
      cell: (row) => <span className="font-semibold tabular-nums">{row.download_count}</span>,
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditItem(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
      hideOnMobile: true,
    },
  ];

  function syncDownload(id: string) {
    setDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, synced_to_crm: true } : d)));
    show("Download synced to CRM");
  }

  function handleExportDownloads() {
    downloadCsv(
      "itinerary-downloads.csv",
      ["Customer Name", "Email", "Phone", "Destination", "Package Name", "Download Date", "Source Page", "CRM Synced"],
      filteredDownloads.map((d) => [
        d.customer_name,
        d.email,
        d.phone ?? "",
        d.destination ?? "",
        d.package_name,
        formatDateTime(d.downloaded_at),
        d.source_page ?? "",
        d.synced_to_crm ? "yes" : "no",
      ])
    );
    show("Download records exported");
  }

  async function handleDelete() {
    if (!deleteId) return;
    const row = items.find((i) => i.id === deleteId);
    if (row && !canDeleteMasterRecord(currentMember, row)) {
      show("You can only delete your own packages (or need Admin)");
      setDeleteId(null);
      return;
    }
    await deleteMasterItinerary(deleteId, currentMember);
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    setDeleteId(null);
    show("Itinerary deleted");
  }

  function handleExport() {
    downloadCsv(
      "itineraries.csv",
      ["Package", "Type", "Duration", "Destination", "Website", "Trending", "Status", "Downloads", "Created by"],
      filtered.map((r) => [
        r.package_name, r.package_type ?? "", r.package_duration ?? "", r.destination ?? "",
        r.show_on_website ? "yes" : "no", r.is_trending ? "yes" : "no", r.status, String(r.download_count),
        r.created_by_name ?? "",
      ])
    );
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate) {
      show("You do not have permission to add packages");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const pdf = String(fd.get("pdf_url") || "");
    if (!pdf) {
      show("Please upload a PDF itinerary");
      return;
    }
    const parsed = parseForm(fd, cloneSource);
    const created = await createMasterItinerary(
      {
        package_name: parsed.package_name,
        destination: parsed.destination,
        package_type: parsed.package_type,
        package_duration: parsed.package_duration,
        pdf_url: parsed.pdf_url,
        cover_image_url: parsed.cover_image_url,
        show_on_website: parsed.show_on_website,
        is_trending: parsed.is_trending,
        display_mode: parsed.display_mode,
        status: parsed.status,
        inclusions: cloneSource?.inclusions ?? [],
        exclusions: cloneSource?.exclusions ?? [],
      },
      currentMember
    );
    setItems((prev) => [created, ...prev]);
    setAddOpen(false);
    setCloneFrom("");
    show(cloneSource ? "Itinerary cloned & saved to Supabase" : "Itinerary uploaded to Supabase");
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    if (!canEditMasterRecord(currentMember, editItem)) {
      show("You can only edit your own packages (or need Admin)");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const pdf = String(fd.get("pdf_url") || "");
    if (!pdf) {
      show("Please upload a PDF itinerary");
      return;
    }
    const parsed = parseForm(fd, editItem);
    const updated = await updateMasterItinerary(
      editItem.id,
      {
        package_name: parsed.package_name,
        destination: parsed.destination,
        package_type: parsed.package_type,
        package_duration: parsed.package_duration,
        pdf_url: parsed.pdf_url,
        cover_image_url: parsed.cover_image_url,
        show_on_website: parsed.show_on_website,
        is_trending: parsed.is_trending,
        display_mode: parsed.display_mode,
        status: parsed.status,
      },
      currentMember
    );
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? updated : i)));
    }
    setEditItem(null);
    show("Itinerary updated in Supabase");
  }

  const profile = detailEmail ? getCustomerByEmail(detailEmail) : null;

  return (
    <PageMain>
      <PageToolbar>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input placeholder="Search packages…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
            <button type="button" onClick={() => setViewMode("grid")} className={cn("rounded-md px-3 py-2", viewMode === "grid" ? "bg-amber-100 text-amber-900" : "text-stone-500")}>
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setViewMode("list")} className={cn("rounded-md px-3 py-2", viewMode === "list" ? "bg-amber-100 text-amber-900" : "text-stone-500")}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <Select className="h-10 w-full sm:w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All status</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </Select>
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => setAddOpen(true)}
            disabled={!canCreate}
          >
            <FileUp className="h-4 w-4" /> Upload Itinerary
          </Button>
        </div>
      </PageToolbar>

      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <MediaOverlayCard
              key={row.id}
              imageUrl={row.cover_image_url}
              imageCategory={itineraryImageCategory(row)}
              minHeightClass="min-h-[280px]"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge className="bg-white/20 text-white backdrop-blur">{row.package_type}</Badge>
                <Toggle checked={row.show_on_website} onChange={(v) => toggleWebsite(row.id, v)} />
              </div>
              <div className="mt-auto space-y-3 pt-6">
                <div>
                  <p className="text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">{row.package_name}</p>
                  <p className="mt-1 text-sm text-white/90">{row.destination} · {row.package_duration}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={row.status} />
                    {row.is_trending && <Badge className="bg-amber-500 text-white">Trending</Badge>}
                    <span className="text-xs text-white/80">{row.download_count} downloads</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="h-9 w-9 rounded-full p-0 shadow-md" onClick={() => setEditItem(row)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-9 w-9 rounded-full p-0 shadow-md" onClick={() => { setCloneFrom(row.id); setAddOpen(true); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-9 w-9 rounded-full p-0 shadow-md" onClick={() => setDeleteId(row.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                  <button type="button" onClick={() => toggleTrending(row.id)} className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm">
                    <Star className={cn("h-4 w-4", row.is_trending ? "fill-amber-400 text-amber-400" : "text-white")} />
                  </button>
                </div>
              </div>
            </MediaOverlayCard>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex gap-3">
                <MediaThumb
                  imageUrl={row.cover_image_url}
                  imageCategory={itineraryImageCategory(row)}
                  className="h-16 w-16"
                  width={64}
                  height={64}
                />
                <div className="flex-1">
                  <p className="font-semibold">{row.package_name}</p>
                  <p className="text-sm text-stone-500">{row.package_type} · {row.package_duration}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={row.status} />
                    <Toggle checked={row.show_on_website} onChange={(v) => toggleWebsite(row.id, v)} label="Web" />
                  </div>
                </div>
              </div>
            </div>
          )}
        />
      )}

      <Card className="border-stone-200/80">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Download Management</CardTitle>
              <CardDescription>
                Captures customer name, email, phone, destination, package, date & source page from website downloads
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportDownloads}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Search downloads…"
                className="h-10 pl-9"
                value={downloadSearch}
                onChange={(e) => setDownloadSearch(e.target.value)}
              />
            </div>
            <Select className="h-10 sm:w-48" value={downloadPackage} onChange={(e) => setDownloadPackage(e.target.value)}>
              <option value="all">All packages</option>
              {packageOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <Select className="h-10 sm:w-40" value={downloadCrm} onChange={(e) => setDownloadCrm(e.target.value)}>
              <option value="all">All CRM status</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-stone-500">
                {["Customer", "Email", "Phone", "Destination", "Package", "Source", "Download Date", "CRM"].map((h) => (
                  <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredDownloads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">No download records match your filters</td>
                </tr>
              ) : (
                filteredDownloads.map((d) => (
                <tr key={d.id} className="text-stone-700">
                  <td className="py-2.5">
                    <button type="button" className="font-medium text-amber-800 hover:underline" onClick={() => setDetailEmail(d.email)}>
                      {d.customer_name}
                    </button>
                  </td>
                  <td className="py-2.5">{d.email}</td>
                  <td className="py-2.5 whitespace-nowrap">{d.phone ?? "—"}</td>
                  <td className="py-2.5">{d.destination ?? "—"}</td>
                  <td className="py-2.5">{d.package_name}</td>
                  <td className="py-2.5 text-xs">{d.source_page ?? "—"}</td>
                  <td className="py-2.5 whitespace-nowrap">{formatDateTime(d.downloaded_at)}</td>
                  <td className="py-2.5">
                    {d.synced_to_crm ? (
                      <StatusBadge status="synced" />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => syncDownload(d.id)}>Sync</Button>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          </div>
          <p className="text-xs text-stone-500">{filteredDownloads.length} of {downloads.length} records</p>
        </CardContent>
      </Card>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setCloneFrom(""); }} title="Upload itinerary" description="Upload PDF & cover — used across website download sections" className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleAdd} className="space-y-4">
          <ItineraryFormFields item={null} cloneSource={cloneSource ?? null} existingPackages={items} cloneFrom={cloneFrom} onCloneChange={setCloneFrom} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setAddOpen(false); setCloneFrom(""); }}>Cancel</Button>
            <Button type="submit" className="flex-1">Save itinerary</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit itinerary" className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {editItem && (
          <form onSubmit={handleEdit} className="space-y-4">
            <ItineraryFormFields item={editItem} cloneSource={null} existingPackages={items} cloneFrom="" onCloneChange={() => {}} />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" className="flex-1">Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete itinerary">
        <p className="text-sm text-stone-600">Remove this package from the website? Download history is kept.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      <Sheet open={!!profile} onClose={() => setDetailEmail(null)} title="Customer profile" side="right">
        {profile && <CustomerLinkPanel profile={profile} />}
      </Sheet>
    </PageMain>
  );
}
