"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, PageMain, type Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getBookingReportRows,
  getEmailReportRows,
  getInquiryReportRows,
  getOptionalItineraryRows,
  getPaymentReportRows,
  REPORT_TAB_META,
  type BookingReportRow,
  type EmailReportRow,
  type InquiryReportRow,
  type OptionalItineraryRow,
  type PaymentReportRow,
  type ReportTabId,
} from "@/lib/reports/report-rows";
import { downloadCsv } from "@/lib/utils/csv";
import { printReportPdf } from "@/lib/utils/print-report";
import { cn } from "@/lib/utils";

const TABS: { id: ReportTabId; label: string }[] = [
  { id: "bookings", label: "Bookings" },
  { id: "payments", label: "Payments" },
  { id: "inquiries", label: "Inquiries" },
  { id: "optional", label: "Optional Itinerary" },
  { id: "emails", label: "Emails" },
];

const BOOKING_STATUSES = ["all", "Booked", "Completed"] as const;
const PAYMENT_STATUSES = ["all", "success", "pending", "failed", "partial", "paid", "unpaid"] as const;
const INQUIRY_STATUSES = ["all", "new", "contacted", "quoted", "converted", "closed"] as const;
const OPTIONAL_STATUSES = ["all", "pending"] as const;
const EMAIL_STATUSES = ["all", "sent", "pending", "failed", "received", "draft", "queued"] as const;

function statusOptions(tab: ReportTabId): readonly string[] {
  switch (tab) {
    case "bookings":
      return BOOKING_STATUSES;
    case "payments":
      return PAYMENT_STATUSES;
    case "inquiries":
      return INQUIRY_STATUSES;
    case "optional":
      return OPTIONAL_STATUSES;
    case "emails":
      return EMAIL_STATUSES;
  }
}

function matchesQuery(haystacks: (string | null | undefined)[], q: string) {
  if (!q) return true;
  return haystacks.some((h) => (h ?? "").toLowerCase().includes(q));
}

export function ReportsView() {
  const { show } = useToast();
  const canExport = hasPermission("reports.export");
  const [tab, setTab] = useState<ReportTabId>("bookings");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ready, setReady] = useState(false);

  const [bookings, setBookings] = useState<BookingReportRow[]>([]);
  const [payments, setPayments] = useState<PaymentReportRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryReportRow[]>([]);
  const [optional, setOptional] = useState<OptionalItineraryRow[]>([]);
  const [emails, setEmails] = useState<EmailReportRow[]>([]);

  function refresh() {
    setBookings(getBookingReportRows());
    setPayments(getPaymentReportRows());
    setInquiries(getInquiryReportRows());
    setOptional(getOptionalItineraryRows());
    setEmails(getEmailReportRows());
  }

  useEffect(() => {
    refresh();
    setReady(true);
  }, []);

  useEffect(() => {
    setSearch("");
    setStatusFilter("all");
  }, [tab]);

  const meta = REPORT_TAB_META[tab];

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((r) => {
      const matchSearch = matchesQuery([r.booking_id, r.client_name, r.email, r.package_name], q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((r) => {
      const matchSearch = matchesQuery([r.booking_id, r.client_name, r.method], q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const filteredInquiries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((r) => {
      const matchSearch = matchesQuery([r.customer_name, r.email, r.package_name], q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [inquiries, search, statusFilter]);

  const filteredOptional = useMemo(() => {
    const q = search.trim().toLowerCase();
    return optional.filter((r) => {
      const matchSearch = matchesQuery([r.booking_id, r.client_name, r.email, r.package_name], q);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && r.status_key === "pending") ||
        r.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [optional, search, statusFilter]);

  const filteredEmails = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emails.filter((r) => {
      const matchSearch = matchesQuery([r.booking_id, r.client_name, r.email, r.subject], q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [emails, search, statusFilter]);

  const counts: Record<ReportTabId, number> = {
    bookings: bookings.length,
    payments: payments.length,
    inquiries: inquiries.length,
    optional: optional.length,
    emails: emails.length,
  };

  const filteredCount =
    tab === "bookings"
      ? filteredBookings.length
      : tab === "payments"
        ? filteredPayments.length
        : tab === "inquiries"
          ? filteredInquiries.length
          : tab === "optional"
            ? filteredOptional.length
            : filteredEmails.length;

  function exportCsv() {
    if (!canExport) {
      show("You do not have permission to export reports");
      return;
    }
    if (tab === "bookings") {
      downloadCsv(
        "bookings-report.csv",
        ["Booking ID", "Client Name", "Email", "Package", "Amount", "Status"],
        filteredBookings.map((r) => [
          r.booking_id,
          r.client_name,
          r.email,
          r.package_name,
          String(r.amount),
          r.status,
        ])
      );
    } else if (tab === "payments") {
      downloadCsv(
        "payments-report.csv",
        ["Booking ID", "Client Name", "Amount", "Status", "Method", "Date"],
        filteredPayments.map((r) => [
          r.booking_id,
          r.client_name,
          String(r.amount),
          r.status,
          r.method,
          r.date,
        ])
      );
    } else if (tab === "inquiries") {
      downloadCsv(
        "inquiries-report.csv",
        ["Customer", "Email", "Package", "Budget", "Status", "Travel Date"],
        filteredInquiries.map((r) => [
          r.customer_name,
          r.email,
          r.package_name,
          r.amount_label,
          r.status,
          r.travel_date,
        ])
      );
    } else if (tab === "optional") {
      downloadCsv(
        "optional-itinerary-report.csv",
        ["Booking ID", "Client Name", "Email", "Package", "Amount", "Status"],
        filteredOptional.map((r) => [
          r.booking_id,
          r.client_name,
          r.email,
          r.package_name,
          String(r.amount),
          r.status,
        ])
      );
    } else {
      downloadCsv(
        "emails-report.csv",
        ["Booking ID", "Client Name", "Email", "Subject", "Status", "Date"],
        filteredEmails.map((r) => [
          r.booking_id,
          r.client_name,
          r.email,
          r.subject,
          r.status,
          r.date,
        ])
      );
    }
    show("CSV downloaded");
  }

  function exportPdf() {
    if (!canExport) {
      show("You do not have permission to export reports");
      return;
    }
    let headers: string[] = [];
    let rows: string[][] = [];
    if (tab === "bookings") {
      headers = ["Booking ID", "Client Name", "Email", "Package", "Amount", "Status"];
      rows = filteredBookings.map((r) => [
        r.booking_id,
        r.client_name,
        r.email,
        r.package_name,
        r.amount_label,
        r.status,
      ]);
    } else if (tab === "payments") {
      headers = ["Booking ID", "Client Name", "Amount", "Status", "Method", "Date"];
      rows = filteredPayments.map((r) => [
        r.booking_id,
        r.client_name,
        r.amount_label,
        r.status,
        r.method,
        r.date,
      ]);
    } else if (tab === "inquiries") {
      headers = ["Customer", "Email", "Package", "Budget", "Status", "Travel Date"];
      rows = filteredInquiries.map((r) => [
        r.customer_name,
        r.email,
        r.package_name,
        r.amount_label,
        r.status,
        r.travel_date,
      ]);
    } else if (tab === "optional") {
      headers = ["Booking ID", "Client Name", "Email", "Package", "Amount", "Status"];
      rows = filteredOptional.map((r) => [
        r.booking_id,
        r.client_name,
        r.email,
        r.package_name,
        r.amount_label,
        r.status,
      ]);
    } else {
      headers = ["Booking ID", "Client Name", "Email", "Subject", "Status", "Date"];
      rows = filteredEmails.map((r) => [
        r.booking_id,
        r.client_name,
        r.email,
        r.subject,
        r.status,
        r.date,
      ]);
    }
    const ok = printReportPdf(meta.title, headers, rows, meta.description);
    if (!ok) show("Allow pop-ups to export PDF");
    else show("Print dialog opened — choose Save as PDF");
  }

  const bookingColumns: Column<BookingReportRow>[] = [
    {
      key: "booking_id",
      header: "Booking ID",
      cell: (r) => <span className="font-semibold text-amber-900">{r.booking_id}</span>,
    },
    {
      key: "client",
      header: "Client Name",
      cell: (r) => <span className="font-medium text-stone-800">{r.client_name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => <span className="text-stone-600">{r.email}</span>,
      hideOnMobile: true,
    },
    {
      key: "package",
      header: "Package",
      cell: (r) => <span className="line-clamp-2 max-w-[240px]">{r.package_name}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => <span className="tabular-nums font-medium">{r.amount_label}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
  ];

  const paymentColumns: Column<PaymentReportRow>[] = [
    {
      key: "booking_id",
      header: "Booking ID",
      cell: (r) => <span className="font-semibold text-amber-900">{r.booking_id}</span>,
    },
    {
      key: "client",
      header: "Client Name",
      cell: (r) => <span className="font-medium">{r.client_name}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => <span className="tabular-nums font-medium">{r.amount_label}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status === "partial" ? "pending" : r.status} />,
    },
    {
      key: "method",
      header: "Method",
      cell: (r) => r.method,
      hideOnMobile: true,
    },
    {
      key: "date",
      header: "Date",
      cell: (r) => r.date,
      hideOnMobile: true,
    },
  ];

  const inquiryColumns: Column<InquiryReportRow>[] = [
    {
      key: "customer",
      header: "Client Name",
      cell: (r) => <span className="font-medium">{r.customer_name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => r.email,
      hideOnMobile: true,
    },
    {
      key: "package",
      header: "Package",
      cell: (r) => r.package_name,
    },
    {
      key: "budget",
      header: "Budget",
      cell: (r) => r.amount_label,
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "travel",
      header: "Travel Date",
      cell: (r) => r.travel_date,
      hideOnMobile: true,
    },
  ];

  const optionalColumns: Column<OptionalItineraryRow>[] = [
    {
      key: "booking_id",
      header: "Booking ID",
      cell: (r) => <span className="font-semibold text-amber-900">{r.booking_id}</span>,
    },
    {
      key: "client",
      header: "Client Name",
      cell: (r) => <span className="font-medium">{r.client_name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => r.email,
      hideOnMobile: true,
    },
    {
      key: "package",
      header: "Package",
      cell: (r) => <span className="line-clamp-2 max-w-[240px]">{r.package_name}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => <span className="tabular-nums font-medium">{r.amount_label}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: () => <StatusBadge status="pending" />,
    },
  ];

  const emailColumns: Column<EmailReportRow>[] = [
    {
      key: "booking_id",
      header: "Booking ID",
      cell: (r) => <span className="font-semibold text-amber-900">{r.booking_id}</span>,
    },
    {
      key: "client",
      header: "Client Name",
      cell: (r) => <span className="font-medium">{r.client_name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => r.email,
      hideOnMobile: true,
    },
    {
      key: "subject",
      header: "Subject",
      cell: (r) => <span className="line-clamp-2 max-w-[220px]">{r.subject}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status === "sent" ? "success" : r.status} />,
    },
    {
      key: "date",
      header: "Date",
      cell: (r) => r.date,
      hideOnMobile: true,
    },
  ];

  return (
    <PageMain>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-amber-900 sm:text-3xl">
          Reports Dashboard
        </h2>
        <p className="text-sm text-stone-500">
          View and export all your business data with advanced filtering
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left transition-all",
              tab === t.id
                ? "border-amber-300 bg-amber-50 shadow-sm ring-1 ring-amber-200"
                : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
            )}
          >
            <p className={cn("text-xs font-medium", tab === t.id ? "text-amber-800" : "text-stone-500")}>
              {t.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">
              {ready ? counts[t.id] : "—"}
            </p>
          </button>
        ))}
      </div>

      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setTab(id as ReportTabId)}
        className="w-full sm:w-fit"
      />

      <Card className="overflow-hidden border-stone-200/80 shadow-sm">
        <CardHeader className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-lg text-stone-900">{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  className="h-10 pl-9"
                  placeholder={meta.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                className="h-10 w-full sm:w-40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions(tab).map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Status" : s}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-10 flex-1 bg-emerald-600 hover:bg-emerald-700 sm:flex-none"
                  onClick={exportCsv}
                  disabled={!canExport}
                  title={canExport ? "Download CSV" : "Export permission required"}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-10 flex-1 sm:flex-none"
                  onClick={exportPdf}
                  disabled={!canExport}
                  title={canExport ? "Print / Save as PDF" : "Export permission required"}
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {!ready ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-6 py-16 text-center text-sm text-stone-500">
              Loading report data…
            </div>
          ) : filteredCount === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <Inbox className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-stone-700">{meta.empty}</p>
                <p className="mt-1 text-sm text-stone-500">
                  Try clearing filters or add records from the related module.
                </p>
              </div>
            </div>
          ) : tab === "bookings" ? (
            <DataTable
              columns={bookingColumns}
              data={filteredBookings}
              mobileCard={(r) => (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-amber-900">{r.booking_id}</p>
                      <p className="text-sm text-stone-800">{r.client_name}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2">{r.package_name}</p>
                  <p className="text-sm font-medium tabular-nums">{r.amount_label}</p>
                </div>
              )}
            />
          ) : tab === "payments" ? (
            <DataTable
              columns={paymentColumns}
              data={filteredPayments}
              mobileCard={(r) => (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-amber-900">{r.booking_id}</p>
                      <p className="text-sm">{r.client_name}</p>
                    </div>
                    <StatusBadge status={r.status === "partial" ? "pending" : r.status} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{r.method}</span>
                    <span className="font-medium tabular-nums">{r.amount_label}</span>
                  </div>
                </div>
              )}
            />
          ) : tab === "inquiries" ? (
            <DataTable
              columns={inquiryColumns}
              data={filteredInquiries}
              mobileCard={(r) => (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-stone-900">{r.customer_name}</p>
                      <p className="text-sm text-stone-500">{r.email}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-stone-600">{r.package_name}</p>
                </div>
              )}
            />
          ) : tab === "optional" ? (
            <DataTable
              columns={optionalColumns}
              data={filteredOptional}
              mobileCard={(r) => (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-amber-900">{r.booking_id}</p>
                      <p className="text-sm">{r.client_name}</p>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2">{r.package_name}</p>
                  <p className="text-sm font-medium tabular-nums">{r.amount_label}</p>
                </div>
              )}
            />
          ) : (
            <DataTable
              columns={emailColumns}
              data={filteredEmails}
              mobileCard={(r) => (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-amber-900">{r.booking_id}</p>
                      <p className="text-sm">{r.client_name}</p>
                    </div>
                    <StatusBadge status={r.status === "sent" ? "success" : r.status} />
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2">{r.subject}</p>
                </div>
              )}
            />
          )}

          <p className="text-xs text-stone-500">
            Showing {filteredCount} of {counts[tab]} {meta.noun}
          </p>
        </CardContent>
      </Card>
    </PageMain>
  );
}
