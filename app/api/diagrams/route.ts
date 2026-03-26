import { NextResponse } from "next/server";
import { z } from "zod";

const diagramObjectSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("player"), x: z.number(), y: z.number(), label: z.string() }),
  z.object({ id: z.string(), type: z.literal("arrow"), x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() }),
  z.object({ id: z.string(), type: z.literal("text"), x: z.number(), y: z.number(), text: z.string() }),
  z.object({ id: z.string(), type: z.literal("path"), d: z.string() }),
]);

const payloadSchema = z.object({
  courtType: z.enum(["half_court", "full_court"]),
  objects: z.array(diagramObjectSchema),
});

export async function POST(request: Request) {
  const json = await request.json();
  const payload = payloadSchema.safeParse(json);

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Validated payload. Next step: update a specific diagram row in Supabase." });
}
