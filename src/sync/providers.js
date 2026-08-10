/* ============================================================
   providers.js — Ablageorte für den Abgleich

   Jeder Anbieter kann genau zwei Dinge:
     read(cfg)           -> object | null
     write(cfg, payload) -> { gistId? }   (Änderungen an der Konfiguration)

   Damit lässt sich später jeder beliebige Dienst anflanschen,
   ohne die Sync-Logik anzufassen.
   ============================================================ */

const FILE_NAME = 'life-os-state.json';
const GH_API = 'https://api.github.com';

/** Abweichende Basis erlaubt GitHub Enterprise — und Tests gegen ein Doppel. */
function ghBase(cfg) {
  return (cfg.apiBase || GH_API).replace(/\/+$/, '');
}

function ghHeaders(cfg) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${cfg.token}`,
  };
}

async function ghError(res) {
  let detail = '';
  try { detail = (await res.json()).message || ''; } catch { /* egal */ }
  if (res.status === 401) return new Error('Token abgelehnt (401). Ist es noch gültig?');
  if (res.status === 403) return new Error('Zugriff verweigert (403). Fehlt dem Token die Gist-Berechtigung?');
  if (res.status === 404) return new Error('Gist nicht gefunden (404). Stimmt die Gist-ID?');
  return new Error(`GitHub antwortete mit ${res.status}${detail ? ': ' + detail : ''}`);
}

export const providers = {
  /* ---------------------------------------------------------- */
  gist: {
    id: 'gist',
    label: 'GitHub Gist',
    hint: 'Nutzt einen privaten Gist als Ablage. Nur ein Token nötig — kein neuer Dienst.',

    validate(cfg) {
      if (!cfg.token) return 'Ohne Token geht es nicht.';
      return null;
    },

    async read(cfg) {
      if (!cfg.gistId) return null;
      const res = await fetch(`${ghBase(cfg)}/gists/${cfg.gistId}`, { headers: ghHeaders(cfg), cache: 'no-store' });
      if (res.status === 404) return null;
      if (!res.ok) throw await ghError(res);
      const gist = await res.json();
      const file = gist.files?.[FILE_NAME];
      if (!file) return null;
      // Große Dateien liefert die API nur gekürzt — dann über raw_url nachladen.
      const text = file.truncated ? await (await fetch(file.raw_url, { cache: 'no-store' })).text() : file.content;
      if (!text) return null;
      try { return JSON.parse(text); } catch { throw new Error('Der Inhalt des Gists ist kein gültiges JSON.'); }
    },

    async write(cfg, payload) {
      const body = { files: { [FILE_NAME]: { content: JSON.stringify(payload) } } };
      let url = `${ghBase(cfg)}/gists/${cfg.gistId}`;
      let method = 'PATCH';
      if (!cfg.gistId) {
        url = `${ghBase(cfg)}/gists`;
        method = 'POST';
        body.description = 'L.I.F.E. OS — verschlüsselter Datenabgleich';
        body.public = false;
      }
      const res = await fetch(url, {
        method,
        headers: { ...ghHeaders(cfg), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await ghError(res);
      const gist = await res.json();
      return { gistId: gist.id };
    },
  },

  /* ---------------------------------------------------------- */
  rest: {
    id: 'rest',
    label: 'Eigener Server',
    hint: 'Beliebiger Endpunkt, der auf GET die Nutzlast liefert und sie auf PUT entgegennimmt.',

    validate(cfg) {
      if (!cfg.url) return 'Ohne Adresse geht es nicht.';
      if (!/^https?:\/\//.test(cfg.url)) return 'Die Adresse muss mit http:// oder https:// beginnen.';
      return null;
    },

    async read(cfg) {
      const res = await fetch(cfg.url, {
        headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
        cache: 'no-store',
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Server antwortete mit ${res.status}`);
      const text = await res.text();
      if (!text.trim()) return null;
      try { return JSON.parse(text); } catch { throw new Error('Antwort ist kein gültiges JSON.'); }
    },

    async write(cfg, payload) {
      const res = await fetch(cfg.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server antwortete mit ${res.status}`);
      return {};
    },
  },
};

export function getProvider(id) {
  return providers[id] || null;
}

/* ------------------------------------------------------------
   Kopplungscode — überträgt die Verbindungsdaten aufs zweite Gerät,
   damit dort kein 90-stelliges Token abgetippt werden muss.
   Das Kennwort ist bewusst NICHT enthalten.
   ------------------------------------------------------------ */
export function makePairingCode(cfg) {
  const data = { p: cfg.provider, g: cfg.gistId || '', u: cfg.url || '', t: cfg.token || '' };
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'LIFEOS-' + btoa(bin).replace(/=+$/, '');
}

export function readPairingCode(code) {
  const raw = String(code).trim().replace(/^LIFEOS-/, '');
  let json;
  try {
    const bin = atob(raw.replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('Der Kopplungscode ist unvollständig oder beschädigt.');
  }
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('Der Kopplungscode ist beschädigt.'); }
  if (!data.p || !providers[data.p]) throw new Error('Unbekannter Anbieter im Kopplungscode.');
  return { provider: data.p, gistId: data.g || '', url: data.u || '', token: data.t || '' };
}
