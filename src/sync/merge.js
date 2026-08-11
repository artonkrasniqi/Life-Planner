/* ============================================================
   merge.js — Zusammenführen zweier Datenstände (rein, testbar)

   Grundidee: jeder Eintrag trägt `updatedAt` (ms). Beim Abgleich
   gewinnt pro Eintrag der jüngere Stand. Gelöschtes hinterlässt
   einen Grabstein, damit ein Löschen auf Gerät A nicht durch den
   alten Stand von Gerät B wieder auferstehen kann.

   Das ist Last-Write-Wins auf Eintragsebene — kein CRDT. Für einen
   persönlichen Planer reicht das: zwei Geräte ändern selten
   denselben Eintrag in derselben Minute. Wichtig ist, dass
   *unterschiedliche* Einträge nie verloren gehen, und das leistet
   die Vereinigung über alle Schlüssel.
   ============================================================ */

export const SYNC_COLLECTIONS = ['events', 'todos', 'accounts', 'transactions', 'debts', 'bio'];

/** Skalare Bereiche: werden als Ganzes per Zeitstempel übernommen. */
export const SYNC_FIELDS = ['profile', 'budgets'];

/** Nicht synchronisiert: gerätelokal oder geheim. */
export const LOCAL_ONLY = ['ui', 'sync', 'integrations', 'trash'];

/** Grabsteine älter als das hier werden beim Laden verworfen. */
const TOMBSTONE_TTL_MS = 120 * 24 * 3600 * 1000;

/** Biometrie wird über das Datum identifiziert — ein Tag, ein Eintrag. */
export function entityKey(coll, item) {
  return coll === 'bio' ? String(item.date || '') : String(item.id || '');
}

export function tombKey(coll, key) {
  return `${coll}:${key}`;
}

/** Inhaltsprüfsumme ohne `updatedAt`, mit stabiler Schlüsselreihenfolge. */
export function hashEntity(item) {
  const keys = Object.keys(item).filter((k) => k !== 'updatedAt').sort();
  return JSON.stringify(keys.map((k) => [k, item[k]]));
}

/* ------------------------------------------------------------
   Basislinie: Momentaufnahme zum Vergleich beim nächsten Speichern
   ------------------------------------------------------------ */
export function buildBaseline(state) {
  const colls = {};
  for (const coll of SYNC_COLLECTIONS) {
    const map = {};
    for (const item of state[coll] || []) map[entityKey(coll, item)] = hashEntity(item);
    colls[coll] = map;
  }
  const fields = {};
  for (const f of SYNC_FIELDS) fields[f] = JSON.stringify(state[f] ?? null);
  return { colls, fields };
}

/**
 * Vergleicht den Zustand mit der Basislinie, stempelt Geändertes und
 * legt Grabsteine für Entferntes an.
 * @returns {boolean} ob sich überhaupt etwas geändert hat
 */
export function stampChanges(state, baseline, now = Date.now()) {
  let changed = false;
  state.meta = state.meta || {};
  state.meta.tombstones = state.meta.tombstones || {};
  state.meta.fieldUpdated = state.meta.fieldUpdated || {};

  for (const coll of SYNC_COLLECTIONS) {
    const prev = baseline.colls[coll] || {};
    const seen = new Set();

    for (const item of state[coll] || []) {
      const key = entityKey(coll, item);
      if (!key) continue;
      seen.add(key);
      const hash = hashEntity(item);
      if (prev[key] !== hash) {
        item.updatedAt = now;
        changed = true;
      }
      // Was da ist, braucht keinen Grabstein — sonst würde ein Eintrag,
      // der aus dem Papierkorb zurückgeholt wurde, beim nächsten Abgleich
      // gleich wieder verschwinden.
      delete state.meta.tombstones[tombKey(coll, key)];
    }

    for (const key of Object.keys(prev)) {
      if (seen.has(key)) continue;
      state.meta.tombstones[tombKey(coll, key)] = now;
      changed = true;
    }
  }

  for (const f of SYNC_FIELDS) {
    const json = JSON.stringify(state[f] ?? null);
    if (baseline.fields[f] !== json) {
      state.meta.fieldUpdated[f] = now;
      changed = true;
    }
  }

  return changed;
}

/** Stempelt alles neu — beim erstmaligen Verbinden oder nach einem Import. */
export function touchAll(state, now = Date.now()) {
  for (const coll of SYNC_COLLECTIONS) {
    for (const item of state[coll] || []) item.updatedAt = now;
  }
  state.meta = state.meta || {};
  state.meta.fieldUpdated = state.meta.fieldUpdated || {};
  for (const f of SYNC_FIELDS) state.meta.fieldUpdated[f] = now;
}

/* ------------------------------------------------------------
   Nutzlast für die Übertragung
   ------------------------------------------------------------ */
export function syncPayload(state) {
  const out = {
    schema: state.schema,
    format: 1,
    meta: {
      created: state.meta?.created,
      tombstones: state.meta?.tombstones || {},
      fieldUpdated: state.meta?.fieldUpdated || {},
    },
  };
  for (const coll of SYNC_COLLECTIONS) out[coll] = state[coll] || [];
  for (const f of SYNC_FIELDS) out[f] = state[f];
  return out;
}

/* ------------------------------------------------------------
   Zusammenführen
   ------------------------------------------------------------ */
/**
 * @param {object} local   vollständiger lokaler Zustand
 * @param {object} remote  Nutzlast von der Gegenstelle (oder null)
 * @returns {object} neuer vollständiger Zustand
 */
export function mergeStates(local, remote) {
  const out = structuredClone(local);
  if (!remote || typeof remote !== 'object') return out;

  out.meta = out.meta || {};

  /* Grabsteine vereinigen — der jüngere Zeitpunkt zählt. */
  const tomb = { ...(remote.meta?.tombstones || {}) };
  for (const [k, at] of Object.entries(local.meta?.tombstones || {})) {
    if (!tomb[k] || at > tomb[k]) tomb[k] = at;
  }

  /* Einträge je Sammlung vereinigen. */
  for (const coll of SYNC_COLLECTIONS) {
    const byKey = new Map();

    for (const item of remote[coll] || []) {
      const key = entityKey(coll, item);
      if (key) byKey.set(key, item);
    }
    for (const item of local[coll] || []) {
      const key = entityKey(coll, item);
      if (!key) continue;
      const other = byKey.get(key);
      if (!other) byKey.set(key, item);
      // Gleichstand geht an den lokalen Stand: kein unnötiges Flackern.
      else if ((item.updatedAt || 0) >= (other.updatedAt || 0)) byKey.set(key, item);
    }

    out[coll] = [...byKey.entries()]
      .filter(([key, item]) => {
        const at = tomb[tombKey(coll, key)];
        return !(at && at >= (item.updatedAt || 0));
      })
      .map(([, item]) => item);
  }

  /* Skalare Bereiche. */
  out.meta.fieldUpdated = { ...(local.meta?.fieldUpdated || {}) };
  for (const f of SYNC_FIELDS) {
    const lt = local.meta?.fieldUpdated?.[f] || 0;
    const rt = remote.meta?.fieldUpdated?.[f] || 0;
    if (rt > lt && remote[f] !== undefined) {
      out[f] = remote[f];
      out.meta.fieldUpdated[f] = rt;
    }
  }

  out.meta.tombstones = pruneTombstones(tomb);
  if (!out.meta.created && remote.meta?.created) out.meta.created = remote.meta.created;

  /* Gerätelokales bleibt unangetastet. */
  for (const k of LOCAL_ONLY) out[k] = local[k];

  return out;
}

export function pruneTombstones(tomb, now = Date.now()) {
  const out = {};
  for (const [k, at] of Object.entries(tomb || {})) {
    if (now - at < TOMBSTONE_TTL_MS) out[k] = at;
  }
  return out;
}

/** Kurzfassung des Unterschieds — für Statusmeldungen. */
export function describeMerge(before, after) {
  const counts = {};
  for (const coll of SYNC_COLLECTIONS) {
    const d = (after[coll] || []).length - (before[coll] || []).length;
    if (d !== 0) counts[coll] = d;
  }
  return counts;
}
