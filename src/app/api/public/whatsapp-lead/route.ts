import { whatsappSchema } from "@/lib/api/schemas";
import { persistPublicRecord } from "@/lib/api/public-handler";
import { runGateway } from "@/modules/api-gateway";

export async function POST(request: Request) {
  return runGateway(request, {
    routeId: "public.whatsapp-lead",
    auth: "anonymous",
    permission: "public.whatsapp-lead",
    featureFlag: "public.whatsapp-lead",
    schema: whatsappSchema,
    handler: async ({ input }) => {
      const result = await persistPublicRecord("whatsapp_leads", {
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
