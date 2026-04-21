export type DrillSummary = {
  id: string;
  title: string;
  one_liner: string;
  court_area: "half_court" | "full_court" | "small_side";
  players_needed: string | null;
  updated_at: string;
};

export type DrillDetail = DrillSummary & {
  explanation: string;
  setup: string;
  flow_steps: string;
  coaching_points: string;
  variations: string;
  age_group: string | null;
};

export type DiagramColor = "blue" | "red" | "yellow" | "green" | "white";
export type PlayerColor = DiagramColor;

export type DiagramObject =
  | { id: string; type: "player"; x: number; y: number; label: string; color: DiagramColor }
  | { id: string; type: "cone"; x: number; y: number; color: DiagramColor }
  | { id: string; type: "ball"; x: number; y: number; color: DiagramColor }
  | { id: string; type: "arrow"; style: "straight" | "curved" | "zigzag"; x1: number; y1: number; x2: number; y2: number; cx?: number; cy?: number; color: DiagramColor }
  | { id: string; type: "text"; x: number; y: number; text: string; color: DiagramColor }
  | { id: string; type: "path"; d: string };

export type DiagramSlide = {
  id: string;
  name: string;
  courtType: "half_court" | "full_court";
  objects: DiagramObject[];
};

export type DiagramPayload = {
  activeSlideId: string;
  slides: DiagramSlide[];
};

export type LegacyDiagramPayload = {
  courtType: "half_court" | "full_court";
  objects: DiagramObject[];
};
