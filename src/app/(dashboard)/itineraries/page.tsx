import { Header } from "@/components/layout/header";
import { ItinerariesView } from "@/components/modules/itineraries-view";
import { itineraryDownloads } from "@/lib/data";
import { listCmsPackages } from "@/modules/packages";

export default async function ItinerariesPage() {
  const packages = await listCmsPackages();

  return (
    <>
      <Header
        title="Website Packages"
        description="Public tour packages — sourced via Knowledge Engine · PDF uploads, SEO display & download lead tracking"
      />
      <ItinerariesView initialItineraries={packages} initialDownloads={itineraryDownloads} />
    </>
  );
}
