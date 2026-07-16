import { contactSchema } from "@/lib/api/schemas";
import { persistPublicRecord } from "@/lib/api/public-handler";
import { runGateway } from "@/modules/api-gateway";

export async function POST(request: Request) {
  return runGateway(request, {
    routeId: "public.contact",
    auth: "anonymous",
    permission: "public.contact",
    featureFlag: "public.contact",
    schema: contactSchema,
    handler: async ({ input }) => {
      const result = await persistPublicRecord("contact_queries", {
        ...input,
        status: "open",
      });
      return {
        data: result,
        message: result.mode === "demo" ? "Accepted (demo mode)" : "Created",
        status: 201,
      };
    },
  });
}
