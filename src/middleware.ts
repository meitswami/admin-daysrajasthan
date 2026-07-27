import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasDemoSessionCookie } from "@/lib/auth/demo-session-cookie";

/** Public static files under /public — must stay reachable without login (quotations, proposals). */
function isPublicStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/theme-assets")) return true;
  if (pathname.startsWith("/structure-")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|css|map|txt|xml)$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Never run auth redirects on static assets (public quotation images/logos).
  if (isPublicStaticAsset(pathname)) {
    return NextResponse.next();
  }

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

  const isAuthPage = pathname.startsWith("/login");
  const isMfaPage = pathname.startsWith("/login/mfa");
  const isPasswordRecoveryPage =
    pathname.startsWith("/login/forgot-password") ||
    pathname.startsWith("/login/update-password");
  const isPublicQuotation =
    /^\/itinerary-builder\/[^/]+\/quotation\/?$/.test(pathname);
  const isPublicPath =
    pathname.startsWith("/proposal") ||
    pathname.startsWith("/embed") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/itinerary-builder/share") ||
    isPublicQuotation;
  const isProtected = !isAuthPage && !isPublicPath && !pathname.startsWith("/api");

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
  matcher: [
    /*
     * Run middleware on app routes, but skip Next internals and common static assets.
     * (Defense in depth — isPublicStaticAsset also short-circuits above.)
     */
    "/((?!_next/static|_next/image|favicon.ico|theme-assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
