/**
 * Admin packages surface — same Knowledge-backed CMS as /itineraries.
 * Path reserved for Phase 1 route-group migration.
 */
import { redirect } from "next/navigation";

export default function AdminPackagesPage() {
  redirect("/itineraries");
}
