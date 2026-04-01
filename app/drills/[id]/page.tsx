import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagramEditor } from "@/components/diagram-editor";
import { normalizeDiagramPayload } from "@/lib/diagram";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { DiagramPayload, DrillDetail } from "@/lib/types";

export default async function DrillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: drill } = await supabase
    .from("drills")
    .select("id, title, one_liner, explanation, setup, flow_steps, coaching_points, variations, players_needed, court_area, age_group, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!drill) {
    notFound();
  }

  const { data: diagram } = await supabase
    .from("diagrams")
    .select("id, data_json")
    .eq("drill_id", id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialDiagram = normalizeDiagramPayload(diagram?.data_json);

  const typedDrill = drill as DrillDetail;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl bg-white p-8 shadow-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            <span aria-hidden="true">←</span>
            Back to drill library
          </Link>
          <p className="text-sm text-slate-500">Drill id: {id}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{typedDrill.title}</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            {typedDrill.explanation || "This drill does not have an explanation yet."}
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[420px,1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Drill details</h2>
            <div className="mt-5 space-y-4">
              <Field label="One-liner" value={typedDrill.one_liner} />
              <Field label="Setup" value={typedDrill.setup} />
              <Field label="Flow steps" value={typedDrill.flow_steps} />
              <Field label="Coaching points" value={typedDrill.coaching_points} />
              <Field label="Variations" value={typedDrill.variations} />
              <Field label="Players needed" value={typedDrill.players_needed ?? "Not set"} />
              <Field label="Court area" value={typedDrill.court_area.replace("_", " ")} />
              <Field label="Age group" value={typedDrill.age_group ?? "Not set"} />
            </div>
          </div>

          <DiagramEditor initialDiagram={initialDiagram} drillId={id} />
        </section>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{value}</p>
    </div>
  );
}
