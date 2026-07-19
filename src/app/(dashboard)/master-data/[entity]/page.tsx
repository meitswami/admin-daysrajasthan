import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import {
  WebsiteContentView,
  type MasterDataEntity,
} from "@/components/modules/website-content-view";

const ENTITIES = new Set<MasterDataEntity>([
  "countries",
  "destinations",
  "cities",
  "hotels",
  "vehicles",
]);

export default async function MasterDataEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (entity === "countries" || entity === "cities") {
    redirect("/master-data/destinations");
  }
  if (!ENTITIES.has(entity as MasterDataEntity)) notFound();

  return (
    <Suspense fallback={<div className="p-6 text-stone-500">Loading…</div>}>
      <WebsiteContentView entity={entity as MasterDataEntity} />
    </Suspense>
  );
}
