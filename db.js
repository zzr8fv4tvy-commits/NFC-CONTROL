import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const EMPTY_DB = { businesses: [], cards: [], scans: [] };

// Cola simple para evitar que dos escrituras a la vez se pisen entre sí.
let writeQueue = Promise.resolve();

export function readDB() {
  if (!fs.existsSync(DB_PATH)) return structuredClone(EMPTY_DB);
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : structuredClone(EMPTY_DB);
  } catch (err) {
    console.error('No se pudo leer data/db.json, se usa una base vacía:', err.message);
    return structuredClone(EMPTY_DB);
  }
}

export function writeDB(db) {
  writeQueue = writeQueue.then(() => {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  });
  return writeQueue;
}
