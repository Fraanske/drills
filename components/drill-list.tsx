import Link from "next/link";
import type { DrillSummary } from "@/lib/types";

export function DrillList({ drills }: { drills: DrillSummary[] }) {
  return (
    <div className="space-y-3">
      {drills.map((drill) => (
        <Link
          key={drill.id}
          href={`/drills/${drill.id}`}
          className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{drill.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{drill.one_liner}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {drill.court_area.replace("_", " ")}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Players: {drill.players_needed ?? "not set"}</p>
        </Link>
      ))}
    </div>
  );
}
