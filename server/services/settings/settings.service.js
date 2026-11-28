import { db } from "../db/db.service.js";

// Preferences the user changes in the UI, kept in the same database as the rest
// of the app's data so they survive restarts without an extra config file.
const select = db.prepare("SELECT value FROM settings WHERE key = ?");
const upsert = db.prepare(`
  INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);
const remove = db.prepare("DELETE FROM settings WHERE key = ?");

export const getSetting = (key) => select.get(key)?.value ?? null;

export const setSetting = (key, value) => {
  upsert.run(key, String(value), new Date().toISOString());

  return getSetting(key);
};

export const deleteSetting = (key) => remove.run(key).changes > 0;
