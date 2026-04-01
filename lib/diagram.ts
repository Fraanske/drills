import type { DiagramObject, DiagramPayload, DiagramSlide, LegacyDiagramPayload, PlayerColor } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function createEmptySlide(courtType: DiagramSlide["courtType"] = "half_court", name?: string): DiagramSlide {
  return {
    id: uid(),
    name: name ?? (courtType === "full_court" ? "Full court" : "Half court"),
    courtType,
    objects: [],
  };
}

export function createEmptyDiagram(courtType: DiagramSlide["courtType"] = "half_court"): DiagramPayload {
  const slide = createEmptySlide(courtType, "Slide 1");
  return {
    activeSlideId: slide.id,
    slides: [slide],
  };
}

function normalizePlayerColor(color: unknown): PlayerColor {
  return color === "blue" || color === "red" || color === "yellow" || color === "green" || color === "white"
    ? color
    : "blue";
}

function normalizeObject(input: unknown): DiagramObject | null {
  if (!input || typeof input !== "object" || !("type" in input)) return null;

  const item = input as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : uid();

  if (item.type === "player" && typeof item.x === "number" && typeof item.y === "number") {
    return {
      id,
      type: "player",
      x: item.x,
      y: item.y,
      label: typeof item.label === "string" ? item.label : "1",
      color: normalizePlayerColor(item.color),
    };
  }

  if (item.type === "cone" && typeof item.x === "number" && typeof item.y === "number") {
    return { id, type: "cone", x: item.x, y: item.y };
  }

  if (item.type === "ball" && typeof item.x === "number" && typeof item.y === "number") {
    return { id, type: "ball", x: item.x, y: item.y };
  }

  if (item.type === "arrow" && typeof item.x1 === "number" && typeof item.y1 === "number" && typeof item.x2 === "number" && typeof item.y2 === "number") {
    return {
      id,
      type: "arrow",
      style: item.style === "curved" ? "curved" : "straight",
      x1: item.x1,
      y1: item.y1,
      x2: item.x2,
      y2: item.y2,
      cx: typeof item.cx === "number" ? item.cx : undefined,
      cy: typeof item.cy === "number" ? item.cy : undefined,
      color: typeof item.color === "string" ? item.color : "#0f172a",
    };
  }

  if (item.type === "text" && typeof item.x === "number" && typeof item.y === "number") {
    return {
      id,
      type: "text",
      x: item.x,
      y: item.y,
      text: typeof item.text === "string" ? item.text : "Note",
    };
  }

  if (item.type === "path" && typeof item.d === "string") {
    return { id, type: "path", d: item.d };
  }

  return null;
}

function normalizeObjects(input: unknown): DiagramObject[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeObject).filter((item): item is DiagramObject => item !== null);
}

export function normalizeDiagramPayload(input: unknown): DiagramPayload {
  if (
    input &&
    typeof input === "object" &&
    "activeSlideId" in input &&
    "slides" in input &&
    Array.isArray((input as DiagramPayload).slides)
  ) {
    const payload = input as DiagramPayload;
    if (payload.slides.length > 0) {
      const slides: DiagramSlide[] = payload.slides.map((slide, index) => ({
        id: typeof slide.id === "string" ? slide.id : uid(),
        name: typeof slide.name === "string" ? slide.name : `Slide ${index + 1}`,
        courtType: slide.courtType === "half_court" ? "half_court" : "full_court",
        objects: normalizeObjects(slide.objects),
      }));

      return {
        activeSlideId: slides.some((slide) => slide.id === payload.activeSlideId) ? payload.activeSlideId : slides[0].id,
        slides,
      };
    }
  }

  if (input && typeof input === "object" && "courtType" in input && "objects" in input) {
    const legacy = input as LegacyDiagramPayload;
    const slide = createEmptySlide(legacy.courtType, "Slide 1");
    slide.objects = normalizeObjects(legacy.objects);
    return {
      activeSlideId: slide.id,
      slides: [slide],
    };
  }

  return createEmptyDiagram("full_court");
}
