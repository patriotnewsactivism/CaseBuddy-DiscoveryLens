/**
 * Cohere AI Service for CaseBuddy DiscoveryLens
 *
 * Optimized for legal document discovery:
 * - command-a-vision-07-2025  → scanned docs, images, exhibits
 * - command-a-plus-05-2026    → deep legal analysis, 256K context
 * - command-a-reasoning-08-2025 → structured extraction, privilege analysis
 */

const COHERE_BASE = "https://api.cohere.com/v2";
const COHERE_KEY = process.env.COHERE_API_KEY || "";

export type CohereDocModel =
  | "command-a-vision-07-2025"
  | "command-a-plus-05-2026"
  | "command-a-reasoning-08-2025"
  | "command-a-03-2025";

export interface CohereAnalysisResult {
  text: string;
  model: CohereDocModel;
  inputTokens: number;
  outputTokens: number;
}

export function isCohereConfigured(): boolean {
  return Boolean(process.env.COHERE_API_KEY);
}

export async function callCohere(
  systemPrompt: string,
  userContent: string,
  model: CohereDocModel = "command-a-plus-05-2026",
  maxTokens = 4096
): Promise<CohereAnalysisResult> {
  if (!COHERE_KEY) throw new Error("COHERE_API_KEY is not set");

  const res = await fetch(`${COHERE_BASE}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${COHERE_KEY}`,
      "Content-Type": "application/json",
      "X-Client-Name": "casebuddy-discoverylens",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404 && model !== "command-a-03-2025") {
      return callCohere(systemPrompt, userContent, "command-a-03-2025", maxTokens);
    }
    throw new Error(`Cohere error (${res.status}): ${(err as any).message || JSON.stringify(err)}`);
  }

  const data = await res.json();
  const parts = (data as any).message?.content || [];
  const text = parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text || "")
    .join("")
    .trim();

  const usage = (data as any).usage?.billed_units || {};
  return {
    text,
    model,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
  };
}

/**
 * Analyze a discovery document with optional image support.
 * Uses vision model when imageBase64 is provided.
 */
export async function analyzeDiscoveryDoc(
  systemPrompt: string,
  documentText: string,
  imageBase64?: string,
  mimeType = "image/jpeg"
): Promise<CohereAnalysisResult> {
  if (imageBase64) {
    const content = [
      { type: "text", text: documentText },
      {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
    ];
    const res = await fetch(`${COHERE_BASE}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_KEY}`,
        "Content-Type": "application/json",
        "X-Client-Name": "casebuddy-discoverylens",
      },
      body: JSON.stringify({
        model: "command-a-vision-07-2025",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        max_tokens: 8192,
      }),
    });
    const data = await res.json();
    const parts = (data as any).message?.content || [];
    const text = parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text || "")
      .join("")
      .trim();
    return { text, model: "command-a-vision-07-2025", inputTokens: 0, outputTokens: 0 };
  }

  // Text-only: use best analysis model
  return callCohere(systemPrompt, documentText, "command-a-plus-05-2026", 8192);
}
