import { getTurns } from "./memory.service.js";
import { deleteSetting, getSetting, setSetting } from "../settings/settings.service.js";

// Two ways to reach a free-form model, in order of preference:
// 1. A remote OpenAI-compatible provider, when an API key is set.
// 2. Ollama on this computer, which needs no key and keeps messages local.
// Deterministic commands never reach either one; only unmatched messages do.
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
// A local model can spend a while loading into memory on the first message.
const LOCAL_TIMEOUT_MS = 120_000;
const LOCAL_PROBE_TIMEOUT_MS = 1_200;
const LOCAL_CACHE_MS = 30_000;
const PREFERRED_LOCAL_MODELS = ["llama3.2", "llama3.1", "qwen2.5", "mistral", "phi3", "gemma3"];

const localBaseUrl = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
// A model picked in Settings wins over the environment's default.
const localModel = () => getSetting("local_model") || process.env.OLLAMA_MODEL || "";
const localEnabled = () => process.env.ORBIT_DISABLE_OLLAMA !== "1";

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

// Ollama reports names with tags ("llama3.2:latest"). Honour an explicit
// OLLAMA_MODEL only when it is actually installed, otherwise pick a common one.
const chooseLocalModel = (names) => {
  const wanted = localModel();

  if (wanted) {
    if (names.includes(wanted)) return wanted;

    const tagged = names.find((name) => name.split(":")[0] === wanted);

    return tagged ?? null;
  }

  const preferred = PREFERRED_LOCAL_MODELS.map((name) =>
    names.find((entry) => entry.split(":")[0] === name)
  ).find(Boolean);

  return preferred ?? names[0] ?? null;
};

let localCache = { at: 0, value: { running: false, models: [], model: null } };

// Cheap health probe against Ollama's native API; cached so a missing model
// does not add a failed connection on every message.
const detectLocal = async ({ force = false } = {}) => {
  if (!localEnabled()) {
    return { running: false, models: [], model: null };
  }

  if (!force && Date.now() - localCache.at < LOCAL_CACHE_MS) {
    return localCache.value;
  }

  let value = { running: false, models: [], model: null };

  try {
    const response = await fetch(`${localBaseUrl()}/api/tags`, {
      signal: AbortSignal.timeout(LOCAL_PROBE_TIMEOUT_MS),
    });

    if (response.ok) {
      const body = await response.json().catch(() => ({}));
      const models = (Array.isArray(body?.models) ? body.models : [])
        .map((entry) => entry?.name)
        .filter(Boolean);

      value = { running: true, models, model: chooseLocalModel(models) };
    }
  } catch {
    // Nothing listening on the Ollama port; commands still work.
  }

  localCache = { at: Date.now(), value };

  return value;
};

// Tests need a deterministic answer instead of whatever is listening locally.
export const clearLocalCache = () => {
  localCache = { at: 0, value: { running: false, models: [], model: null } };
};

const resolveProvider = async () => {
  if (apiKey()) {
    return { kind: "remote", url: `${baseUrl()}/chat/completions`, model: model(), key: apiKey() };
  }

  const local = await detectLocal();

  if (local.model) {
    return { kind: "local", url: `${localBaseUrl()}/v1/chat/completions`, model: local.model, key: "" };
  }

  return null;
};

export const isConfigured = async () => (await resolveProvider()) !== null;

export const status = async ({ refresh = false } = {}) => {
  if (apiKey()) {
    return {
      configured: true,
      provider: "remote",
      model: model(),
      baseUrl: baseUrl(),
      models: [],
      preferred: null,
    };
  }

  const local = await detectLocal({ force: refresh });

  if (local.model) {
    return {
      configured: true,
      provider: "local",
      model: local.model,
      baseUrl: `${localBaseUrl()}/v1`,
      models: local.models,
      preferred: localModel() || "",
    };
  }

  let hint =
    "Free-form chat needs a model. Install Ollama from ollama.com, then run: ollama pull llama3.2";

  if (!localEnabled()) {
    hint = "Local models are turned off (ORBIT_DISABLE_OLLAMA=1). Add an AI key for free-form chat.";
  } else if (local.running) {
    hint = localModel()
      ? `Ollama is running, but ${localModel()} is not installed. Run: ollama pull ${localModel()}`
      : "Ollama is running, but it has no models yet. Run: ollama pull llama3.2";
  }

  return {
    configured: false,
    provider: null,
    model: null,
    baseUrl: null,
    models: local.models,
    preferred: localModel() || "",
    ollamaRunning: local.running,
    hint,
  };
};

// Empty string means "pick an installed model automatically".
export const setLocalModel = async (name) => {
  const value = typeof name === "string" ? name.trim() : "";

  if (!value) {
    deleteSetting("local_model");
    clearLocalCache();

    return status({ refresh: true });
  }

  const local = await detectLocal({ force: true });

  if (!local.running) {
    const error = new Error("Ollama is not running on this computer");

    error.status = 400;
    throw error;
  }

  if (!local.models.includes(value)) {
    const error = new Error(`"${value}" is not installed in Ollama. Run: ollama pull ${value}`);

    error.status = 400;
    throw error;
  }

  setSetting("local_model", value);
  clearLocalCache();

  return status({ refresh: true });
};

export const answer = async (message) => {
  const provider = await resolveProvider();

  if (!provider) {
    const error = new Error("no model is set up: start Ollama or add an AI key");

    error.status = 503;
    throw error;
  }

  const history = getTurns()
    .slice(-HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content }));

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    provider.kind === "local" ? LOCAL_TIMEOUT_MS : TIMEOUT_MS
  );

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(provider.key ? { Authorization: `Bearer ${provider.key}` } : {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
        temperature: 0.7,
        max_tokens: MAX_REPLY_TOKENS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const status =
        response.status === 401
          ? "the API key was rejected"
          : `${provider.kind === "local" ? "the local model" : "the service"} returned ${response.status}`;
      const error = new Error(`${status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);

      error.status = 502;

      throw error;
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      const error = new Error("the model returned an empty answer");

      error.status = 502;
      throw error;
    }

    return reply;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeout = new Error(
        provider.kind === "local"
          ? "the local model did not answer in time"
          : "the AI service did not answer in time"
      );

      timeout.status = 504;

      throw timeout;
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
};
