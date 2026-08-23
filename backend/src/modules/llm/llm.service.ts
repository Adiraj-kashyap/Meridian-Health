import { env, isLlmConfigured } from "../../config/env";
import { logger } from "../../lib/logger";

export interface PreVisitSummary {
  urgencyLevel: "Low" | "Medium" | "High";
  chiefComplaint: string;
  suggestedQuestions: string[];
}

export interface PostVisitSummary {
  patientSummary: string;
  medicationSchedule: string;
  followUpSteps: string;
}

export type LlmResult<T> = { ok: true; data: T } | { ok: false; error: string };

function buildPreVisitPrompt(symptoms: string): string {
  return (
    `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, ` +
    `and three suggested questions for the doctor. Symptoms: ${symptoms}\n\n` +
    `Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:\n` +
    `{"urgencyLevel": "Low" | "Medium" | "High", "chiefComplaint": string, "suggestedQuestions": [string, string, string]}`
  );
}

function buildPostVisitPrompt(notes: string): string {
  return (
    `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}\n\n` +
    `Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:\n` +
    `{"patientSummary": string, "medicationSchedule": string, "followUpSteps": string}\n` +
    `Write in plain, warm, non-clinical language a patient without a medical background can follow.`
  );
}

/** Strips markdown code fences some models wrap JSON in, then parses. */
function parseJsonResponse<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned) as T;
}

/** Plain REST call against Google AI Studio's Gemini API — no SDK needed for
 *  a single-shot text-in/text-out call like this. */
async function callGemini(prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new Error("LLM is not configured (GEMINI_API_KEY missing)");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text content");
  return text;
}

async function callWithRetry(prompt: string): Promise<string> {
  if (!isLlmConfigured()) throw new Error("LLM is not configured (GEMINI_API_KEY missing)");

  let lastErr: unknown;
  for (let attempt = 0; attempt <= env.LLM_MAX_RETRIES; attempt++) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      lastErr = err;
      logger.warn(`LLM call failed (attempt ${attempt + 1}/${env.LLM_MAX_RETRIES + 1})`, err);
      if (attempt < env.LLM_MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("LLM call failed");
}

/**
 * Every LLM entry point returns a discriminated union instead of throwing.
 * Callers persist llmStatus=FAILED + llmError on failure and continue the
 * request (booking / visit-note-saving) unaffected — the brief requires the
 * system to "not break" when the LLM is unavailable.
 */
export async function generatePreVisitSummary(symptoms: string): Promise<LlmResult<PreVisitSummary>> {
  try {
    const raw = await callWithRetry(buildPreVisitPrompt(symptoms));
    const parsed = parseJsonResponse<PreVisitSummary>(raw);
    if (!["Low", "Medium", "High"].includes(parsed.urgencyLevel)) {
      throw new Error(`Unexpected urgencyLevel from LLM: ${parsed.urgencyLevel}`);
    }
    return { ok: true, data: parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Pre-visit LLM summary failed", message);
    return { ok: false, error: message };
  }
}

export async function generatePostVisitSummary(clinicalNotes: string): Promise<LlmResult<PostVisitSummary>> {
  try {
    const raw = await callWithRetry(buildPostVisitPrompt(clinicalNotes));
    const parsed = parseJsonResponse<PostVisitSummary>(raw);
    return { ok: true, data: parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Post-visit LLM summary failed", message);
    return { ok: false, error: message };
  }
}
