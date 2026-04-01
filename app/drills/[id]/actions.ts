"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const allowedCourtAreas = new Set(["half_court", "full_court", "small_side"]);

function toNullableText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateDrill(drillId: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update drills.");
  }

  const title = toText(formData.get("title")) || "Untitled drill";
  const courtAreaValue = toText(formData.get("court_area"));
  const court_area = allowedCourtAreas.has(courtAreaValue) ? courtAreaValue : "half_court";

  const { error } = await supabase
    .from("drills")
    .update({
      title,
      one_liner: toText(formData.get("one_liner")),
      explanation: toText(formData.get("explanation")),
      setup: toText(formData.get("setup")),
      flow_steps: toText(formData.get("flow_steps")),
      coaching_points: toText(formData.get("coaching_points")),
      variations: toText(formData.get("variations")),
      players_needed: toNullableText(formData.get("players_needed")),
      court_area,
      age_group: toNullableText(formData.get("age_group")),
    })
    .eq("id", drillId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath(`/drills/${drillId}`);
}
