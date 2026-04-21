import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseRouteClient } from "@/lib/supabase-route";

const diagramObjectSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("player"), x: z.number(), y: z.number(), label: z.string(), color: z.enum(["blue", "red", "yellow", "green", "white"]) }),
  z.object({ id: z.string(), type: z.literal("cone"), x: z.number(), y: z.number() }),
  z.object({ id: z.string(), type: z.literal("ball"), x: z.number(), y: z.number() }),
  z.object({ id: z.string(), type: z.literal("arrow"), style: z.enum(["straight", "curved", "zigzag"]), x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(), cx: z.number().optional(), cy: z.number().optional(), color: z.string() }),
  z.object({ id: z.string(), type: z.literal("text"), x: z.number(), y: z.number(), text: z.string() }),
  z.object({ id: z.string(), type: z.literal("path"), d: z.string() }),
]);

const payloadSchema = z.object({
  drillId: z.string().uuid(),
  diagram: z.object({
    activeSlideId: z.string(),
    slides: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        courtType: z.enum(["half_court", "full_court"]),
        objects: z.array(diagramObjectSchema),
      }),
    ).min(1),
  }),
});

export async function POST(request: Request) {
  const json = await request.json();
  const payload = payloadSchema.safeParse(json);

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const supabase = await getSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: drill, error: drillError } = await supabase
    .from("drills")
    .select("id, workspace_id")
    .eq("id", payload.data.drillId)
    .maybeSingle();

  if (drillError || !drill) {
    return NextResponse.json({ error: "Drill not found" }, { status: 404 });
  }

  const { data: existingDiagram } = await supabase
    .from("diagrams")
    .select("id")
    .eq("drill_id", payload.data.drillId)
    .limit(1)
    .maybeSingle();

  const diagramData = {
    drill_id: payload.data.drillId,
    workspace_id: drill.workspace_id,
    name: "Main diagram",
    court_type: payload.data.diagram.slides[0]?.courtType ?? "half_court",
    data_json: payload.data.diagram,
    created_by: user.id,
  };

  const result = existingDiagram
    ? await supabase.from("diagrams").update(diagramData).eq("id", existingDiagram.id).select("id").maybeSingle()
    : await supabase.from("diagrams").insert(diagramData).select("id").maybeSingle();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, diagramId: result.data?.id ?? existingDiagram?.id ?? null });
}
