"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { PageMain } from "@/components/ui/data-table";
import { globalSearch } from "@/lib/data/search";
import { Search } from "lucide-react";

export function SearchView() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);

  const results = useMemo(() => globalSearch(query), [query]);

  return (
    <>
      <Header title="Search" description="Find customers, inquiries, blogs & packages" />
      <PageMain>
        <div className="relative mx-auto max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <Input
            autoFocus
            placeholder="Search name, email, destination, package…"
            className="h-12 pl-12 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {query.length >= 2 ? (
          <div className="mx-auto mt-6 max-w-2xl space-y-2">
            <p className="text-sm text-stone-500">{results.length} result{results.length !== 1 ? "s" : ""}</p>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 py-12 text-center text-stone-500">
                No matches for &ldquo;{query}&rdquo;
              </div>
            ) : (
              results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">{r.type}</Badge>
                      {r.status && <StatusBadge status={r.status} />}
                    </div>
                    <p className="mt-1 font-medium text-stone-900">{r.title}</p>
                    <p className="truncate text-sm text-stone-500">{r.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-sm text-amber-700">Open →</span>
                </Link>
              ))
            )}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-stone-500">Type at least 2 characters to search across all modules</p>
        )}
      </PageMain>
    </>
  );
}
