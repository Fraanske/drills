"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DiagramColor, DiagramObject, DiagramPayload, DiagramSlide } from "@/lib/types";
import { createEmptySlide } from "@/lib/diagram";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Tool = "select" | "player" | "cone" | "ball" | "straightArrow" | "curvedArrow" | "text";
type Point = { x: number; y: number };
type DraftArrow = Extract<DiagramObject, { type: "arrow" }>;

const boardWidth = 780;
const boardHeight = 410;
const courtLayout = {
  margin: 18,
  lineWidth: 3,
  hoopRadius: 10,
  backboardWidth: 82,
  backboardOffset: 22,
  laneWidth: 126,
  laneDepth: 112,
  freeThrowRadius: 48,
  restrictedRadius: 34,
  centerRadiusOuter: 26,
  centerRadiusInner: 9,
  sidelineMarkInset: 16,
  sidelineMarkLength: 22,
} as const;
const diagramColors: DiagramColor[] = ["blue", "red", "yellow", "green", "white"];
const colorStyles: Record<DiagramColor, { fill: string; stroke: string; text: string }> = {
  blue: { fill: "#1d4ed8", stroke: "#dbeafe", text: "#ffffff" },
  red: { fill: "#dc2626", stroke: "#fee2e2", text: "#ffffff" },
  yellow: { fill: "#facc15", stroke: "#854d0e", text: "#1f2937" },
  green: { fill: "#16a34a", stroke: "#dcfce7", text: "#ffffff" },
  white: { fill: "#ffffff", stroke: "#0f172a", text: "#0f172a" },
};

function getColorStyle(color: DiagramColor) {
  return colorStyles[color];
}

function getArrowPath(arrow: DraftArrow) {
  if (arrow.style === "curved" && typeof arrow.cx === "number" && typeof arrow.cy === "number") {
    return `M ${arrow.x1} ${arrow.y1} Q ${arrow.cx} ${arrow.cy} ${arrow.x2} ${arrow.y2}`;
  }

  return `M ${arrow.x1} ${arrow.y1} L ${arrow.x2} ${arrow.y2}`;
}

function getArrowAngle(arrow: DraftArrow) {
  if (arrow.style === "curved" && typeof arrow.cx === "number" && typeof arrow.cy === "number") {
    return Math.atan2(arrow.y2 - arrow.cy, arrow.x2 - arrow.cx);
  }

  return Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
}

function getArrowHeadPolygon(arrow: DraftArrow) {
  const angle = getArrowAngle(arrow);
  const length = 13;
  const halfWidth = 6;
  const tipX = arrow.x2;
  const tipY = arrow.y2;
  const backX = tipX - Math.cos(angle) * length;
  const backY = tipY - Math.sin(angle) * length;
  const leftX = backX + Math.sin(angle) * halfWidth;
  const leftY = backY - Math.cos(angle) * halfWidth;
  const rightX = backX - Math.sin(angle) * halfWidth;
  const rightY = backY + Math.cos(angle) * halfWidth;
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

function createArrow(start: Point, end: Point, style: "straight" | "curved", color: DiagramColor): DraftArrow {
  const arrow: DraftArrow = {
    id: uid(),
    type: "arrow",
    style,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    color,
  };

  if (style === "curved") {
    arrow.cx = (start.x + end.x) / 2;
    arrow.cy = Math.min(start.y, end.y) - 60;
  }

  return arrow;
}

function CourtDefs() {
  return (
    <defs>
      <pattern id="court-wood-pattern" patternUnits="userSpaceOnUse" width="28" height="28">
        <rect width="28" height="28" fill="var(--court-wood-base)" />
        <path d="M3 2v10 M8 6v14 M14 1v9 M20 8v16 M25 3v11" stroke="var(--court-wood-line)" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
      </pattern>
    </defs>
  );
}

function BasketEnd({
  centerX,
  topY,
  flip = false,
}: {
  centerX: number;
  topY: number;
  flip?: boolean;
}) {
  const direction = flip ? -1 : 1;
  const laneLeft = centerX - courtLayout.laneWidth / 2;
  const laneTop = flip ? topY - courtLayout.laneDepth : topY;
  const laneBottom = flip ? topY : topY + courtLayout.laneDepth;
  const hoopY = topY + direction * courtLayout.backboardOffset;
  const boardY = topY + direction * courtLayout.backboardOffset * 0.55;
  const arcSweep = flip ? 1 : 0;

  return (
    <g>
      <rect
        x={laneLeft}
        y={laneTop}
        width={courtLayout.laneWidth}
        height={courtLayout.laneDepth}
        fill="var(--court-paint-fill)"
        stroke="var(--court-paint-line)"
        strokeWidth={courtLayout.lineWidth}
      />
      <path
        d={`M ${centerX - courtLayout.freeThrowRadius} ${laneBottom} A ${courtLayout.freeThrowRadius} ${courtLayout.freeThrowRadius} 0 0 ${arcSweep} ${centerX + courtLayout.freeThrowRadius} ${laneBottom}`}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth="2"
        strokeDasharray="7 6"
      />
      <line
        x1={centerX - courtLayout.backboardWidth / 2}
        y1={boardY}
        x2={centerX + courtLayout.backboardWidth / 2}
        y2={boardY}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <circle cx={centerX} cy={hoopY} r={courtLayout.hoopRadius} fill="none" stroke="var(--court-marking)" strokeWidth="2.5" />
      <path
        d={`M ${centerX - courtLayout.restrictedRadius} ${hoopY} A ${courtLayout.restrictedRadius} ${courtLayout.restrictedRadius} 0 0 ${arcSweep} ${centerX + courtLayout.restrictedRadius} ${hoopY}`}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth="2.5"
      />
      {[-30, -15, 0, 15, 30].map((offset) => (
        <line
          key={offset}
          x1={centerX - courtLayout.laneWidth / 2 + (offset < 0 ? 10 : courtLayout.laneWidth - 10)}
          y1={topY + direction * (28 + Math.abs(offset) * 0.7)}
          x2={centerX - courtLayout.laneWidth / 2 + (offset < 0 ? 20 : courtLayout.laneWidth - 20)}
          y2={topY + direction * (28 + Math.abs(offset) * 0.7)}
          stroke="var(--court-marking)"
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

function HalfCourtShape() {
  const top = 18;
  const bottom = boardHeight - 18;
  const left = 18;
  const right = boardWidth - 18;
  const centerX = boardWidth / 2;
  const baselineY = top + 18;
  const threeCenterY = baselineY + 92;
  const arcRadius = 188;

  return (
    <>
      <rect x={left} y={top} width={right - left} height={bottom - top} fill="url(#court-wood-pattern)" stroke="var(--court-marking)" strokeWidth="2.5" />
      <BasketEnd centerX={centerX} topY={baselineY} />
      <path d={`M ${centerX - arcRadius} ${threeCenterY} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + arcRadius} ${threeCenterY}`} fill="none" stroke="var(--court-marking)" strokeWidth="2.5" />
      <line x1={left} y1={baselineY + 2} x2={left + courtLayout.sidelineMarkLength} y2={baselineY + 2} stroke="var(--court-marking)" strokeWidth="2.5" />
      <line x1={right - courtLayout.sidelineMarkLength} y1={baselineY + 2} x2={right} y2={baselineY + 2} stroke="var(--court-marking)" strokeWidth="2.5" />
    </>
  );
}

function FullCourtShape() {
  const top = 12;
  const bottom = boardHeight - 12;
  const left = 18;
  const right = boardWidth - 18;
  const centerX = boardWidth / 2;
  const centerY = boardHeight / 2;
  const topBaseline = top + 14;
  const bottomBaseline = bottom - 14;
  const arcRadius = 178;

  return (
    <>
      <rect x={left} y={top} width={right - left} height={bottom - top} fill="url(#court-wood-pattern)" stroke="var(--court-marking)" strokeWidth="2.5" />
      <BasketEnd centerX={centerX} topY={topBaseline} />
      <BasketEnd centerX={centerX} topY={bottomBaseline} flip />
      <line x1={left} y1={centerY} x2={right} y2={centerY} stroke="var(--court-marking)" strokeWidth="2.5" />
      <circle cx={centerX} cy={centerY} r={courtLayout.centerRadiusOuter} fill="var(--court-paint-fill)" stroke="var(--court-marking)" strokeWidth="2.5" />
      <circle cx={centerX} cy={centerY} r={courtLayout.centerRadiusInner} fill="var(--court-board-bg)" stroke="var(--court-marking)" strokeWidth="2" />
      <path d={`M ${centerX - arcRadius} ${topBaseline + 94} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + arcRadius} ${topBaseline + 94}`} fill="none" stroke="var(--court-marking)" strokeWidth="2.5" />
      <path d={`M ${centerX - arcRadius} ${bottomBaseline - 94} A ${arcRadius} ${arcRadius} 0 0 0 ${centerX + arcRadius} ${bottomBaseline - 94}`} fill="none" stroke="var(--court-marking)" strokeWidth="2.5" />
      <line x1={left} y1={topBaseline + 4} x2={left + courtLayout.sidelineMarkLength} y2={topBaseline + 4} stroke="var(--court-marking)" strokeWidth="2.5" />
      <line x1={right - courtLayout.sidelineMarkLength} y1={topBaseline + 4} x2={right} y2={topBaseline + 4} stroke="var(--court-marking)" strokeWidth="2.5" />
      <line x1={left} y1={bottomBaseline - 4} x2={left + courtLayout.sidelineMarkLength} y2={bottomBaseline - 4} stroke="var(--court-marking)" strokeWidth="2.5" />
      <line x1={right - courtLayout.sidelineMarkLength} y1={bottomBaseline - 4} x2={right} y2={bottomBaseline - 4} stroke="var(--court-marking)" strokeWidth="2.5" />
    </>
  );
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
  const [history, setHistory] = useState<DiagramPayload[]>([]);
  const [future, setFuture] = useState<DiagramPayload[]>([]);
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [activeItemColor, setActiveItemColor] = useState<DiagramColor>("blue");
  const [draftArrow, setDraftArrow] = useState<DraftArrow | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragLastPoint, setDragLastPoint] = useState<Point | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const activeSlide = useMemo(
    () => diagram.slides.find((slide) => slide.id === diagram.activeSlideId) ?? diagram.slides[0],
    [diagram],
  );

  const activeObject = useMemo(
    () => activeSlide?.objects.find((item) => item.id === activeObjectId) ?? null,
    [activeObjectId, activeSlide],
  );

  function commitDiagram(update: (current: DiagramPayload) => DiagramPayload) {
    setDiagram((current) => {
      const next = update(current);
      setHistory((previous) => [...previous, current]);
      setFuture([]);
      return next;
    });
  }

  function setActiveSlideObjects(update: (current: DiagramObject[]) => DiagramObject[]) {
    if (!activeSlide) return;

    commitDiagram((current) => ({
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
        color: activeItemColor,
      };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
      return;
    }

    if (tool === "cone") {
      const next: Extract<DiagramObject, { type: "cone" }> = {
        id: uid(),
        type: "cone",
        x: point.x,
        y: point.y,
        color: activeItemColor,
      };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
      return;
    }

    if (tool === "ball") {
      const next: Extract<DiagramObject, { type: "ball" }> = {
        id: uid(),
        type: "ball",
        x: point.x,
        y: point.y,
        color: activeItemColor,
      };
      setActiveSlideObjects((current) => [...current, next]);
      setActiveObjectId(next.id);
      return;
    }

    if (tool === "text") {
      const next: Extract<DiagramObject, { type: "text" }> = {
        id: uid(),
        type: "text",
        x: point.x,
        y: point.y,
        text: "Note",
        color: activeItemColor,
      };
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
      setDraftArrow(createArrow(point, point, "straight", activeItemColor));
      setActiveObjectId(null);
      return;
    }

    if (tool === "curvedArrow") {
      setDraftArrow(createArrow(point, point, "curved", activeItemColor));
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
      setDraftArrow((current) =>
        current ? createArrow({ x: current.x1, y: current.y1 }, point, current.style, current.color) : null,
      );
      return;
    }

    if (draggingId && dragLastPoint) {
      const dx = point.x - dragLastPoint.x;
      const dy = point.y - dragLastPoint.y;
      setActiveSlideObjects((current) =>
        current.map((item) => (item.id === draggingId ? moveObjectByDelta(item, dx, dy) : item)),
      );
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

  function updateActiveObjectColor(color: DiagramColor) {
    if (!activeObject || activeObject.type === "path") return;

    setActiveSlideObjects((current) =>
      current.map((item) => (item.id === activeObject.id && "color" in item ? { ...item, color } : item)),
    );
  }

  function updateSlideName(value: string) {
    if (!activeSlide) return;
    commitDiagram((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === activeSlide.id ? { ...slide, name: value } : slide)),
    }));
  }

  function updateCourtType(courtType: DiagramSlide["courtType"]) {
    if (!activeSlide) return;
    commitDiagram((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === activeSlide.id ? { ...slide, courtType } : slide)),
    }));
  }

  function addSlide(courtType: DiagramSlide["courtType"]) {
    const next = createEmptySlide(courtType, `Slide ${diagram.slides.length + 1}`);
    commitDiagram((current) => ({
      activeSlideId: next.id,
      slides: [...current.slides, next],
    }));
    setActiveObjectId(null);
  }

  function duplicateActiveSlide() {
    if (!activeSlide) return;

    const next: DiagramSlide = {
      ...activeSlide,
      id: uid(),
      name: `${activeSlide.name} copy`,
      objects: activeSlide.objects.map((item) => ({ ...item, id: uid() })),
    };

    commitDiagram((current) => ({
      activeSlideId: next.id,
      slides: [...current.slides, next],
    }));
    setActiveObjectId(null);
  }

  function deleteActiveSlide() {
    if (diagram.slides.length <= 1 || !activeSlide) return;

    const remaining = diagram.slides.filter((slide) => slide.id !== activeSlide.id);
    commitDiagram(() => ({
      activeSlideId: remaining[0].id,
      slides: remaining,
    }));
    setActiveObjectId(null);
  }

  function deleteActiveObject() {
    if (!activeObjectId) return;
    setActiveSlideObjects((current) => current.filter((item) => item.id !== activeObjectId));
    setActiveObjectId(null);
  }

  function duplicateActiveObject() {
    if (!activeObject) return;

    const offset = 28;
    let next: DiagramObject;

    if (activeObject.type === "player" || activeObject.type === "cone" || activeObject.type === "ball" || activeObject.type === "text") {
      next = { ...activeObject, id: uid(), x: activeObject.x + offset, y: activeObject.y + offset };
    } else if (activeObject.type === "arrow") {
      next = {
        ...activeObject,
        id: uid(),
        x1: activeObject.x1 + offset,
        y1: activeObject.y1 + offset,
        x2: activeObject.x2 + offset,
        y2: activeObject.y2 + offset,
        cx: typeof activeObject.cx === "number" ? activeObject.cx + offset : activeObject.cx,
        cy: typeof activeObject.cy === "number" ? activeObject.cy + offset : activeObject.cy,
      };
    } else {
      next = activeObject;
    }

    setActiveSlideObjects((current) => [...current, next]);
    setActiveObjectId(next.id);
  }

  function undo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [diagram, ...current]);
    setDiagram(previous);
    setActiveObjectId(null);
  }

  function redo() {
    if (future.length === 0) return;
    const [next, ...rest] = future;
    setHistory((current) => [...current, diagram]);
    setFuture(rest);
    setDiagram(next);
    setActiveObjectId(null);
  }

  async function saveDiagram() {
    setIsSaving(true);
    setSaveMessage(null);

    const response = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drillId,
        diagram,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      setSaveMessage("Save failed. Please try again.");
      return;
    }

    setSaveMessage("Diagram saved.");
  }

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || target.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;

      if (key === "delete" || key === "backspace") {
        if (activeObjectId) {
          event.preventDefault();
          deleteActiveObject();
        }
        return;
      }

      if (!modifier) return;

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeObjectId, history.length, future.length, diagram]);

  if (!activeSlide) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-[252px,1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-3">
        <div className="grid gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Diagram tools</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["select", "Select"],
                  ["player", "Player"],
                  ["cone", "Cone"],
                  ["ball", "Ball"],
                  ["straightArrow", "Straight"],
                  ["curvedArrow", "Curved"],
                  ["text", "Text"],
                ] as Array<[Tool, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTool(value)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium ${tool === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Item color</p>
              <span className="text-xs text-slate-500">All items</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {diagramColors.map((color) => {
                const style = getColorStyle(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setActiveItemColor(color);
                      updateActiveObjectColor(color);
                    }}
                    className={`h-8 w-8 rounded-full border-2 ${activeItemColor === color ? "border-slate-900" : "border-slate-200"}`}
                    style={{ backgroundColor: style.fill }}
                    title={color}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">History</p>
                <div className="flex gap-2">
                  <button type="button" onClick={undo} disabled={history.length === 0} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-40">
                    Undo
                  </button>
                  <button type="button" onClick={redo} disabled={future.length === 0} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-40">
                    Redo
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">Slides</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={duplicateActiveSlide} className="text-xs font-semibold text-slate-700">
                    Duplicate
                  </button>
                  {diagram.slides.length > 1 && (
                    <button type="button" onClick={deleteActiveSlide} className="text-xs font-semibold text-red-600">
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {diagram.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => {
                      setDiagram((current) => ({ ...current, activeSlideId: slide.id }));
                      setActiveObjectId(null);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-medium ${slide.id === activeSlide.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    {slide.name || `Slide ${index + 1}`}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => addSlide("half_court")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  + Half
                </button>
                <button type="button" onClick={() => addSlide("full_court")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  + Full
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-800">Selected slide</p>
            <input
              value={activeSlide.name}
              onChange={(event) => updateSlideName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              {(["half_court", "full_court"] as const).map((courtType) => (
                <button
                  key={courtType}
                  type="button"
                  onClick={() => updateCourtType(courtType)}
                  className={`rounded-lg px-3 py-2 text-xs ${activeSlide.courtType === courtType ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                >
                  {courtType === "half_court" ? "Half court" : "Full court"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-800">Selected item</p>
            {!activeObject && <p className="mt-2 text-sm text-slate-500">Nothing selected.</p>}
            {activeObject?.type === "player" && (
              <input value={activeObject.label} onChange={(event) => updateActiveLabel(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            )}
            {activeObject?.type === "text" && (
              <input value={activeObject.text} onChange={(event) => updateActiveLabel(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            )}
            {activeObject && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={duplicateActiveObject} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">
                  Duplicate
                </button>
                <button type="button" onClick={deleteActiveObject} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700">
                  Delete
                </button>
              </div>
            )}
          </div>

          <button type="button" disabled={isSaving} onClick={saveDiagram} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
            {isSaving ? "Saving..." : "Save drill diagram"}
          </button>
          {saveMessage ? <p className="text-sm text-slate-600">{saveMessage}</p> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          className="w-full rounded-2xl bg-[var(--court-board-bg)]"
          onMouseDown={onBoardMouseDown}
          onMouseMove={onBoardMouseMove}
          onMouseUp={onBoardMouseUp}
          onMouseLeave={onBoardMouseUp}
        >
          <CourtDefs />
          {activeSlide.courtType === "full_court" ? <FullCourtShape /> : <HalfCourtShape />}

          {activeSlide.objects.map((item) => {
            if (item.type === "player") {
              const style = getColorStyle(item.color);
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
                  <text x={item.x} y={item.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={style.text}>
                    {item.label}
                  </text>
                </g>
              );
            }

            if (item.type === "cone") {
              const style = getColorStyle(item.color);
              return (
                <path
                  key={item.id}
                  d={`M ${item.x} ${item.y - 16} L ${item.x - 14} ${item.y + 16} L ${item.x + 14} ${item.y + 16} Z`}
                  fill={item.id === activeObjectId ? "#fb923c" : style.fill}
                  stroke={style.stroke}
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
              const style = getColorStyle(item.color);
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
                  <circle cx={item.x} cy={item.y} r="14" fill={style.fill} stroke={item.id === activeObjectId ? "#7c2d12" : style.stroke} strokeWidth="2" />
                  <path d={`M ${item.x - 14} ${item.y} Q ${item.x} ${item.y - 6} ${item.x + 14} ${item.y}`} fill="none" stroke={style.stroke} strokeWidth="1.5" />
                  <path d={`M ${item.x} ${item.y - 14} Q ${item.x - 5} ${item.y} ${item.x} ${item.y + 14}`} fill="none" stroke={style.stroke} strokeWidth="1.5" />
                </g>
              );
            }

            if (item.type === "arrow") {
              const stroke = item.id === activeObjectId ? "#ea580c" : getColorStyle(item.color).fill;
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
                  <path d={getArrowPath(item)} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <polygon points={getArrowHeadPolygon(item)} fill={stroke} />
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
                  fill={item.id === activeObjectId ? "#c2410c" : getColorStyle(item.color).fill}
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
            <>
              <path
                d={getArrowPath(draftArrow)}
                fill="none"
                stroke="#ea580c"
                strokeWidth="4"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points={getArrowHeadPolygon(draftArrow)} fill="#ea580c" />
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
