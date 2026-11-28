import { getTurns } from "./memory.service.js";

// Any OpenAI-compatible chat completions endpoint works. Z.ai (GLM) is the
// default because it is the cheap option recommended for this app; OpenAI and
// other compatible providers only need the base URL and model changed.
// Read at call time so a key added to .env takes effect on restart, and tests
// can exercise both the configured and unconfigured paths.
const apiKey = () =>
  process.env.AI_API_KEY || process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY || "";
const baseUrl = () =>
  (
    process.env.AI_BASE_URL ||
    process.env.ZAI_API_BASE ||
    process.env.OPENAI_BASE_URL ||
    "https://api.z.ai/api/paas/v4"
  ).replace(/\/+$/, "");
const model = () => process.env.AI_MODEL || "glm-4-flash";
const TIMEOUT_MS = 30_000;
const HISTORY_TURNS = 12;
const MAX_REPLY_TOKENS = 700;

const SYSTEM_PROMPT = [
  "You are Orbit, a desktop assistant running locally on the user's own computer.",
  "Answer questions, explain things and chat like a normal assistant, including casual or silly questions.",
  "Be concise by default: a few sentences, or a short list when steps are needed.",
  "You cannot click, type, open apps or read files yourself. Actions happen only when the user",
  'issues an Orbit command such as "open youtube", "find report.pdf" or "remind me to call Sam";',
  "when a request needs an action, say which command performs it.",
  "Never claim to have performed an action you did not perform.",
].join(" ");

export const isConfigured = () => Boolean(apiKey());

export const describe = () => ({
  configured: isConfigured(),
  model: isConfigured() ? model() : null,
});

export const answer = async (message) => {
  const history = getTurns()
    .slice(-HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify({
        model: model(),
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
        temperature: 0.7,
        max_tokens: MAX_REPLY_TOKENS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const status = response.status === 401 ? "the API key was rejected" : `the service returned ${response.status}`;
      const error = new Error(`${status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
      error.status = 502;

      throw error;
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      const error = new Error("the AI service returned an empty answer");
      error.status = 502;

      throw error;
    }

    return reply;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeout = new Error("the AI service did not answer in time");
      timeout.status = 504;

      throw timeout;
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
};
