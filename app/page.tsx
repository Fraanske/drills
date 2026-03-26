import Link from "next/link";
import { signOut } from "@/app/(auth)/sign-in/actions";
import { DrillList } from "@/components/drill-list";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { DrillSummary } from "@/lib/types";

const starterDrills: DrillSummary[] = [
  {
    id: "sample-1",
    title: "3-Man Weave",
    one_liner: "transition passing | 6 players | full court",
    court_area: "full_court",
    players_needed: "6",
    updated_at: new Date().toISOString(),
  },
  {
    id: "sample-2",
    title: "Shell Drill",
    one_liner: "half-court defense rotation | 8 players",
    court_area: "half_court",
    players_needed: "8",
    updated_at: new Date().toISOString(),
  },
];

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Vercel + Supabase scaffold</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Basketball drills workspace</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Shared drill library with editable online flow diagrams. This scaffold is intentionally narrow: auth, workspace-ready data model, drill pages, and a diagram editor payload.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              {user ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Signed in as <span className="font-semibold">{user.email}</span>
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Not signed in
                </div>
              )}

              <div className="flex gap-3">
                <Link href="/drills/sample-1" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">
                Open sample drill
                </Link>
                {user ? (
                  <form action={signOut}>
                    <button type="submit" className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800">
                      Sign out
                    </button>
                  </form>
                ) : (
                  <Link href="/sign-in" className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800">
                    Sign in page
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px,1fr]">
          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Quick add direction</h2>
              <p className="mt-2 text-sm text-slate-600">Use one-liners like: <span className="font-medium text-slate-800">closeout drill | defense | 6 players | half court</span></p>
              <p className="mt-3 text-sm text-slate-600">Parse and normalize this later with a server action or route handler.</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Sample library</h2>
              <div className="mt-4">
                <DrillList drills={starterDrills} />
              </div>
            </div>
          </aside>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Implementation notes</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Use Supabase Auth for user sessions.</li>
              <li>Create workspaces and workspace_members before enabling team access in the UI.</li>
              <li>Store editable diagrams as JSON in the database, not only as images.</li>
              <li>Export preview images later from the SVG layer if you need thumbnails.</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
