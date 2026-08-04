import { Header } from "@/components/layout/header";
import { ItinerariesView } from "@/components/modules/itineraries-view";
import { getItineraryDownloads } from "@/lib/data/service";
import { listCmsPackages } from "@/modules/packages";

export default async function ItinerariesPage() {
  const [packages, downloads] = await Promise.all([
    listCmsPackages(),
    getItineraryDownloads(),
  ]);

  return (
    <>
      <Header
        title="Website Packages"
        description="Public tour packages — sourced via Knowledge Engine · PDF uploads, SEO display & download lead tracking"
      />
      <ItinerariesView initialItineraries={packages} initialDownloads={downloads} />
    </>
  );
}
