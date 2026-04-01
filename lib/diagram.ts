import type { DiagramPayload, DiagramSlide, LegacyDiagramPayload } from "@/lib/types";

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

export function normalizeDiagramPayload(input: unknown): DiagramPayload {
  if (
    input &&
    typeof input === "object" &&
    "activeSlideId" in input &&
    "slides" in input &&
    Array.isArray((input as DiagramPayload).slides)
  ) {
    const payload = input as DiagramPayload;
    if (payload.slides.length > 0) return payload;
  }

  if (input && typeof input === "object" && "courtType" in input && "objects" in input) {
    const legacy = input as LegacyDiagramPayload;
    const slide = createEmptySlide(legacy.courtType, "Slide 1");
    slide.objects = Array.isArray(legacy.objects) ? legacy.objects : [];
    return {
      activeSlideId: slide.id,
      slides: [slide],
    };
  }

  return createEmptyDiagram("full_court");
}
