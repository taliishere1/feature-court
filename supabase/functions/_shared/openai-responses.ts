/**
 * OpenAI Responses API HTTP client for Supabase Edge Functions.
 *
 * Per OpenAI prompt engineering guide:
 * - `instructions` = developer message: # Identity → # Instructions → # Examples (paired input/output patterns, static)
 * - `input` = user message: trial context (dynamic) → task → critical_rule → execution_order → edge_cases → output_format → output_shape
 * - Dynamic case data lives only in `input`, never in `instructions`
 * - Do NOT chain retries via previous_response_id when instructions must govern the retry;
 *   instructions from prior turns are not present in chained context.
 * - `store: true` for conversation_id chaining across trial stages
 * - Model: gpt-5.4-mini with reasoning.effort "none" for structured JSON stages
 *
 * @see https://developers.openai.com/api/docs/guides/prompt-engineering
 */

export function extractOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text) {
    return payload.output_text;
  }
  const output = payload.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item.content as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c.type === "refusal" && typeof c.refusal === "string") {
            throw new Error(`Model refused: ${c.refusal}`);
          }
          if (c.type === "output_text" && typeof c.text === "string") {
            return c.text;
          }
        }
      }
    }
  }
  return "";
}

export interface ResponsesCallParams {
  apiKey: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  previousResponseId?: string;
  maxOutputTokens?: number;
}

export interface ResponsesCallResult {
  id: string;
  outputText: string;
}

/** POST /v1/responses with GPT-5.4-mini production defaults. */
export async function callOpenAIResponses(params: ResponsesCallParams): Promise<ResponsesCallResult> {
  const body: Record<string, unknown> = {
    model: "gpt-5.4-mini",
    instructions: params.instructions,
    input: params.input,
    store: true,
    reasoning: { effort: "none" },
    max_output_tokens: params.maxOutputTokens ?? 8000,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: params.schemaName,
        strict: true,
        schema: params.schema,
      },
    },
  };

  if (params.previousResponseId) {
    body.previous_response_id = params.previousResponseId;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json() as Record<string, unknown>;
  if (data.status === "incomplete") {
    const details = data.incomplete_details as { reason?: string } | undefined;
    throw new Error(`OpenAI response incomplete: ${details?.reason ?? "unknown"}`);
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("No content in OpenAI response");

  return { id: data.id as string, outputText };
}
