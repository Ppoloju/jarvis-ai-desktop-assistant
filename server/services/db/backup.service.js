import fs from "fs";
import path from "path";

import { db, dbFile } from "./db.service.js";

// Next to the database folder, not inside it, so the Files page never lists
// backups as user files.
const dataDir = path.dirname(path.dirname(dbFile));
export const backupsDir = path.join(dataDir, "backups");

const MAX_LISTED = 10;

const escape = (value) => value.replace(/'/g, "''");

// VACUUM INTO writes a consistent snapshot of the live database, WAL included,
// without stopping the API the way copying orbit.db by hand requires.
export const createBackup = () => {
  fs.mkdirSync(backupsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  let file = `orbit-backup-${stamp}.db`;
  let target = path.join(backupsDir, file);

  for (let attempt = 1; fs.existsSync(target); attempt += 1) {
    file = `orbit-backup-${stamp}-${attempt}.db`;
    target = path.join(backupsDir, file);
  }

  db.exec(`VACUUM INTO '${escape(target)}'`);

  const stat = fs.statSync(target);

  return {
    file,
    size: stat.size,
    createdAt: stat.mtime.toISOString(),
  };
};

export const listBackups = () => {
  if (!fs.existsSync(backupsDir)) {
    return [];
  }

  return fs
    .readdirSync(backupsDir)
    .filter((file) => file.endsWith(".db"))
    .map((file) => {
      const stat = fs.statSync(path.join(backupsDir, file));

      return { file, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_LISTED);
};
