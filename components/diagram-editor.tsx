"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleDot, ClipboardList, Cone, MoveRight, PenLine, Play, Redo2, Save, Spline, StickyNote, Undo2, Users } from "lucide-react";
import type { DiagramColor, DiagramObject, DiagramPayload, DiagramSlide } from "@/lib/types";
import { createEmptySlide } from "@/lib/diagram";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Tool = "select" | "player" | "cone" | "ball" | "straightArrow" | "curvedArrow" | "text";
type PanelTab = "phases" | "objects";
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

function ToolButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-[#0c9d8d]" : "bg-white/12 text-white hover:bg-white/18"
      }`}
    >
      {icon}
      {label}
    </button>
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
  const [panelTab, setPanelTab] = useState<PanelTab>("phases");
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
  const [textTemplate, setTextTemplate] = useState("Note");

  const activeSlide = useMemo(
    () => diagram.slides.find((slide) => slide.id === diagram.activeSlideId) ?? diagram.slides[0],
    [diagram],
  );

  const activeObject = useMemo(
    () => activeSlide?.objects.find((item) => item.id === activeObjectId) ?? null,
    [activeObjectId, activeSlide],
  );

  const objectSummary = useMemo(() => {
    const objects = activeSlide?.objects ?? [];
    return {
      players: objects.filter((item) => item.type === "player").length,
      arrows: objects.filter((item) => item.type === "arrow").length,
      cones: objects.filter((item) => item.type === "cone").length,
      balls: objects.filter((item) => item.type === "ball").length,
      notes: objects.filter((item) => item.type === "text").length,
    };
  }, [activeSlide]);

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

  function getPresetPoint(index: number) {
    const halfCourtPresets: Point[] = [
      { x: 260, y: 285 },
      { x: 340, y: 255 },
      { x: 440, y: 255 },
      { x: 520, y: 285 },
      { x: 390, y: 330 },
      { x: 610, y: 300 },
    ];
    const fullCourtPresets: Point[] = [
      { x: 240, y: 280 },
      { x: 320, y: 220 },
      { x: 460, y: 220 },
      { x: 540, y: 280 },
      { x: 390, y: 340 },
      { x: 390, y: 120 },
    ];
    const presets = activeSlide?.courtType === "full_court" ? fullCourtPresets : halfCourtPresets;
    return presets[index % presets.length];
  }

  function placeLabeledPlayer(label: string, color: DiagramColor) {
    const playerCount = activeSlide?.objects.filter((item) => item.type === "player").length ?? 0;
    const point = getPresetPoint(playerCount);
    const next: Extract<DiagramObject, { type: "player" }> = {
      id: uid(),
      type: "player",
      x: point.x,
      y: point.y,
      label,
      color,
    };
    setActiveSlideObjects((current) => [...current, next]);
    setActiveObjectId(next.id);
    setTool("select");
  }

  function placePresetObject(type: "ball" | "cone") {
    const count = activeSlide?.objects.length ?? 0;
    const point = getPresetPoint(count + 1);
    const next =
      type === "ball"
        ? ({
            id: uid(),
            type: "ball",
            x: point.x,
            y: point.y,
            color: activeItemColor,
          } as Extract<DiagramObject, { type: "ball" }>)
        : ({
            id: uid(),
            type: "cone",
            x: point.x,
            y: point.y,
            color: activeItemColor,
          } as Extract<DiagramObject, { type: "cone" }>);
    setActiveSlideObjects((current) => [...current, next]);
    setActiveObjectId(next.id);
    setTool("select");
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
        text: textTemplate,
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
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 bg-[#0c9d8d] px-4 py-3 text-white">
        <button type="button" className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold">
          Close
        </button>
        <div className="hidden items-center gap-2 md:flex">
          <ToolButton active label="Draw" onClick={() => setPanelTab("phases")} icon={<PenLine size={15} />} />
          <ToolButton active={false} label="Animate" onClick={() => {}} icon={<Play size={15} />} />
          <ToolButton active={false} label="Notes" onClick={() => {}} icon={<StickyNote size={15} />} />
          <ToolButton active={false} label="Output" onClick={() => {}} icon={<ClipboardList size={15} />} />
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={activeSlide.name}
            onChange={(event) => updateSlideName(event.target.value)}
            className="w-full rounded-xl bg-white/12 px-4 py-2 text-center text-2xl font-bold text-white outline-none placeholder:text-white/60"
            placeholder="Untitled Play"
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={undo} disabled={history.length === 0} className="rounded-xl border border-white/25 p-2 disabled:opacity-40">
            <Undo2 size={18} />
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0} className="rounded-xl border border-white/25 p-2 disabled:opacity-40">
            <Redo2 size={18} />
          </button>
          <button type="button" onClick={saveDiagram} disabled={isSaving} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60">
            <span className="inline-flex items-center gap-2">
              <Save size={15} />
              {isSaving ? "Saving..." : "Save Play"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid min-h-[720px] xl:grid-cols-[220px,minmax(0,1fr),340px]">
        <aside className="border-r border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setPanelTab("phases")}
              className={`flex-1 px-4 py-4 text-sm font-semibold ${panelTab === "phases" ? "border-b-2 border-[#0c9d8d] text-slate-900" : "text-slate-500"}`}
            >
              Phases
            </button>
            <button
              type="button"
              onClick={() => setPanelTab("objects")}
              className={`flex-1 px-4 py-4 text-sm font-semibold ${panelTab === "objects" ? "border-b-2 border-[#0c9d8d] text-slate-900" : "text-slate-500"}`}
            >
              Objects
            </button>
          </div>

          {panelTab === "phases" ? (
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Phase {diagram.slides.findIndex((slide) => slide.id === activeSlide.id) + 1}/{diagram.slides.length}
              </p>
              <div className="mt-4 flex gap-3 text-xs font-semibold text-slate-600">
                <button type="button" onClick={() => addSlide(activeSlide.courtType)}>Next</button>
                <button type="button" onClick={duplicateActiveSlide}>Clone</button>
                {diagram.slides.length > 1 ? <button type="button" onClick={deleteActiveSlide}>Delete</button> : null}
              </div>
              <div className="mt-5 space-y-3">
                {diagram.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => {
                      setDiagram((current) => ({ ...current, activeSlideId: slide.id }));
                      setActiveObjectId(null);
                    }}
                    className={`w-full rounded-2xl border p-2 text-left transition ${slide.id === activeSlide.id ? "border-[#1d8fff] shadow-[inset_0_0_0_2px_#1d8fff]" : "border-slate-200"}`}
                  >
                    <div className="rounded-xl bg-[var(--court-board-bg)] p-2">
                      <svg viewBox={`0 0 ${boardWidth} ${boardHeight}`} className="w-full rounded-lg">
                        <CourtDefs />
                        {slide.courtType === "full_court" ? <FullCourtShape /> : <HalfCourtShape />}
                      </svg>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1 text-xs font-semibold text-slate-700">
                      <span>{slide.name || `Phase ${index + 1}`}</span>
                      <span className="text-slate-400">{slide.courtType === "full_court" ? "Full" : "Half"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-5 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Players:</span> {objectSummary.players}</div>
              <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Actions:</span> {objectSummary.arrows}</div>
              <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Cones:</span> {objectSummary.cones}</div>
              <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Balls:</span> {objectSummary.balls}</div>
              <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Notes:</span> {objectSummary.notes}</div>
            </div>
          )}
        </aside>

        <div className="bg-slate-100/70 p-6">
          <div className="mx-auto max-w-[920px] rounded-[2rem] bg-[#eef1f5] p-6">
            <div className="rounded-[1.8rem] bg-[var(--court-board-bg)] p-6 shadow-inner">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${boardWidth} ${boardHeight}`}
                className="w-full rounded-[1.5rem] bg-[var(--court-board-bg)]"
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
                          startDragging(item.id, pointFromMouse(event));
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
                          startDragging(item.id, pointFromMouse(event));
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
                          startDragging(item.id, pointFromMouse(event));
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
                          startDragging(item.id, pointFromMouse(event));
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
                          startDragging(item.id, pointFromMouse(event));
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
        </div>

        <aside className="border-l border-slate-200 bg-white p-6">
          <div className="space-y-8">
            <section>
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-800">Add Actions</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setTool("curvedArrow"); setActiveItemColor("yellow"); }} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">Dribble</button>
                <button type="button" onClick={() => { setTool("straightArrow"); setActiveItemColor("white"); }} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">Pass</button>
                <button type="button" onClick={() => { setTool("straightArrow"); setActiveItemColor("green"); }} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">Cut</button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("SCREEN"); setActiveItemColor("blue"); }} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">Screen</button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("SHOT"); setActiveItemColor("red"); }} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">Shot</button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("HO"); setActiveItemColor("green"); }} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">Handoff</button>
              </div>
            </section>

            <section>
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-800">Add Players</p>
              <div className="mt-4 grid grid-cols-6 gap-3">
                {["1", "2", "3", "4", "5", "?"].map((label) => (
                  <button key={label} type="button" onClick={() => placeLabeledPlayer(label, "white")} className="aspect-square rounded-full border-2 border-slate-500 text-sm font-bold text-slate-800">
                    {label}
                  </button>
                ))}
                {["X1", "X2", "X3", "X4", "X5", "X?"].map((label) => (
                  <button key={label} type="button" onClick={() => placeLabeledPlayer(label, "blue")} className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-3 text-sm font-semibold text-slate-700">
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-800">Add Misc</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                <button type="button" onClick={() => placePresetObject("ball")} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><CircleDot size={18} /></button>
                <button type="button" onClick={() => placePresetObject("cone")} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><Cone size={18} /></button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("Note"); }} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><StickyNote size={18} /></button>
                <button type="button" onClick={() => setTool("select")} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><Users size={18} /></button>
                <button type="button" onClick={() => { setTool("straightArrow"); setActiveItemColor("white"); }} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><MoveRight size={18} /></button>
                <button type="button" onClick={() => { setTool("curvedArrow"); setActiveItemColor("yellow"); }} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><Spline size={18} /></button>
                <button type="button" onClick={() => setTool("player")} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><PenLine size={18} /></button>
                <button type="button" onClick={() => setPanelTab("objects")} className="flex aspect-square items-center justify-center rounded-xl border border-slate-300 text-slate-700"><ClipboardList size={18} /></button>
              </div>
            </section>

            <section>
              <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-800">Selected Item</p>
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                {!activeObject ? <p className="text-sm text-slate-500">Select an item on the board.</p> : null}
                {activeObject?.type === "player" ? (
                  <input value={activeObject.label} onChange={(event) => updateActiveLabel(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                ) : null}
                {activeObject?.type === "text" ? (
                  <input value={activeObject.text} onChange={(event) => updateActiveLabel(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                ) : null}
                <div className="flex flex-wrap gap-2">
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
                      />
                    );
                  })}
                </div>
                {activeObject ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={duplicateActiveObject} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Clone</button>
                    <button type="button" onClick={deleteActiveObject} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Delete</button>
                  </div>
                ) : null}
                {saveMessage ? <p className="text-sm text-slate-500">{saveMessage}</p> : null}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
