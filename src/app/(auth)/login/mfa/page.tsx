import { Suspense } from "react";
import MfaLoginForm from "./mfa-form";

export default function MfaLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-stone-500">Loading…</div>
      }
    >
      <MfaLoginForm />
    </Suspense>
  );
}
