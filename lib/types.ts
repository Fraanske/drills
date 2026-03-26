export type DrillSummary = {
  id: string;
  title: string;
  one_liner: string;
  court_area: "half_court" | "full_court" | "small_side";
  players_needed: string | null;
  updated_at: string;
};

export type DiagramObject =
  | { id: string; type: "player"; x: number; y: number; label: string }
  | { id: string; type: "arrow"; x1: number; y1: number; x2: number; y2: number }
  | { id: string; type: "text"; x: number; y: number; text: string }
  | { id: string; type: "path"; d: string };

export type DiagramPayload = {
  courtType: "half_court" | "full_court";
  objects: DiagramObject[];
};
