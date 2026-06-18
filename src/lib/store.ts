import { TrialData, CrossExaminationQuestion } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

export function migrateCrossExamination(data: unknown): CrossExaminationQuestion[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  // Legacy string[] format — preserve questions only; choices require regeneration via cross-section.
  if (typeof data[0] === "string") {
    return (data as string[]).map((q) => ({ question: q, choices: [] }));
  }
  return data as CrossExaminationQuestion[];
}

export function rowToTrialData(row: Record<string, unknown>): TrialData {
  const prosecution = (row.prosecution as TrialData["prosecution"]) || { opening: "", arguments: [] };
  const defense = (row.defense as TrialData["defense"]) || { opening: "", arguments: [] };
  return {
    id: row.id as string,
    intake: row.intake as TrialData["intake"],
    charge: row.charge as string,
    case_title: row.case_title as string,
    charge_data: row.charge_data as TrialData["charge_data"],
    prosecution,
    defense,
    cross_examination: migrateCrossExamination(row.cross_examination as unknown),
    cross_bailiff_dialogue: row.cross_bailiff_dialogue as string[] | undefined,
    verdicts: row.verdicts as TrialData["verdicts"],
    createdAt: new Date(row.created_at as string).getTime(),
    isSample: (row.is_sample as boolean) || undefined,
    ruling: row.ruling as TrialData["ruling"] | undefined,
    generationStep: row.generation_step as number | undefined,
  };
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  }
}

const GALLERY_TRIAL_LIMIT = 200;

export async function getTrial(id: string): Promise<TrialData | undefined> {
  requireSupabase();

  const { data, error } = await supabase!
    .from("trials")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return undefined;
  return rowToTrialData(data as Record<string, unknown>);
}

export async function getAllTrials(): Promise<TrialData[]> {
  requireSupabase();

  const { data, error } = await supabase!
    .from("trials")
    .select("*")
    .eq("is_sample", false)
    .order("created_at", { ascending: false })
    .limit(GALLERY_TRIAL_LIMIT);

  if (error) {
    console.error("Supabase query error:", error);
    return [];
  }

  return (data || []).map((row) =>
    rowToTrialData(row as Record<string, unknown>)
  );
}

export async function getMyTrials(visitorId: string): Promise<TrialData[]> {
  requireSupabase();

  const { data, error } = await supabase!
    .from("trials")
    .select("*")
    .eq("is_sample", false)
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false })
    .limit(GALLERY_TRIAL_LIMIT);

  if (error) {
    console.error("Supabase query error:", error);
    return [];
  }

  return (data || []).map((row) =>
    rowToTrialData(row as Record<string, unknown>)
  );
}

export async function refetchTrialRow(trialId: string): Promise<Record<string, unknown>> {
  requireSupabase();
  const { data, error } = await supabase!
    .from("trials")
    .select("*")
    .eq("id", trialId)
    .single();
  if (error || !data) throw new Error("Trial not found");
  return data as Record<string, unknown>;
}

export async function resolveTrialRowAfterGeneration(
  trialId: string,
  row: Record<string, unknown>,
  fnData: unknown,
  applyFnData: (row: Record<string, unknown>, data: Record<string, unknown>) => Record<string, unknown>,
  hasStageContent: (row: Record<string, unknown>) => boolean,
): Promise<Record<string, unknown>> {
  let next = row;
  if (fnData && typeof fnData === "object" && fnData !== null && !("error" in fnData)) {
    next = applyFnData(row, fnData as Record<string, unknown>);
  }
  if (!hasStageContent(next)) {
    next = await refetchTrialRow(trialId);
  }
  if (!hasStageContent(next)) {
    throw new Error("Stage generation returned no content");
  }
  return next;
}

export function rowHasProsecution(row: Record<string, unknown>): boolean {
  return Boolean((row.prosecution as { opening?: string } | null)?.opening);
}

export function rowHasDefense(row: Record<string, unknown>): boolean {
  return Boolean((row.defense as { opening?: string } | null)?.opening);
}

export function rowHasCrossExamination(row: Record<string, unknown>): boolean {
  const cross = row.cross_examination as Array<{ question?: string; choices?: unknown[] }> | null;
  if (!Array.isArray(cross) || cross.length < 2) return false;
  return cross.every((q) => Boolean(q.question?.trim()) && Array.isArray(q.choices) && q.choices.length === 3);
}

export function rowHasVerdicts(row: Record<string, unknown>): boolean {
  const verdicts = row.verdicts as { ship?: { sentence?: string } } | null;
  return Boolean(verdicts?.ship?.sentence && verdicts.ship.sentence.length > 0);
}