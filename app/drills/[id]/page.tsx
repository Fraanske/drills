import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDrill } from "@/app/drills/[id]/actions";
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
  const updateDrillAction = updateDrill.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 lg:px-4">
      <div className="mx-auto max-w-[1680px] space-y-4">
        <form action={updateDrillAction} className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              <span aria-hidden="true">←</span>
              Back to drill library
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-400 lg:inline">Drill id: {id}</span>
              <button
                type="submit"
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Save drill
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr),minmax(0,1fr),160px,160px]">
            <InlineField label="Title" name="title" defaultValue={typedDrill.title} placeholder="New drill" />
            <InlineField
              label="One-liner"
              name="one_liner"
              defaultValue={typedDrill.one_liner}
              placeholder="transition passing | 6 players | full court"
            />
            <InlineField
              label="Players"
              name="players_needed"
              defaultValue={typedDrill.players_needed ?? ""}
              placeholder="6"
            />
            <InlineField
              label="Age"
              name="age_group"
              defaultValue={typedDrill.age_group ?? ""}
              placeholder="U14+"
            />
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[220px,1fr]">
            <CompactSelectField label="Court" name="court_area" defaultValue={typedDrill.court_area}>
              <option value="half_court">Half court</option>
              <option value="full_court">Full court</option>
              <option value="small_side">Small side</option>
            </CompactSelectField>
            <InlineField
              label="Summary"
              name="explanation"
              defaultValue={typedDrill.explanation}
              placeholder="Short explanation of the drill"
            />
          </div>

          <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
              More drill details
            </summary>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              <TextAreaField label="Setup" name="setup" defaultValue={typedDrill.setup} rows={3} />
              <TextAreaField label="Flow steps" name="flow_steps" defaultValue={typedDrill.flow_steps} rows={3} />
              <TextAreaField label="Coaching points" name="coaching_points" defaultValue={typedDrill.coaching_points} rows={3} />
              <TextAreaField label="Variations" name="variations" defaultValue={typedDrill.variations} rows={3} />
            </div>
          </details>
        </form>

        <DiagramEditor initialDiagram={initialDiagram} drillId={id} />
      </div>
    </main>
  );
}

function InlineField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
      />
    </div>
  );
}

function CompactSelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
      >
        {children}
      </select>
    </div>
  );
}
