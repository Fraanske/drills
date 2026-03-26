import { DiagramEditor } from "@/components/diagram-editor";
import type { DiagramPayload } from "@/lib/types";

const starterDiagram: DiagramPayload = {
  courtType: "full_court",
  objects: [
    { id: "p1", type: "player", x: 150, y: 360, label: "1" },
    { id: "p2", type: "player", x: 390, y: 360, label: "2" },
    { id: "p3", type: "player", x: 630, y: 360, label: "3" },
    { id: "a1", type: "arrow", x1: 150, y1: 335, x2: 390, y2: 220 },
    { id: "a2", type: "arrow", x1: 390, y1: 335, x2: 630, y2: 220 },
    { id: "t1", type: "text", x: 330, y: 55, text: "Sample transition flow" }
  ],
};

export default async function DrillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-500">Drill id: {id}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">3-Man Weave</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            This page is the place to wire Supabase drill fetches, update forms, tag management, and saved diagrams.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[420px,1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Drill details</h2>
            <div className="mt-5 space-y-4">
              <Field label="One-liner" value="transition passing | 6 players | full court" />
              <Field label="Setup" value="Three lines on the baseline. Pass and follow after every pass." />
              <Field label="Coaching points" value="Run wide lanes, pass early, and finish at game speed." />
            </div>
          </div>

          <DiagramEditor initialDiagram={starterDiagram} />
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
