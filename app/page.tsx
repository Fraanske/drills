import Image from "next/image";
import Link from "next/link";
import { createDrill } from "@/app/actions";
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
    const { data } = await supabase
      .from("drills")
      .select("id, title, one_liner, court_area, players_needed, updated_at")
      .order("updated_at", { ascending: false });

    drills = (data ?? []) as DrillSummary[];
  }

  const primaryDrill = drills[0] ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(7,58,103,0.96),rgba(12,108,181,0.95))] px-6 py-8 text-white shadow-[0_30px_80px_rgba(7,58,103,0.25)] sm:px-8 lg:px-10 lg:py-10">
          <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,210,31,0.45),rgba(255,210,31,0))]" />
          <div className="absolute left-[-4rem] top-[-5rem] h-48 w-48 rounded-full border border-white/10" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#ffd21f]">High Five inspired court workspace</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Basketball drills that look game-ready before practice even starts.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/92 sm:text-lg">
                A bold drill library for your club: clear sessions, editable flow diagrams, and one shared space for coaches to build and refine ideas quickly.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white/90">Club palette</span>
                <span className="rounded-full border border-[#ffd21f]/45 bg-[#ffd21f]/12 px-4 py-2 font-semibold text-[#fff1a6]">Diagram-first</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white/90">Coach workflow</span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-5 lg:items-end">
              <div className="self-center rounded-[1.5rem] border border-white/15 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur lg:self-auto">
                <Image
                  src="/high-five-logo.png"
                  alt="High Five Tilburg logo"
                  width={240}
                  height={240}
                  className="mx-auto h-auto w-[140px] drop-shadow-[0_16px_30px_rgba(0,0,0,0.28)] sm:w-[164px]"
                  priority
                />
              </div>

              <div className="w-full max-w-sm rounded-[1.6rem] border border-white/15 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur lg:max-w-md">
                {user ? (
                  <div className="rounded-2xl border border-emerald-200/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Signed in as <span className="font-semibold">{user.email}</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#ffd21f]/30 bg-[#fff5bf] px-4 py-3 text-sm text-[#614a00]">
                    Not signed in
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-3 lg:justify-end">
                  {user ? (
                    <form action={createDrill}>
                      <button type="submit" className="rounded-2xl border border-[#ffd21f]/45 bg-[#ffd21f]/12 px-5 py-3 text-sm font-semibold text-[#fff1a6] transition hover:bg-[#ffd21f]/20">
                        New drill
                      </button>
                    </form>
                  ) : null}
                  {primaryDrill ? (
                    <Link href={`/drills/${primaryDrill.id}`} className="rounded-2xl bg-[#ffd21f] px-5 py-3 text-sm font-bold text-[#052b4b] shadow-[0_14px_30px_rgba(255,210,31,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ffe065]">
                      Open latest drill
                    </Link>
                  ) : (
                    <span className="rounded-2xl bg-white/20 px-5 py-3 text-sm font-medium text-white/78">
                      No drill yet
                    </span>
                  )}
                  {user ? (
                    <form action={signOut}>
                      <button type="submit" className="rounded-2xl border border-white/35 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12">
                        Sign out
                      </button>
                    </form>
                  ) : (
                    <Link href="/sign-in" className="rounded-2xl border border-white/35 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12">
                      Sign in page
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[360px,1fr]">
          <aside className="space-y-6">
            <div className="rounded-[1.9rem] border border-white/80 bg-white/82 p-6 shadow-[0_22px_60px_rgba(7,58,103,0.08)] backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0c6cb5]">Quick add</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[#052b4b]">Write drills the way coaches actually talk.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use one-liners like <span className="font-semibold text-[#073a67]">closeout drill | defense | 6 players | half court</span> and translate them into structured drills later.
              </p>
              <div className="mt-5 rounded-2xl bg-[#f4fbff] px-4 py-4 text-sm text-[#0c6cb5]">
                Fast idea capture first. Structure, filters and polish can follow after the coaching flow feels right.
              </div>
            </div>
            <div className="rounded-[1.9rem] border border-white/80 bg-white/82 p-6 shadow-[0_22px_60px_rgba(7,58,103,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-black tracking-tight text-[#052b4b]">Drill library</h2>
                {user ? (
                  <form action={createDrill}>
                    <button type="submit" className="rounded-full bg-[#073a67] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c6cb5]">
                      + Create drill
                    </button>
                  </form>
                ) : null}
              </div>
              <div className="mt-4">
                {!user ? (
                  <p className="text-sm text-slate-600">Sign in to load your drills from Supabase.</p>
                ) : drills.length === 0 ? (
                  <p className="text-sm text-slate-600">No drills found yet. Create your first drill to start building your library.</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f4fbff] px-4 py-3 text-sm">
                      <span className="font-semibold text-[#073a67]">{drills.length} drill{drills.length === 1 ? "" : "s"} available</span>
                      <span className="text-[#0c6cb5]">Latest update first</span>
                    </div>
                    <DrillList drills={drills} />
                  </>
                )}
              </div>
            </div>
          </aside>

          <section className="rounded-[1.9rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(231,245,255,0.86))] p-6 shadow-[0_22px_60px_rgba(7,58,103,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0c6cb5]">Club workflow</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#052b4b]">Built for one staff, one library, one clear rhythm.</h2>
              </div>
              <div className="rounded-full bg-[#073a67] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd21f]">
                High Five style
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#b9e1ff] bg-white/80 p-5">
                <h3 className="text-base font-black text-[#052b4b]">Session-ready drill pages</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Keep structure visible: explanation, setup, flow steps, coaching points and variations all in one place.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#b9e1ff] bg-white/80 p-5">
                <h3 className="text-base font-black text-[#052b4b]">Editable diagrams first</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Store real board data as JSON so drills stay editable, reusable and easy to evolve between practices.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#b9e1ff] bg-white/80 p-5">
                <h3 className="text-base font-black text-[#052b4b]">Coach access with Supabase</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Auth and workspace membership keep the right drills visible to the right people without extra admin tooling first.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#b9e1ff] bg-white/80 p-5">
                <h3 className="text-base font-black text-[#052b4b]">Designed for Vercel shipping</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Push, preview, adjust and repeat. Every iteration is ready to test online without local-only drift.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
