import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const dataDir = process.env.ORBIT_DATA_DIR || path.join(import.meta.dirname, "../..");
export const memoryFile = path.join(dataDir, "chat-memory.json");

// 24 turns is roughly a dozen exchanges: enough context for follow-up
// questions without sending a giant prompt on every message.
const MAX_TURNS = 24;

const normalize = (turn) =>
  turn && typeof turn.content === "string"
    ? {
        id: turn.id || randomUUID(),
        role: turn.role === "assistant" ? "assistant" : "user",
        content: turn.content,
        at: turn.at || new Date().toISOString(),
      }
    : null;

// A damaged file is kept next to the store instead of being thrown away.
const preserveCorruptFile = () => {
  try {
    const backup = `${memoryFile}.corrupt-${Date.now()}`;
    fs.renameSync(memoryFile, backup);
  } catch {
    // nothing to preserve
  }
};

const load = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
    const turns = Array.isArray(parsed) ? parsed : parsed.turns;

    return Array.isArray(turns) ? turns.map(normalize).filter(Boolean).slice(-MAX_TURNS) : [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      preserveCorruptFile();
    }

    return [];
  }
};

let turns = load();

const save = () => {
  fs.mkdirSync(path.dirname(memoryFile), { recursive: true });

  const tmpFile = `${memoryFile}.tmp`;

  fs.writeFileSync(tmpFile, JSON.stringify({ turns }, null, 2));
  fs.renameSync(tmpFile, memoryFile);
};

export const getTurns = () => turns.map((turn) => ({ ...turn }));

export const addTurn = (role, content) => {
  const text = String(content || "").trim();

  if (!text) {
    return null;
  }

  const turn = {
    id: randomUUID(),
    role: role === "assistant" ? "assistant" : "user",
    // The model only needs the message itself; keep the store small.
    content: text.slice(0, 4000),
    at: new Date().toISOString(),
  };

  turns = [...turns, turn].slice(-MAX_TURNS);
  save();

  return { ...turn };
};

export const clearTurns = () => {
  turns = [];
  save();
};
