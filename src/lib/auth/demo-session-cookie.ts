export const DEMO_SESSION_COOKIE = "td-demo-session";

export function hasDemoSessionCookie(request: { cookies: { get: (name: string) => { value: string } | undefined } }): boolean {
  return request.cookies.get(DEMO_SESSION_COOKIE)?.value === "1";
}
