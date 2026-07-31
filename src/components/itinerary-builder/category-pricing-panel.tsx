"use client";

import { Input, Label } from "@/components/ui/input";
import { HOTEL_CATEGORY_OPTIONS, type CategoryPricingTier, type HotelCategoryKey, type ItinerarySnapshot } from "@/types/itinerary-builder";
import { applyCostToSnapshot, formatInr } from "@/lib/itinerary-builder/cost-engine";
import { buildCategoryPricing } from "@/lib/itinerary-builder/package-catalog";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function CategoryPricingPanel({
  snapshot,
  onChange,
}: {
  snapshot: ItinerarySnapshot;
  onChange: (snapshot: ItinerarySnapshot) => void;
}) {
  const { show } = useToast();
  const tiers = snapshot.category_pricing ?? [];
  const selectedKeys = tiers.map((t) => t.category_key);

  function toggleCategory(key: HotelCategoryKey) {
    const has = selectedKeys.includes(key);
    let keys: HotelCategoryKey[];
    if (has) {
      keys = selectedKeys.filter((k) => k !== key);
    } else {
      if (selectedKeys.length >= 2) {
        show("Maximum 2 categories");
        return;
      }
      keys = [...selectedKeys, key];
    }
    const discounts = Object.fromEntries(
      tiers.map((t) => [t.category_key, t.discount_price])
    ) as Partial<Record<HotelCategoryKey, number | null>>;
    const category_pricing = buildCategoryPricing(snapshot, keys, discounts);
    onChange(applyCostToSnapshot({ ...snapshot, category_pricing }));
  }

  function updateTier(key: HotelCategoryKey, patch: Partial<CategoryPricingTier>) {
    const category_pricing = tiers.map((t) =>
      t.category_key === key ? { ...t, ...patch } : t
    );
    onChange(applyCostToSnapshot({ ...snapshot, category_pricing }));
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="font-semibold text-stone-900">Package Pricing</h3>
      <p className="text-xs text-stone-500">Select up to 2 tiers · Prefetched, then editable</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {HOTEL_CATEGORY_OPTIONS.map((opt) => {
          const selected = selectedKeys.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleCategory(opt.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-stone-200"
              )}
            >
              {selected && <Check className="mr-1 inline h-3 w-3" />}
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-3">
        {tiers.map((tier) => (
          <div key={tier.category_key} className="rounded-xl bg-stone-50 p-3 text-sm">
            <p className="font-medium">{tier.label}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Auto price</Label>
                <p className="font-semibold tabular-nums">{formatInr(tier.package_price)}</p>
              </div>
              <div>
                <Label className="text-xs">Discount amount (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-0.5 h-8 text-xs"
                  value={tier.discount_price || ""}
                  onChange={(e) =>
                    updateTier(tier.category_key, {
                      discount_price: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Manual override</Label>
                <Input
                  type="number"
                  className="mt-0.5 h-8 text-xs"
                  placeholder="Override total"
                  value={tier.manual_override ?? ""}
                  onChange={(e) =>
                    updateTier(tier.category_key, {
                      manual_override: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Total: {formatInr(tier.grand_total)}
            </p>
            {(tier.manual_override != null || tier.discount_price != null) && (
              <p className="mt-1 text-[10px] text-stone-500">
                Prefetched: {formatInr(tier.package_price)}
                {tier.manual_override != null && tier.manual_override !== tier.package_price && (
                  <span className="text-amber-700">
                    {" "}
                    · Override Δ {formatInr(tier.manual_override - tier.package_price)}
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
