"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleDot, ClipboardList, Cone, Diamond, HelpCircle, Image as ImageIcon, MonitorPlay, MoreHorizontal, MoveRight, PenLine, Play, RectangleHorizontal, Redo2, Save, SlidersHorizontal, Spline, Square, StickyNote, Triangle, Undo2, Users, X } from "lucide-react";
import type { DiagramColor, DiagramObject, DiagramPayload, DiagramSlide } from "@/lib/types";
import { createEmptySlide } from "@/lib/diagram";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Tool = "select" | "player" | "cone" | "ball" | "straightArrow" | "curvedArrow" | "text";
type PanelTab = "phases" | "objects";
type Point = { x: number; y: number };
type DraftArrow = Extract<DiagramObject, { type: "arrow" }>;

const boardWidth = 520;
const boardHeight = 920;
const courtLayout = {
  insetX: 60,
  insetY: 42,
  lineWidth: 2.5,
  courtWidthM: 15,
  fullCourtLengthM: 28,
  halfCourtLengthM: 14,
  centerCircleRadiusM: 1.8,
  keyHalfWidthM: 2.45,
  freeThrowCircleRadiusM: 1.8,
  freeThrowLineDistanceM: 5.8,
  hoopCenterFromBaselineM: 1.575,
  hoopRadiusM: 0.225,
  backboardWidthM: 1.8,
  backboardFromBaselineM: 1.2,
  restrictedRadiusM: 1.25,
  restrictedStubM: 0.375,
  threePointRadiusM: 6.75,
  threePointSideOffsetM: 0.9,
  laneMarkDistancesM: [1.75, 2.6, 3.45, 4.3],
  throwInMarkDistanceM: 8.325,
  throwInMarkLengthPx: 18,
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
      <pattern id="court-wood-pattern" patternUnits="userSpaceOnUse" width="32" height="32">
        <rect width="32" height="32" fill="var(--court-wood-base)" />
        <path d="M4 2v12 M10 6v18 M16 1v11 M23 7v19 M29 4v13" stroke="var(--court-wood-line)" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
      </pattern>
    </defs>
  );
}

type BasketOrientation = "top" | "bottom";

type CourtModel = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  xScale: number;
  yScale: number;
  circleScale: number;
  mapX: (meters: number) => number;
  mapY: (meters: number) => number;
};

function getHalfArcPath(centerX: number, centerY: number, radiusX: number, radiusY: number, sweepFlag: 0 | 1) {
  return `M ${centerX - radiusX} ${centerY} A ${radiusX} ${radiusY} 0 0 ${sweepFlag} ${centerX + radiusX} ${centerY}`;
}

function getArcBetweenPoints(
  centerX: number,
  centerY: number,
  radius: number,
  startX: number,
  endX: number,
  orientation: BasketOrientation,
) {
  const dx = Math.abs(startX - centerX);
  const dy = Math.sqrt(Math.max(0, radius * radius - dx * dx));
  const y = orientation === "top" ? centerY + dy : centerY - dy;
  const sweepFlag: 0 | 1 = orientation === "top" ? 1 : 0;
  return `M ${startX} ${y} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${y}`;
}

function createFullCourtModel(): CourtModel {
  const width = boardWidth - courtLayout.insetX * 2;
  const xScale = width / courtLayout.courtWidthM;
  const yScale = xScale;
  const height = courtLayout.fullCourtLengthM * yScale;
  const left = courtLayout.insetX;
  const top = (boardHeight - height) / 2;

  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
    xScale,
    yScale,
    circleScale: xScale,
    mapX: (meters) => left + meters * xScale,
    mapY: (meters) => top + meters * yScale,
  };
}

function createHalfCourtModel(): CourtModel {
  const left = courtLayout.insetX;
  const top = courtLayout.insetY;
  const width = boardWidth - courtLayout.insetX * 2;
  const height = boardHeight - courtLayout.insetY * 2;
  const xScale = width / courtLayout.courtWidthM;
  const yScale = height / courtLayout.halfCourtLengthM;

  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
    xScale,
    yScale,
    circleScale: xScale,
    mapX: (meters) => left + meters * xScale,
    mapY: (meters) => top + meters * yScale,
  };
}

function CourtSurface({ model }: { model: CourtModel }) {
  return (
    <rect
      x={model.left}
      y={model.top}
      width={model.width}
      height={model.height}
      fill="url(#court-wood-pattern)"
      stroke="var(--court-marking)"
      strokeWidth={courtLayout.lineWidth}
    />
  );
}

function BasketEnd({
  model,
  baselineMeters,
  orientation,
}: {
  model: CourtModel;
  baselineMeters: number;
  orientation: BasketOrientation;
}) {
  const direction = orientation === "top" ? 1 : -1;
  const centerX = model.mapX(courtLayout.courtWidthM / 2);
  const laneLeft = model.mapX(courtLayout.courtWidthM / 2 - courtLayout.keyHalfWidthM);
  const laneRight = model.mapX(courtLayout.courtWidthM / 2 + courtLayout.keyHalfWidthM);
  const baselineY = model.mapY(baselineMeters);
  const hoopY = model.mapY(baselineMeters + direction * courtLayout.hoopCenterFromBaselineM);
  const backboardY = model.mapY(baselineMeters + direction * courtLayout.backboardFromBaselineM);
  const freeThrowY = model.mapY(baselineMeters + direction * courtLayout.freeThrowLineDistanceM);
  const threePointBreakOffsetM = Math.sqrt(
    Math.max(
      0,
      courtLayout.threePointRadiusM ** 2 - (courtLayout.courtWidthM / 2 - courtLayout.threePointSideOffsetM) ** 2,
    ),
  );
  const threeLeftX = model.mapX(courtLayout.threePointSideOffsetM);
  const threeRightX = model.mapX(courtLayout.courtWidthM - courtLayout.threePointSideOffsetM);
  const threeBreakY = model.mapY(baselineMeters + direction * (courtLayout.hoopCenterFromBaselineM + threePointBreakOffsetM));
  const courtSweep: 0 | 1 = orientation === "top" ? 1 : 0;
  const basketSweep: 0 | 1 = orientation === "top" ? 0 : 1;
  const keyTop = Math.min(baselineY, freeThrowY);
  const keyHeight = Math.abs(freeThrowY - baselineY);
  const laneMarkLength = 10;
  const circleRadius = model.circleScale;
  const restrictedStubY = model.mapY(
    baselineMeters + direction * (courtLayout.hoopCenterFromBaselineM + courtLayout.restrictedStubM),
  );

  return (
    <g>
      <rect
        x={laneLeft}
        y={keyTop}
        width={laneRight - laneLeft}
        height={keyHeight}
        fill="var(--court-paint-fill)"
        stroke="var(--court-paint-line)"
        strokeWidth={courtLayout.lineWidth}
      />
      <path
        d={getHalfArcPath(
          centerX,
          freeThrowY,
          courtLayout.freeThrowCircleRadiusM * circleRadius,
          courtLayout.freeThrowCircleRadiusM * circleRadius,
          courtSweep,
        )}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <path
        d={getHalfArcPath(
          centerX,
          freeThrowY,
          courtLayout.freeThrowCircleRadiusM * circleRadius,
          courtLayout.freeThrowCircleRadiusM * circleRadius,
          basketSweep,
        )}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth="2"
        strokeDasharray="8 8"
      />
      <line
        x1={centerX - (courtLayout.backboardWidthM * model.xScale) / 2}
        y1={backboardY}
        x2={centerX + (courtLayout.backboardWidthM * model.xScale) / 2}
        y2={backboardY}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <ellipse
        cx={centerX}
        cy={hoopY}
        rx={courtLayout.hoopRadiusM * circleRadius}
        ry={courtLayout.hoopRadiusM * circleRadius}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line
        x1={centerX - courtLayout.restrictedRadiusM * circleRadius}
        y1={hoopY}
        x2={centerX - courtLayout.restrictedRadiusM * circleRadius}
        y2={restrictedStubY}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line
        x1={centerX + courtLayout.restrictedRadiusM * circleRadius}
        y1={hoopY}
        x2={centerX + courtLayout.restrictedRadiusM * circleRadius}
        y2={restrictedStubY}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <path
        d={getHalfArcPath(
          centerX,
          hoopY,
          courtLayout.restrictedRadiusM * circleRadius,
          courtLayout.restrictedRadiusM * circleRadius,
          courtSweep,
        )}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line x1={threeLeftX} y1={baselineY} x2={threeLeftX} y2={threeBreakY} stroke="var(--court-marking)" strokeWidth={courtLayout.lineWidth} />
      <line x1={threeRightX} y1={baselineY} x2={threeRightX} y2={threeBreakY} stroke="var(--court-marking)" strokeWidth={courtLayout.lineWidth} />
      <path
        d={getArcBetweenPoints(
          centerX,
          hoopY,
          courtLayout.threePointRadiusM * circleRadius,
          threeLeftX,
          threeRightX,
          orientation,
        )}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      {courtLayout.laneMarkDistancesM.map((distance) => {
        const y = model.mapY(baselineMeters + direction * distance);
        return (
          <g key={distance}>
            <line x1={laneLeft - laneMarkLength} y1={y} x2={laneLeft} y2={y} stroke="var(--court-marking)" strokeWidth="2" />
            <line x1={laneRight} y1={y} x2={laneRight + laneMarkLength} y2={y} stroke="var(--court-marking)" strokeWidth="2" />
          </g>
        );
      })}
    </g>
  );
}

function HalfCourtShape() {
  const model = createHalfCourtModel();

  return (
    <>
      <CourtSurface model={model} />
      <line
        x1={model.left}
        y1={model.mapY(0)}
        x2={model.right}
        y2={model.mapY(0)}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <path
        d={getHalfArcPath(
          model.mapX(courtLayout.courtWidthM / 2),
          model.mapY(0),
          courtLayout.centerCircleRadiusM * model.circleScale,
          courtLayout.centerCircleRadiusM * model.circleScale,
          1,
        )}
        fill="none"
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <BasketEnd model={model} baselineMeters={courtLayout.halfCourtLengthM} orientation="bottom" />
    </>
  );
}

function FullCourtShape() {
  const model = createFullCourtModel();

  return (
    <>
      <CourtSurface model={model} />
      <BasketEnd model={model} baselineMeters={0} orientation="top" />
      <BasketEnd model={model} baselineMeters={courtLayout.fullCourtLengthM} orientation="bottom" />
      <line
        x1={model.left}
        y1={model.mapY(courtLayout.fullCourtLengthM / 2)}
        x2={model.right}
        y2={model.mapY(courtLayout.fullCourtLengthM / 2)}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <circle
        cx={model.mapX(courtLayout.courtWidthM / 2)}
        cy={model.mapY(courtLayout.fullCourtLengthM / 2)}
        r={courtLayout.centerCircleRadiusM * model.circleScale}
        fill="var(--court-paint-fill)"
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line
        x1={model.left - courtLayout.throwInMarkLengthPx}
        y1={model.mapY(courtLayout.throwInMarkDistanceM)}
        x2={model.left}
        y2={model.mapY(courtLayout.throwInMarkDistanceM)}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line
        x1={model.right}
        y1={model.mapY(courtLayout.throwInMarkDistanceM)}
        x2={model.right + courtLayout.throwInMarkLengthPx}
        y2={model.mapY(courtLayout.throwInMarkDistanceM)}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line
        x1={model.left - courtLayout.throwInMarkLengthPx}
        y1={model.mapY(courtLayout.fullCourtLengthM - courtLayout.throwInMarkDistanceM)}
        x2={model.left}
        y2={model.mapY(courtLayout.fullCourtLengthM - courtLayout.throwInMarkDistanceM)}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
      <line
        x1={model.right}
        y1={model.mapY(courtLayout.fullCourtLengthM - courtLayout.throwInMarkDistanceM)}
        x2={model.right + courtLayout.throwInMarkLengthPx}
        y2={model.mapY(courtLayout.fullCourtLengthM - courtLayout.throwInMarkDistanceM)}
        stroke="var(--court-marking)"
        strokeWidth={courtLayout.lineWidth}
      />
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
      className={`inline-flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-none px-4 py-3 text-sm font-semibold transition ${
        active ? "bg-[#cbefff] text-[#0f3566]" : "bg-transparent text-white hover:bg-white/10"
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
      { x: 260, y: 770 },
      { x: 180, y: 700 },
      { x: 340, y: 700 },
      { x: 120, y: 620 },
      { x: 400, y: 620 },
      { x: 260, y: 540 },
    ];
    const fullCourtPresets: Point[] = [
      { x: 260, y: 780 },
      { x: 180, y: 690 },
      { x: 340, y: 690 },
      { x: 140, y: 555 },
      { x: 380, y: 555 },
      { x: 260, y: 250 },
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

  function clearActiveSlide() {
    setActiveSlideObjects(() => []);
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

  function loadExamplePlay() {
    const sampleObjects: DiagramObject[] =
      activeSlide.courtType === "full_court"
        ? [
            { id: uid(), type: "player", x: 260, y: 790, label: "1", color: "white" },
            { id: uid(), type: "player", x: 180, y: 700, label: "2", color: "white" },
            { id: uid(), type: "player", x: 340, y: 700, label: "3", color: "white" },
            { id: uid(), type: "player", x: 150, y: 560, label: "4", color: "white" },
            { id: uid(), type: "player", x: 370, y: 560, label: "5", color: "white" },
            { id: uid(), type: "arrow", style: "curved", x1: 260, y1: 790, x2: 210, y2: 650, cx: 210, cy: 730, color: "yellow" },
            { id: uid(), type: "arrow", style: "straight", x1: 340, y1: 700, x2: 260, y2: 455, color: "white" },
            { id: uid(), type: "text", x: 290, y: 860, text: "Transition", color: "blue" },
          ]
        : [
            { id: uid(), type: "player", x: 260, y: 790, label: "1", color: "white" },
            { id: uid(), type: "player", x: 180, y: 700, label: "2", color: "white" },
            { id: uid(), type: "player", x: 340, y: 700, label: "3", color: "white" },
            { id: uid(), type: "player", x: 135, y: 615, label: "4", color: "white" },
            { id: uid(), type: "player", x: 385, y: 615, label: "5", color: "white" },
            { id: uid(), type: "arrow", style: "curved", x1: 260, y1: 790, x2: 195, y2: 650, cx: 210, cy: 730, color: "yellow" },
            { id: uid(), type: "arrow", style: "straight", x1: 340, y1: 700, x2: 260, y2: 510, color: "green" },
            { id: uid(), type: "cone", x: 260, y: 465, color: "red" },
          ];

    setActiveSlideObjects(() => sampleObjects);
    setActiveObjectId(null);
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
    <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-0 bg-[#109c92] px-0 py-0 text-white">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="ml-5 inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          <X size={16} />
          Close
        </button>
        <div className="ml-6 hidden items-stretch gap-0 md:flex">
          <ToolButton active label="Draw" onClick={() => setPanelTab("phases")} icon={<PenLine size={15} />} />
          <ToolButton active={false} label="Animate" onClick={() => {}} icon={<Play size={15} />} />
          <ToolButton active={false} label="Notes" onClick={() => {}} icon={<StickyNote size={15} />} />
          <ToolButton active={false} label="Output" onClick={() => {}} icon={<ClipboardList size={15} />} />
        </div>
        <div className="min-w-0 flex-1 px-6">
          <input
            value={activeSlide.name}
            onChange={(event) => updateSlideName(event.target.value)}
            className="w-full rounded-none bg-white/10 px-4 py-3 text-center text-[1.7rem] font-bold text-white outline-none placeholder:text-white/60"
            placeholder="Untitled Play"
          />
        </div>
        <div className="mr-5 flex items-center gap-3">
          <button type="button" onClick={undo} disabled={history.length === 0} className="rounded-xl border border-white/25 p-2 disabled:opacity-40">
            <Undo2 size={18} />
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0} className="rounded-xl border border-white/25 p-2 disabled:opacity-40">
            <Redo2 size={18} />
          </button>
          <button type="button" className="rounded-xl border border-white/25 p-2">
            <MoreHorizontal size={18} />
          </button>
          <button type="button" onClick={saveDiagram} disabled={isSaving} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60">
            <span className="inline-flex items-center gap-2">
              <Save size={15} />
              {isSaving ? "Saving..." : "Save Play"}
            </span>
          </button>
          <button type="button" className="rounded-xl border border-white/25 p-2">
            <HelpCircle size={18} />
          </button>
          <button type="button" className="rounded-xl border border-white/25 p-2">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="grid min-h-[820px] grid-cols-[116px_minmax(0,_1fr)_304px]">
        <aside className="border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="text-base font-medium text-slate-900">Phases</p>
          </div>

          {panelTab === "phases" ? (
            <div className="space-y-4 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Phase {diagram.slides.findIndex((slide) => slide.id === activeSlide.id) + 1}/{diagram.slides.length}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-700">
                <button type="button" onClick={() => addSlide(activeSlide.courtType)} className="rounded-lg border border-slate-200 px-2 py-2 hover:bg-slate-50">Next</button>
                <button type="button" onClick={duplicateActiveSlide} className="rounded-lg border border-slate-200 px-2 py-2 hover:bg-slate-50">Clone</button>
                <button type="button" onClick={clearActiveSlide} className="rounded-lg border border-slate-200 px-2 py-2 hover:bg-slate-50">Empty</button>
                <button
                  type="button"
                  onClick={() => updateCourtType(activeSlide.courtType === "half_court" ? "full_court" : "half_court")}
                  className="rounded-lg border border-slate-200 px-2 py-2 hover:bg-slate-50"
                >
                  {activeSlide.courtType === "half_court" ? "Full" : "Half"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateCourtType("half_court")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeSlide.courtType === "half_court" ? "bg-[#109c92] text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  Half court
                </button>
                <button
                  type="button"
                  onClick={() => updateCourtType("full_court")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeSlide.courtType === "full_court" ? "bg-[#109c92] text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  Full court
                </button>
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
                    className={`w-full rounded-xl border p-2 text-left transition ${slide.id === activeSlide.id ? "border-[#1d8fff] shadow-[inset_0_0_0_2px_#1d8fff]" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="rounded-lg bg-[#f4e3c4] p-1">
                      <svg viewBox={`0 0 ${boardWidth} ${boardHeight}`} className="h-36 w-full rounded-lg bg-[#f0d5a9]">
                        <CourtDefs />
                        {slide.courtType === "full_court" ? <FullCourtShape /> : <HalfCourtShape />}
                      </svg>
                    </div>
                    <div className="mt-1 flex items-center justify-between px-1 text-[9px] font-semibold text-slate-700">
                      <span>{slide.name || `P${index + 1}`}</span>
                      <span className="text-slate-400">{slide.courtType === "full_court" ? "Full" : "Half"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-6 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold">Objects on board</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white p-3"><span className="font-semibold">Players</span><div className="mt-1 text-lg font-bold">{objectSummary.players}</div></div>
                  <div className="rounded-xl bg-white p-3"><span className="font-semibold">Actions</span><div className="mt-1 text-lg font-bold">{objectSummary.arrows}</div></div>
                  <div className="rounded-xl bg-white p-3"><span className="font-semibold">Cones</span><div className="mt-1 text-lg font-bold">{objectSummary.cones}</div></div>
                  <div className="rounded-xl bg-white p-3"><span className="font-semibold">Notes</span><div className="mt-1 text-lg font-bold">{objectSummary.notes}</div></div>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="bg-[#eef2f7] px-6 py-6">
          <div className="mx-auto flex h-full max-w-[620px] items-center justify-center">
            <div className="w-full rounded-[1.5rem] bg-[#e8edf3] p-5">
              <div className="rounded-[1.25rem] bg-[#f0d5a9] p-4 shadow-inner">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${boardWidth} ${boardHeight}`}
                className="mx-auto aspect-[13/23] w-full max-w-[520px] rounded-[1rem] bg-[#f0d5a9]"
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
        </div>

        <aside className="border-l border-slate-200 bg-white p-6">
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-slate-800">Add Actions</p>
                <HelpCircle size={16} className="text-slate-400" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <button type="button" onClick={() => { setTool("curvedArrow"); setActiveItemColor("yellow"); }} className="inline-flex items-center justify-center rounded-xl bg-[#37465f] px-3 py-3 text-sm font-semibold text-white">Dribble</button>
                <button type="button" onClick={() => { setTool("straightArrow"); setActiveItemColor("white"); }} className="inline-flex items-center justify-center rounded-xl bg-[#37465f] px-3 py-3 text-sm font-semibold text-white">Pass</button>
                <button type="button" onClick={() => { setTool("straightArrow"); setActiveItemColor("green"); }} className="inline-flex items-center justify-center rounded-xl bg-[#37465f] px-3 py-3 text-sm font-semibold text-white">Cut</button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("SCREEN"); setActiveItemColor("blue"); }} className="inline-flex items-center justify-center rounded-xl bg-[#37465f] px-3 py-3 text-sm font-semibold text-white">Screen</button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("SHOT"); setActiveItemColor("red"); }} className="inline-flex items-center justify-center rounded-xl bg-[#37465f] px-3 py-3 text-sm font-semibold text-white">Shot</button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("HO"); setActiveItemColor("green"); }} className="inline-flex items-center justify-center rounded-xl bg-[#37465f] px-3 py-3 text-sm font-semibold text-white">Handoff</button>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-slate-800">Add Players</p>
                <HelpCircle size={16} className="text-slate-400" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-6 gap-3">
                  {["1", "2", "3", "4", "5", "?"].map((label) => (
                    <button key={label} type="button" onClick={() => placeLabeledPlayer(label, "white")} className="aspect-square rounded-full border-2 border-slate-500 bg-white text-xl font-bold text-slate-800">
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {["1", "2", "3", "4", "5", "?"].map((label) => (
                    <button key={`plain-${label}`} type="button" onClick={() => placeLabeledPlayer(label, "white")} className="rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm font-semibold text-slate-700">
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {["X1", "X2", "X3", "X4", "X5", "X?"].map((label) => (
                    <button key={label} type="button" onClick={() => placeLabeledPlayer(label, "blue")} className="rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm font-semibold text-slate-700">
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-3">
                  {["1", "2", "3", "4", "5", "?"].map((label) => (
                    <button key={`ballrow-${label}`} type="button" onClick={() => placeLabeledPlayer(label, "white")} className="rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm font-semibold text-slate-700">
                      {label}•
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-slate-800">Add Misc</p>
                <HelpCircle size={16} className="text-slate-400" />
              </div>
              <div className="mt-4 grid grid-cols-7 gap-3">
                <button type="button" onClick={() => placePresetObject("ball")} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><CircleDot size={18} /></button>
                <button type="button" onClick={() => placePresetObject("cone")} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Cone size={18} /></button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("T"); }} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><PenLine size={18} /></button>
                <button type="button" className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><RectangleHorizontal size={18} /></button>
                <button type="button" className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Circle size={18} /></button>
                <button type="button" className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Triangle size={18} /></button>
                <button type="button" className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Diamond size={18} /></button>
                <button type="button" onClick={() => { setTool("straightArrow"); setActiveItemColor("white"); }} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><MoveRight size={18} /></button>
                <button type="button" onClick={() => { setTool("curvedArrow"); setActiveItemColor("yellow"); }} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Spline size={18} /></button>
                <button type="button" onClick={() => { setTool("text"); setTextTemplate("Note"); }} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><StickyNote size={18} /></button>
                <button type="button" onClick={() => setTool("select")} className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Users size={18} /></button>
                <button type="button" className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><Square size={18} /></button>
                <button type="button" className="flex h-12 items-center justify-center rounded-lg border border-slate-300 text-slate-700"><ImageIcon size={18} /></button>
              </div>
            </section>

            <section>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-slate-800">Selected Item</p>
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                {!activeObject ? <p className="text-xs text-slate-500">Select an item on the board.</p> : null}
                {activeObject?.type === "player" ? (
                  <input value={activeObject.label} onChange={(event) => updateActiveLabel(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                ) : null}
                {activeObject?.type === "text" ? (
                  <input value={activeObject.text} onChange={(event) => updateActiveLabel(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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
                    <button type="button" onClick={duplicateActiveObject} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700">Clone</button>
                    <button type="button" onClick={deleteActiveObject} className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-700">Delete</button>
                  </div>
                ) : null}
                {saveMessage ? <p className="text-xs text-slate-500">{saveMessage}</p> : null}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-slate-800">Let's Get Started!</p>
                <HelpCircle size={16} className="text-slate-400" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" className="rounded-2xl bg-slate-100 p-5 text-center text-slate-700">
                  <MonitorPlay className="mx-auto" size={28} />
                  <div className="mt-3 text-sm font-semibold">Watch Tutorial</div>
                </button>
                <button type="button" onClick={loadExamplePlay} className="rounded-2xl bg-slate-100 p-5 text-center text-slate-700">
                  <Play className="mx-auto" size={28} />
                  <div className="mt-3 text-sm font-semibold">Load Example Play</div>
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}


