import { TrialData, Ruling, CrossExaminationQuestion } from "./types";
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
    ruling: data.ruling || null,
    generation_step: data.generationStep ?? null,
  };
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  }
}

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

export async function setTrial(id: string, data: TrialData): Promise<void> {
  requireSupabase();

  const row = trialDataToRow(data);
  const { error } = await supabase!.from("trials").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    console.error("Supabase insert error:", error);
  }
}

export async function updateTrial(id: string, partial: Partial<TrialData>): Promise<void> {
  const existing = await getTrial(id);
  if (!existing) return;
  await setTrial(id, { ...existing, ...partial });
}

export async function getAllTrials(): Promise<TrialData[]> {
  requireSupabase();

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

export async function getMyTrials(visitorId: string): Promise<TrialData[]> {
  requireSupabase();

  const { data, error } = await supabase!
    .from("trials")
    .select("*")
    .eq("is_sample", false)
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase query error:", error);
    return [];
  }

  return (data || []).map((row) =>
    rowToTrialData(row as Record<string, unknown>)
  );
}

export async function getPublicTrials(): Promise<TrialData[]> {
  requireSupabase();

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

export async function recordRuling(id: string, ruling: Ruling): Promise<void> {
  requireSupabase();

  const { error } = await supabase!
    .from("trials")
    .update({ ruling })
    .eq("id", id);

  if (error) {
    console.error("Supabase update error:", error);
  }
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