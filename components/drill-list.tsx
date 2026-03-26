import Link from "next/link";
import type { DrillSummary } from "@/lib/types";

export function DrillList({ drills }: { drills: DrillSummary[] }) {
  return (
    <div className="space-y-4">
      {drills.map((drill) => (
        <Link
          key={drill.id}
          href={`/drills/${drill.id}`}
          className="group block overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-[0_16px_40px_rgba(7,58,103,0.08)] transition hover:-translate-y-0.5 hover:border-[#8fcbff] hover:shadow-[0_22px_44px_rgba(7,58,103,0.16)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#052b4b] group-hover:text-[#0c6cb5]">{drill.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{drill.one_liner}</p>
            </div>
            <span className="rounded-full bg-[#e6f5ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0c6cb5]">
              {drill.court_area.replace("_", " ")}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Players: {drill.players_needed ?? "not set"}</p>
            <span className="text-xs font-semibold text-[#073a67]">Open drill</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
