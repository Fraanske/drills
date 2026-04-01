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
          <form action={updateDrillAction} className="mt-5 grid gap-5 lg:grid-cols-[1fr_220px] lg:items-start">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium text-slate-700">
                  Drill title
                </label>
                <input
                  id="title"
                  name="title"
                  defaultValue={typedDrill.title}
                  placeholder="New drill"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-3xl font-semibold tracking-tight text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="one_liner" className="text-sm font-medium text-slate-700">
                  One-liner
                </label>
                <input
                  id="one_liner"
                  name="one_liner"
                  defaultValue={typedDrill.one_liner}
                  placeholder="transition passing | 6 players | full court"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="explanation" className="text-sm font-medium text-slate-700">
                  Explanation
                </label>
                <textarea
                  id="explanation"
                  name="explanation"
                  defaultValue={typedDrill.explanation}
                  rows={4}
                  placeholder="Describe the purpose and key outcome of the drill."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
              <p className="text-sm text-slate-500">Drill id: {id}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Quick actions</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Save the title and summary here, or update the full drill details in the panel below.
              </p>
              <button
                type="submit"
                className="mt-4 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Save drill content
              </button>
            </div>
          </form>
        </header>

        <section className="grid gap-8 lg:grid-cols-[420px,1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <form action={updateDrillAction}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">Drill details</h2>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Save details
                </button>
              </div>
              <div className="mt-5 space-y-4">
                <InputField label="Title" name="title" defaultValue={typedDrill.title} />
                <InputField label="One-liner" name="one_liner" defaultValue={typedDrill.one_liner} />
                <TextAreaField label="Setup" name="setup" defaultValue={typedDrill.setup} rows={4} />
                <TextAreaField label="Flow steps" name="flow_steps" defaultValue={typedDrill.flow_steps} rows={4} />
                <TextAreaField label="Coaching points" name="coaching_points" defaultValue={typedDrill.coaching_points} rows={4} />
                <TextAreaField label="Variations" name="variations" defaultValue={typedDrill.variations} rows={4} />
                <InputField label="Players needed" name="players_needed" defaultValue={typedDrill.players_needed ?? ""} placeholder="6" />
                <SelectField label="Court area" name="court_area" defaultValue={typedDrill.court_area}>
                  <option value="half_court">Half court</option>
                  <option value="full_court">Full court</option>
                  <option value="small_side">Small side</option>
                </SelectField>
                <InputField label="Age group" name="age_group" defaultValue={typedDrill.age_group ?? ""} placeholder="U14+" />
                <TextAreaField
                  label="Explanation"
                  name="explanation"
                  defaultValue={typedDrill.explanation}
                  rows={5}
                />
              </div>
            </form>
          </div>

          <DiagramEditor initialDiagram={initialDiagram} drillId={id} />
        </section>
      </div>
    </main>
  );
}

function InputField({
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
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
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
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
      />
    </div>
  );
}

function SelectField({
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
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
      >
        {children}
      </select>
    </div>
  );
}
