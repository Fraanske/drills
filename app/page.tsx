import Link from "next/link";
import { signOut } from "@/app/(auth)/sign-in/actions";
import { DrillList } from "@/components/drill-list";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { DrillSummary } from "@/lib/types";

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let drills: DrillSummary[] = [];

  if (user) {
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    const workspaceId = memberships?.[0]?.workspace_id;

    if (workspaceId) {
      const { data } = await supabase
        .from("drills")
        .select("id, title, one_liner, court_area, players_needed, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

      drills = (data ?? []) as DrillSummary[];
    }
  }

  const primaryDrill = drills[0] ?? null;

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
                {primaryDrill ? (
                  <Link href={`/drills/${primaryDrill.id}`} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">
                    Open latest drill
                  </Link>
                ) : (
                  <span className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-medium text-slate-500">
                    No drill yet
                  </span>
                )}
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
              <h2 className="text-lg font-semibold text-slate-900">Drill library</h2>
              <div className="mt-4">
                {!user ? (
                  <p className="text-sm text-slate-600">Sign in to load your drills from Supabase.</p>
                ) : drills.length === 0 ? (
                  <p className="text-sm text-slate-600">No drills found yet. Add your first drill in Supabase or the app later.</p>
                ) : (
                  <DrillList drills={drills} />
                )}
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
