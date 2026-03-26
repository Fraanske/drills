"use client";

import { useMemo, useRef, useState } from "react";
import type { DiagramObject, DiagramPayload } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Tool = "select" | "player" | "arrow" | "text" | "draw";

const boardWidth = 780;
const boardHeight = 460;

export function DiagramEditor({ initialDiagram }: { initialDiagram: DiagramPayload }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<Tool>("player");
  const [objects, setObjects] = useState<DiagramObject[]>(initialDiagram.objects);
  const [draftArrow, setDraftArrow] = useState<Extract<DiagramObject, { type: "arrow" }> | null>(null);
  const [draftPath, setDraftPath] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeObject = useMemo(() => objects.find((item) => item.id === activeId) ?? null, [activeId, objects]);

  function pointFromMouse(event: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onBoardMouseDown(event: React.MouseEvent<SVGSVGElement>) {
    const point = pointFromMouse(event);

    if (tool === "player") {
      const next = {
        id: uid(),
        type: "player" as const,
        x: point.x,
        y: point.y,
        label: String(objects.filter((item) => item.type === "player").length + 1),
      };
      setObjects((current) => [...current, next]);
      setActiveId(next.id);
      return;
    }

    if (tool === "text") {
      const next = { id: uid(), type: "text" as const, x: point.x, y: point.y, text: "Note" };
      setObjects((current) => [...current, next]);
      setActiveId(next.id);
      return;
    }

    if (tool === "arrow") {
      setDraftArrow({ id: uid(), type: "arrow", x1: point.x, y1: point.y, x2: point.x, y2: point.y });
      return;
    }

    if (tool === "draw") {
      setDraftPath(`M ${point.x} ${point.y}`);
      return;
    }

    setActiveId(null);
  }

  function onBoardMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const point = pointFromMouse(event);

    if (draftArrow) {
      setDraftArrow((current) => (current ? { ...current, x2: point.x, y2: point.y } : null));
    }

    if (draftPath) {
      setDraftPath((current) => `${current} L ${point.x} ${point.y}`);
    }
  }

  function onBoardMouseUp() {
    if (draftArrow) {
      setObjects((current) => [...current, draftArrow]);
      setActiveId(draftArrow.id);
      setDraftArrow(null);
    }

    if (draftPath) {
      const next = { id: uid(), type: "path" as const, d: draftPath };
      setObjects((current) => [...current, next]);
      setActiveId(next.id);
      setDraftPath(null);
    }
  }

  function updateActiveLabel(value: string) {
    if (!activeObject) return;

    setObjects((current) =>
      current.map((item) => {
        if (item.id !== activeObject.id) return item;
        if (item.type === "player") return { ...item, label: value };
        if (item.type === "text") return { ...item, text: value };
        return item;
      }),
    );
  }

  function deleteActive() {
    if (!activeId) return;
    setObjects((current) => current.filter((item) => item.id !== activeId));
    setActiveId(null);
  }

  async function saveDiagram() {
    const payload: DiagramPayload = {
      courtType: initialDiagram.courtType,
      objects,
    };

    const response = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      window.alert("Save failed. Wire this route to a diagram id and drill id before using in production.");
      return;
    }

    window.alert("Diagram payload posted. Connect the route to Supabase update logic.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Diagram tools</h2>
        <div className="mt-4 grid gap-2">
          {(["select", "player", "arrow", "text", "draw"] as Tool[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTool(item)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm ${tool === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-800">Selected item</p>
          {!activeObject && <p className="text-sm text-slate-500">Nothing selected.</p>}
          {activeObject?.type === "player" && (
            <input
              value={activeObject.label}
              onChange={(event) => updateActiveLabel(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          )}
          {activeObject?.type === "text" && (
            <input
              value={activeObject.text}
              onChange={(event) => updateActiveLabel(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          )}
          {activeObject && (
            <button type="button" onClick={deleteActive} className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700">
              Delete selected
            </button>
          )}
        </div>

        <button type="button" onClick={saveDiagram} className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          Save diagram
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          className="w-full rounded-2xl bg-amber-50"
          onMouseDown={onBoardMouseDown}
          onMouseMove={onBoardMouseMove}
          onMouseUp={onBoardMouseUp}
          onMouseLeave={onBoardMouseUp}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#0f172a" />
            </marker>
          </defs>

          <rect x="20" y="20" width="740" height="420" rx="24" fill="#fef3c7" stroke="#fcd34d" strokeWidth="2" />
          <line x1="390" y1="20" x2="390" y2="440" stroke="#fcd34d" strokeWidth="2" />
          <circle cx="390" cy="230" r="52" fill="none" stroke="#fcd34d" strokeWidth="2" />
          <rect x="20" y="140" width="110" height="180" fill="none" stroke="#fcd34d" strokeWidth="2" />
          <rect x="650" y="140" width="110" height="180" fill="none" stroke="#fcd34d" strokeWidth="2" />

          {objects.map((item) => {
            if (item.type === "player") {
              return (
                <g key={item.id} onClick={(event) => { event.stopPropagation(); setActiveId(item.id); }}>
                  <circle cx={item.x} cy={item.y} r="18" fill={item.id === activeId ? "#fed7aa" : "white"} stroke="#0f172a" strokeWidth="2" />
                  <text x={item.x} y={item.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{item.label}</text>
                </g>
              );
            }

            if (item.type === "arrow") {
              return <line key={item.id} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} stroke="#0f172a" strokeWidth="4" markerEnd="url(#arrowhead)" strokeLinecap="round" onClick={(event) => { event.stopPropagation(); setActiveId(item.id); }} />;
            }

            if (item.type === "text") {
              return <text key={item.id} x={item.x} y={item.y} fontSize="16" fontWeight="700" fill={item.id === activeId ? "#c2410c" : "#0f172a"} onClick={(event) => { event.stopPropagation(); setActiveId(item.id); }}>{item.text}</text>;
            }

            return <path key={item.id} d={item.d} fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" onClick={(event) => { event.stopPropagation(); setActiveId(item.id); }} />;
          })}

          {draftArrow && <line x1={draftArrow.x1} y1={draftArrow.y1} x2={draftArrow.x2} y2={draftArrow.y2} stroke="#ea580c" strokeWidth="4" strokeDasharray="6 6" markerEnd="url(#arrowhead)" />}
          {draftPath && <path d={draftPath} fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
    </div>
  );
}
