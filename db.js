import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// owners: la cuenta con la que se inicia sesión (email + contraseña).
// locations: los negocios/locales de un owner (uno o varios).
// cards: tarjetas NFC, cada una pertenece a un location.
const EMPTY_DB = { owners: [], locations: [], cards: [], scans: [] };

// Cola simple para evitar que dos escrituras a la vez se pisen entre sí.
let writeQueue = Promise.resolve();

export function readDB() {
  if (!fs.existsSync(DB_PATH)) return structuredClone(EMPTY_DB);
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    if (!raw.trim()) return structuredClone(EMPTY_DB);
    const parsed = JSON.parse(raw);
    // Si el fichero es de un formato antiguo (sin owners/locations), empezamos de cero.
    if (!Array.isArray(parsed.owners) || !Array.isArray(parsed.locations)) {
      return structuredClone(EMPTY_DB);
    }
    if (!Array.isArray(parsed.cards)) parsed.cards = [];
    if (!Array.isArray(parsed.scans)) parsed.scans = [];
    return parsed;
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
