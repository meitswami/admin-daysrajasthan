import { downloadSchema } from "@/lib/api/schemas";
import { persistPublicRecord } from "@/lib/api/public-handler";
import { runGateway } from "@/modules/api-gateway";

export async function POST(request: Request) {
  return runGateway(request, {
    routeId: "public.itinerary-download",
    auth: "anonymous",
    permission: "public.itinerary-download",
    featureFlag: "public.itinerary-download",
    schema: downloadSchema,
    handler: async ({ input }) => {
      const result = await persistPublicRecord("itinerary_downloads", {
        ...input,
        synced_to_crm: false,
      });
      return {
        data: result,
        message: result.mode === "demo" ? "Accepted (demo mode)" : "Created",
        status: 201,
      };
    },
  });
}
