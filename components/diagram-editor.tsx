"use client";

import { useMemo, useRef, useState } from "react";
import type { DiagramObject, DiagramPayload, DiagramSlide, PlayerColor } from "@/lib/types";
import { createEmptySlide } from "@/lib/diagram";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Tool = "select" | "player" | "cone" | "ball" | "straightArrow" | "curvedArrow" | "text";
type Point = { x: number; y: number };
type DraftArrow = Extract<DiagramObject, { type: "arrow" }>;

const boardWidth = 780;
const boardHeight = 460;
const playerColors: PlayerColor[] = ["blue", "red", "yellow", "green", "white"];
const playerColorStyles: Record<PlayerColor, { fill: string; stroke: string; text: string }> = {
  blue: { fill: "#1d4ed8", stroke: "#dbeafe", text: "#ffffff" },
  red: { fill: "#dc2626", stroke: "#fee2e2", text: "#ffffff" },
  yellow: { fill: "#facc15", stroke: "#854d0e", text: "#1f2937" },
  green: { fill: "#16a34a", stroke: "#dcfce7", text: "#ffffff" },
  white: { fill: "#ffffff", stroke: "#0f172a", text: "#0f172a" },
};

function getArrowPath(arrow: DraftArrow) {
  if (arrow.style === "curved" && typeof arrow.cx === "number" && typeof arrow.cy === "number") {
    return `M ${arrow.x1} ${arrow.y1} Q ${arrow.cx} ${arrow.cy} ${arrow.x2} ${arrow.y2}`;
  }

  return `M ${arrow.x1} ${arrow.y1} L ${arrow.x2} ${arrow.y2}`;
}

function getArrowHeadPoint(arrow: DraftArrow) {
  if (arrow.style === "curved" && typeof arrow.cx === "number" && typeof arrow.cy === "number") {
    const t = 0.92;
    const x =
      (1 - t) * (1 - t) * arrow.x1 +
      2 * (1 - t) * t * arrow.cx +
      t * t * arrow.x2;
    const y =
      (1 - t) * (1 - t) * arrow.y1 +
      2 * (1 - t) * t * arrow.cy +
      t * t * arrow.y2;
    return { x, y };
  }

  return { x: arrow.x2, y: arrow.y2 };
}

function createArrow(start: Point, end: Point, style: "straight" | "curved"): DraftArrow {
  const arrow: DraftArrow = {
    id: uid(),
    type: "arrow",
    style,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    color: "#0f172a",
  };

  if (style === "curved") {
    arrow.cx = (start.x + end.x) / 2;
    arrow.cy = Math.min(start.y, end.y) - 60;
  }

  return arrow;
}

export function DiagramEditor({
  initialDiagram,
  drillId,
}: {
  initialDiagram: DiagramPayload;
  drillId: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<Tool>("player");
  const [diagram, setDiagram] = useState<DiagramPayload>(initialDiagram);
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [activePlayerColor, setActivePlayerColor] = useState<PlayerColor>("blue");
  const [draftArrow, setDraftArrow] = useState<DraftArrow | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragLastPoint, setDragLastPoint] = useState<Point | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeSlide = useMemo(
    () => diagram.slides.find((slide) => slide.id === diagram.activeSlideId) ?? diagram.slides[0],
    [diagram],
  );

  const activeObject = useMemo(
    () => activeSlide?.objects.find((item) => item.id === activeObjectId) ?? null,
    [activeObjectId, activeSlide],
  );

  function setActiveSlideObjects(update: (current: DiagramObject[]) => DiagramObject[]) {
    if (!activeSlide) return;

    setDiagram((current) => ({
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === activeSlide.id ? { ...slide, objects: update(slide.objects) } : slide,
      ),
    }));
  }

  function pointFromMouse(event: React.MouseEvent<SVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function addObject(point: Point) {
    if (!activeSlide) return;

    if (tool === "player") {
      const next: Extract<DiagramObject, { type: "player" }> = {
        id: uid(),
        type: "player",
        x: point.x,
        y: point.y,
        label: String(activeSlide.objects.filter((item) => item.type === "player").length + 1),
        color: activePlayerColor,
      };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
      return;
    }

    if (tool === "cone") {
      const next: Extract<DiagramObject, { type: "cone" }> = { id: uid(), type: "cone", x: point.x, y: point.y };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
      return;
    }

    if (tool === "ball") {
      const next: Extract<DiagramObject, { type: "ball" }> = { id: uid(), type: "ball", x: point.x, y: point.y };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
      return;
    }

    if (tool === "text") {
      const next: Extract<DiagramObject, { type: "text" }> = { id: uid(), type: "text", x: point.x, y: point.y, text: "Note" };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
    }
  }

  function startDragging(objectId: string, point: Point) {
    setActiveObjectId(objectId);
    setDraggingId(objectId);
    setDragLastPoint(point);
  }

  function moveObjectByDelta(item: DiagramObject, dx: number, dy: number): DiagramObject {
    if (item.type === "player" || item.type === "cone" || item.type === "ball" || item.type === "text") {
      return { ...item, x: item.x + dx, y: item.y + dy };
    }

    if (item.type === "arrow") {
      return {
        ...item,
        x1: item.x1 + dx,
        y1: item.y1 + dy,
        x2: item.x2 + dx,
        y2: item.y2 + dy,
        cx: typeof item.cx === "number" ? item.cx + dx : item.cx,
        cy: typeof item.cy === "number" ? item.cy + dy : item.cy,
      };
    }

    return item;
  }

  function onBoardMouseDown(event: React.MouseEvent<SVGSVGElement>) {
    const point = pointFromMouse(event);

    if (tool === "straightArrow") {
      setDraftArrow(createArrow(point, point, "straight"));
      setActiveObjectId(null);
      return;
    }

    if (tool === "curvedArrow") {
      setDraftArrow(createArrow(point, point, "curved"));
      setActiveObjectId(null);
      return;
    }

    if (tool === "select") {
      setActiveObjectId(null);
      return;
    }

    addObject(point);
  }

  function onBoardMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const point = pointFromMouse(event);

    if (draftArrow) {
      setDraftArrow((current) => (current ? createArrow({ x: current.x1, y: current.y1 }, point, current.style) : null));
      return;
    }

    if (draggingId && dragLastPoint) {
      const dx = point.x - dragLastPoint.x;
      const dy = point.y - dragLastPoint.y;
      setActiveSlideObjects((current) => current.map((item) => (item.id === draggingId ? moveObjectByDelta(item, dx, dy) : item)));
      setDragLastPoint(point);
    }
  }

  function onBoardMouseUp() {
    if (draftArrow) {
      setActiveSlideObjects((current) => [...current, draftArrow]);
      setActiveObjectId(draftArrow.id);
      setDraftArrow(null);
    }

    setDraggingId(null);
    setDragLastPoint(null);
  }

  function updateActiveLabel(value: string) {
    if (!activeObject) return;

    setActiveSlideObjects((current) =>
      current.map((item) => {
        if (item.id !== activeObject.id) return item;
        if (item.type === "player") return { ...item, label: value };
        if (item.type === "text") return { ...item, text: value };
        return item;
      }),
    );
  }

  function updateActivePlayerColor(color: PlayerColor) {
    if (!activeObject || activeObject.type !== "player") return;

    setActiveSlideObjects((current) =>
      current.map((item) => (item.id === activeObject.id && item.type === "player" ? { ...item, color } : item)),
    );
  }

  function updateSlideName(value: string) {
    if (!activeSlide) return;
    setDiagram((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === activeSlide.id ? { ...slide, name: value } : slide)),
    }));
  }

  function updateCourtType(courtType: DiagramSlide["courtType"]) {
    if (!activeSlide) return;
    setDiagram((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === activeSlide.id ? { ...slide, courtType } : slide)),
    }));
  }

  function addSlide(courtType: DiagramSlide["courtType"]) {
    const next = createEmptySlide(courtType, `Slide ${diagram.slides.length + 1}`);
    setDiagram((current) => ({
      activeSlideId: next.id,
      slides: [...current.slides, next],
    }));
    setActiveObjectId(null);
  }

  function deleteActiveSlide() {
    if (diagram.slides.length <= 1 || !activeSlide) return;

    const remaining = diagram.slides.filter((slide) => slide.id !== activeSlide.id);
    setDiagram({
      activeSlideId: remaining[0].id,
      slides: remaining,
    });
    setActiveObjectId(null);
  }

  function deleteActiveObject() {
    if (!activeObjectId) return;
    setActiveSlideObjects((current) => current.filter((item) => item.id !== activeObjectId));
    setActiveObjectId(null);
  }

  async function saveDiagram() {
    setIsSaving(true);

    const response = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drillId,
        diagram: diagram,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      window.alert("Save failed. Please try again.");
      return;
    }

    window.alert("Diagram saved.");
  }

  if (!activeSlide) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[290px,1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Diagram tools</h2>
        <div className="mt-4 grid gap-2">
          {(
            [
              ["select", "Select"],
              ["player", "Player"],
              ["cone", "Cone"],
              ["ball", "Ball"],
              ["straightArrow", "Straight arrow"],
              ["curvedArrow", "Curved arrow"],
              ["text", "Text"],
            ] as Array<[Tool, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTool(value)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm ${tool === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-800">Player colors</p>
          <div className="flex flex-wrap gap-2">
            {playerColors.map((color) => {
              const style = playerColorStyles[color];
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setActivePlayerColor(color);
                    updateActivePlayerColor(color);
                  }}
                  className={`h-9 w-9 rounded-full border-2 ${activePlayerColor === color ? "border-slate-900" : "border-slate-200"}`}
                  style={{ backgroundColor: style.fill }}
                  title={color}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-800">Slides</p>
            {diagram.slides.length > 1 && (
              <button type="button" onClick={deleteActiveSlide} className="text-xs font-semibold text-red-600">
                Delete slide
              </button>
            )}
          </div>
          <div className="space-y-2">
            {diagram.slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setDiagram((current) => ({ ...current, activeSlideId: slide.id }));
                  setActiveObjectId(null);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${slide.id === activeSlide.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                {slide.name || `Slide ${index + 1}`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => addSlide("half_court")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              + Half court
            </button>
            <button type="button" onClick={() => addSlide("full_court")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              + Full court
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-800">Selected slide</p>
          <input
            value={activeSlide.name}
            onChange={(event) => updateSlideName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
          <div className="flex gap-2">
            {(["half_court", "full_court"] as const).map((courtType) => (
              <button
                key={courtType}
                type="button"
                onClick={() => updateCourtType(courtType)}
                className={`rounded-xl px-3 py-2 text-sm ${activeSlide.courtType === courtType ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
              >
                {courtType === "half_court" ? "Half court" : "Full court"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-800">Selected item</p>
          {!activeObject && <p className="text-sm text-slate-500">Nothing selected.</p>}
          {activeObject?.type === "player" && (
            <input value={activeObject.label} onChange={(event) => updateActiveLabel(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          )}
          {activeObject?.type === "text" && (
            <input value={activeObject.text} onChange={(event) => updateActiveLabel(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          )}
          {activeObject && (
            <button type="button" onClick={deleteActiveObject} className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700">
              Delete selected
            </button>
          )}
        </div>

        <button type="button" disabled={isSaving} onClick={saveDiagram} className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
          {isSaving ? "Saving..." : "Save drill diagram"}
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

          {activeSlide.courtType === "full_court" ? (
            <>
              <rect x="20" y="20" width="740" height="420" rx="24" fill="#fef3c7" stroke="#fcd34d" strokeWidth="2" />
              <line x1="390" y1="20" x2="390" y2="440" stroke="#fcd34d" strokeWidth="2" />
              <circle cx="390" cy="230" r="52" fill="none" stroke="#fcd34d" strokeWidth="2" />
              <rect x="20" y="140" width="110" height="180" fill="none" stroke="#fcd34d" strokeWidth="2" />
              <rect x="650" y="140" width="110" height="180" fill="none" stroke="#fcd34d" strokeWidth="2" />
            </>
          ) : (
            <>
              <rect x="70" y="30" width="640" height="390" rx="24" fill="#fef3c7" stroke="#fcd34d" strokeWidth="2" />
              <rect x="290" y="250" width="200" height="170" fill="none" stroke="#fcd34d" strokeWidth="2" />
              <line x1="70" y1="250" x2="710" y2="250" stroke="#fcd34d" strokeWidth="2" />
              <circle cx="390" cy="250" r="62" fill="none" stroke="#fcd34d" strokeWidth="2" />
            </>
          )}

          {activeSlide.objects.map((item) => {
            if (item.type === "player") {
              const style = playerColorStyles[item.color];
              return (
                <g
                  key={item.id}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    if (tool === "select") startDragging(item.id, pointFromMouse(event));
                    else setActiveObjectId(item.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveObjectId(item.id);
                  }}
                >
                  <circle cx={item.x} cy={item.y} r="18" fill={style.fill} stroke={item.id === activeObjectId ? "#f59e0b" : style.stroke} strokeWidth="3" />
                  <text x={item.x} y={item.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={style.text}>{item.label}</text>
                </g>
              );
            }

            if (item.type === "cone") {
              return (
                <path
                  key={item.id}
                  d={`M ${item.x} ${item.y - 16} L ${item.x - 14} ${item.y + 16} L ${item.x + 14} ${item.y + 16} Z`}
                  fill={item.id === activeObjectId ? "#fb923c" : "#f97316"}
                  stroke="#7c2d12"
                  strokeWidth="2"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    if (tool === "select") startDragging(item.id, pointFromMouse(event));
                    else setActiveObjectId(item.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveObjectId(item.id);
                  }}
                />
              );
            }

            if (item.type === "ball") {
              return (
                <g
                  key={item.id}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    if (tool === "select") startDragging(item.id, pointFromMouse(event));
                    else setActiveObjectId(item.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveObjectId(item.id);
                  }}
                >
                  <circle cx={item.x} cy={item.y} r="14" fill="#fb923c" stroke={item.id === activeObjectId ? "#7c2d12" : "#9a3412"} strokeWidth="2" />
                  <path d={`M ${item.x - 14} ${item.y} Q ${item.x} ${item.y - 6} ${item.x + 14} ${item.y}`} fill="none" stroke="#7c2d12" strokeWidth="1.5" />
                  <path d={`M ${item.x} ${item.y - 14} Q ${item.x - 5} ${item.y} ${item.x} ${item.y + 14}`} fill="none" stroke="#7c2d12" strokeWidth="1.5" />
                </g>
              );
            }

            if (item.type === "arrow") {
              const head = getArrowHeadPoint(item);
              return (
                <g
                  key={item.id}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    if (tool === "select") startDragging(item.id, pointFromMouse(event));
                    else setActiveObjectId(item.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveObjectId(item.id);
                  }}
                >
                  <path d={getArrowPath(item)} fill="none" stroke={item.id === activeObjectId ? "#ea580c" : item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrowhead)" />
                  {item.style === "curved" && typeof item.cx === "number" && typeof item.cy === "number" ? (
                    <circle cx={head.x} cy={head.y} r="0.1" fill="transparent" />
                  ) : null}
                </g>
              );
            }

            if (item.type === "text") {
              return (
                <text
                  key={item.id}
                  x={item.x}
                  y={item.y}
                  fontSize="16"
                  fontWeight="700"
                  fill={item.id === activeObjectId ? "#c2410c" : "#0f172a"}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    if (tool === "select") startDragging(item.id, pointFromMouse(event));
                    else setActiveObjectId(item.id);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveObjectId(item.id);
                  }}
                >
                  {item.text}
                </text>
              );
            }

            return null;
          })}

          {draftArrow ? (
            <path
              d={getArrowPath(draftArrow)}
              fill="none"
              stroke="#ea580c"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#arrowhead)"
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
