import { TrialData } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

// In-memory fallback when Supabase is not configured
const fallbackStore = new Map<string, TrialData>();

function rowToTrialData(row: Record<string, unknown>): TrialData {
  return {
    id: row.id as string,
    intake: row.intake as TrialData["intake"],
    charge: row.charge as string,
    case_title: row.case_title as string,
    prosecution: row.prosecution as TrialData["prosecution"],
    defense: row.defense as TrialData["defense"],
    cross_examination: row.cross_examination as string[],
    verdicts: row.verdicts as TrialData["verdicts"],
    createdAt: new Date(row.created_at as string).getTime(),
    isSample: (row.is_sample as boolean) || undefined,
  };
}

function trialDataToRow(data: TrialData): Record<string, unknown> {
  return {
    id: data.id,
    intake: data.intake,
    charge: data.charge,
    case_title: data.case_title,
    prosecution: data.prosecution,
    defense: data.defense,
    cross_examination: data.cross_examination,
    verdicts: data.verdicts,
    created_at: new Date(data.createdAt).toISOString(),
    is_sample: data.isSample || false,
  };
}

export async function getTrial(id: string): Promise<TrialData | undefined> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!
      .from("trials")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return undefined;
    return rowToTrialData(data as Record<string, unknown>);
  }

  return fallbackStore.get(id);
}

export async function setTrial(id: string, data: TrialData): Promise<void> {
  if (isSupabaseConfigured()) {
    const row = trialDataToRow(data);
    const { error } = await supabase!.from("trials").upsert(row, {
      onConflict: "id",
    });

    if (error) {
      console.error("Supabase insert error:", error);
    }
    return;
  }

  fallbackStore.set(id, data);
}

export async function getAllTrials(): Promise<TrialData[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!
      .from("trials")
      .select("*")
      .eq("is_sample", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return [];
    }

    return (data || []).map((row) =>
      rowToTrialData(row as Record<string, unknown>)
    );
  }

  return Array.from(fallbackStore.values()).filter((t) => !t.isSample);
}

export async function getPublicTrials(): Promise<TrialData[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!
      .from("trials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return [];
    }

    return (data || []).map((row) =>
      rowToTrialData(row as Record<string, unknown>)
    );
  }

  return Array.from(fallbackStore.values());
}