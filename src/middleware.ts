import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasDemoSessionCookie } from "@/lib/auth/demo-session-cookie";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://placeholder.local",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http"));

  let user = null;
  if (supabaseConfigured) {
    try {
      const authResult = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("supabase_auth_timeout")), 8000);
        }),
      ]);
      user = authResult.data.user;
    } catch {
      // Avoid hanging the whole app when Supabase is slow/unreachable
      return response;
    }
  }

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isMfaPage = request.nextUrl.pathname.startsWith("/login/mfa");
  const isPasswordRecoveryPage =
    request.nextUrl.pathname.startsWith("/login/forgot-password") ||
    request.nextUrl.pathname.startsWith("/login/update-password");
  const isPublicQuotation =
    /^\/itinerary-builder\/[^/]+\/quotation\/?$/.test(request.nextUrl.pathname);
  const isPublicPath =
    request.nextUrl.pathname.startsWith("/proposal") ||
    request.nextUrl.pathname.startsWith("/embed") ||
    request.nextUrl.pathname.startsWith("/api/public") ||
    request.nextUrl.pathname.startsWith("/api/itinerary-builder/share") ||
    isPublicQuotation;
  const isProtected = !isAuthPage && !isPublicPath && !request.nextUrl.pathname.startsWith("/api");

  // Skip auth redirect in demo mode (no Supabase connected)
  if (!supabaseConfigured) {
    return response;
  }

  const hasDemoSession = hasDemoSessionCookie(request);
  const isAuthenticated = Boolean(user) || hasDemoSession;

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Allow MFA + password recovery pages even with an Auth session
  if (isAuthenticated && isAuthPage && !isMfaPage && !isPasswordRecoveryPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
