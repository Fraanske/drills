"use server";

import { redirect } from "next/navigation";
import { createEmptyDiagram } from "@/lib/diagram";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function createDrill() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    throw new Error("No workspace found for current user.");
  }

  const { data: drill, error: drillError } = await supabase
    .from("drills")
    .insert({
      workspace_id: membership.workspace_id,
      created_by: user.id,
      title: "New drill",
      one_liner: "",
      explanation: "",
      setup: "",
      flow_steps: "",
      coaching_points: "",
      variations: "",
      players_needed: null,
      court_area: "half_court",
      age_group: null,
    })
    .select("id, workspace_id")
    .maybeSingle();

  if (drillError || !drill) {
    throw new Error(drillError?.message ?? "Unable to create drill.");
  }

  const { error: diagramError } = await supabase.from("diagrams").insert({
    drill_id: drill.id,
    workspace_id: drill.workspace_id,
    name: "Main diagram",
    court_type: "half_court",
    data_json: createEmptyDiagram("half_court"),
    created_by: user.id,
  });

  if (diagramError) {
    throw new Error(diagramError.message);
  }

  redirect(`/drills/${drill.id}`);
}
