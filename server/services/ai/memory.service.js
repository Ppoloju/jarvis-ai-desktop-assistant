import { randomUUID } from "crypto";

import { db } from "../db/db.service.js";

// 24 turns is roughly a dozen exchanges: enough context for follow-up
// questions without sending a giant prompt on every message.
const MAX_TURNS = 24;

const insert = db.prepare(
  "INSERT INTO chat_turns (id, role, content, created_at) VALUES (?, ?, ?, ?)"
);
const recent = db.prepare("SELECT * FROM chat_turns ORDER BY rowid DESC LIMIT ?");
const clear = db.prepare("DELETE FROM chat_turns");
const prune = db.prepare(`
  DELETE FROM chat_turns
  WHERE rowid NOT IN (SELECT rowid FROM chat_turns ORDER BY rowid DESC LIMIT ?)
`);

const toTurn = (row) => ({
  id: row.id,
  role: row.role,
  content: row.content,
  at: row.created_at,
});

export const getTurns = () => recent.all(MAX_TURNS).reverse().map(toTurn);

export const addTurn = (role, content) => {
  const text = String(content || "").trim();

  if (!text) {
    return null;
  }

  const turn = {
    id: randomUUID(),
    role: role === "assistant" ? "assistant" : "user",
    // The model only needs the message itself; keep the table small.
    content: text.slice(0, 4000),
    at: new Date().toISOString(),
  };

  insert.run(turn.id, turn.role, turn.content, turn.at);
  prune.run(MAX_TURNS);

  return turn;
};

export const clearTurns = () => clear.run();
