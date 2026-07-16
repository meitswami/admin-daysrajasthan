import { inquirySchema } from "@/lib/api/schemas";
import { persistPublicRecord } from "@/lib/api/public-handler";
import { runGateway } from "@/modules/api-gateway";

export async function POST(request: Request) {
  return runGateway(request, {
    routeId: "public.inquiry",
    auth: "anonymous",
    permission: "public.inquiry",
    featureFlag: "public.inquiry",
    schema: inquirySchema,
    handler: async ({ input }) => {
      const result = await persistPublicRecord("package_inquiries", {
        ...input,
        status: "new",
      });
      return {
        data: result,
        message: result.mode === "demo" ? "Accepted (demo mode)" : "Created",
        status: 201,
      };
    },
  });
}
