import type { ReportBrand } from "@/lib/branding/report-brand";

export function DocumentBrandHeader({
  brand,
  title,
  subtitle,
  right,
}: {
  brand: ReportBrand;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="border-b border-amber-200 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.companyName}
              className="h-12 max-w-[180px] object-contain object-left print:h-10"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-900">
              {brand.shortName.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              {brand.companyName}
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-stone-900 sm:text-2xl">{title}</h1>
            {subtitle && <p className="text-sm text-stone-600">{subtitle}</p>}
            <p className="mt-1 text-xs text-stone-500">
              {brand.email} · {brand.phone}
            </p>
          </div>
        </div>
        {right && <div className="text-right text-sm shrink-0">{right}</div>}
      </div>
    </header>
  );
}

export function DocumentBrandFooter({ brand }: { brand: ReportBrand }) {
  return (
    <footer className="mt-10 border-t border-stone-200 pt-4 text-center text-xs text-stone-500">
      <p>{brand.reportFooter}</p>
      <p className="mt-2">
        {brand.websiteUrl}
        {brand.gstin ? ` · GSTIN: ${brand.gstin}` : ""}
      </p>
      <p className="mt-1 text-[10px] text-stone-400">{brand.address}</p>
    </footer>
  );
}

export function ReportPageBanner({ brand, reportTitle }: { brand: ReportBrand; reportTitle: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white p-4 sm:p-5">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt="" className="h-10 max-w-[140px] object-contain" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-200 text-xs font-bold text-amber-900">
          {brand.shortName}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-900">{brand.companyName}</p>
        <p className="text-sm text-stone-600">{reportTitle}</p>
      </div>
      <p className="text-xs text-stone-500">{new Date().toLocaleDateString("en-IN")}</p>
    </div>
  );
}
