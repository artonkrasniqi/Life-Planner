/* ============================================================
   seed.js — Demo-Datensatz (relativ zum heutigen Datum)
   ============================================================ */

import { uid, todayISO, toISODate, addDays, parseLocal } from './util.js';

const D = (n) => toISODate(addDays(new Date(), n));
const DT = (n, hhmm) => `${D(n)}T${hhmm}`;

export function buildSeed() {
  const accounts = [
    { id: uid(), name: 'Girokonto', type: 'Giro', balance: 3240.55 },
    { id: uid(), name: 'Tagesgeld', type: 'Sparen', balance: 8100.0 },
    { id: uid(), name: 'Bargeld', type: 'Bar', balance: 180.0 },
  ];
  const giro = accounts[0].id;
  const spar = accounts[1].id;

  /* --- Transaktionen: letzte 5 Monate, wiederkehrend + Streuung --- */
  const transactions = [];
  const push = (date, amount, category, note, accountId = giro) =>
    transactions.push({ id: uid(), date, amount, category, note, accountId });

  const now = new Date();
  for (let mAgo = 4; mAgo >= 0; mAgo--) {
    const base = new Date(now.getFullYear(), now.getMonth() - mAgo, 1);
    const y = base.getFullYear(), m = base.getMonth();
    const day = (d) => toISODate(new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())));
    const isCurrent = mAgo === 0;
    const maxDay = isCurrent ? now.getDate() : 31;
    const on = (d) => (d <= maxDay ? day(d) : null);

    const add = (d, amount, category, note, acc) => {
      const date = on(d);
      if (date) push(date, amount, category, note, acc);
    };

    add(1, 3180 + Math.round(Math.random() * 120), 'Gehalt', 'Gehalt');
    add(2, -1150, 'Miete', 'Miete + Nebenkosten');
    add(3, -420, 'Schuldenrate', 'Rate: Autokredit');
    add(3, -180, 'Schuldenrate', 'Rate: Studienkredit');
    add(4, -62.9, 'Abos', 'Handy + Internet');
    add(5, -29.9, 'Abos', 'Fitnessstudio');
    add(5, -17.99, 'Abos', 'Streaming');
    add(6, -400, 'Sonstiges', 'Übertrag Tagesgeld', spar);
    add(8, -128.4, 'Lebensmittel', 'Wocheneinkauf');
    add(9, -55, 'Transport', 'Tanken');
    add(12, -96.2, 'Lebensmittel', 'Wocheneinkauf');
    add(14, -74, 'Freizeit', 'Essen gehen');
    add(15, -49, 'Versicherung', 'Haftpflicht');
    add(16, -112.8, 'Lebensmittel', 'Wocheneinkauf');
    add(18, -58, 'Transport', 'Tanken');
    add(19, -139, 'Shopping', 'Laufschuhe');
    add(21, -34.5, 'Gesundheit', 'Apotheke');
    add(22, -105.6, 'Lebensmittel', 'Wocheneinkauf');
    add(24, -42, 'Freizeit', 'Kino + Bar');
    add(26, 260, 'Nebenjob', 'Freelance-Auftrag');
    add(27, -88.9, 'Lebensmittel', 'Wocheneinkauf');
    add(28, -31, 'Transport', 'ÖPNV-Ticket');
  }

  /* --- Schulden --- */
  const debts = [
    {
      id: uid(), creditor: 'Autokredit — Bank', type: 'Auto',
      principal: 18500, remaining: 9420.5, rate: 4.9, minPayment: 420,
      startDate: D(-780), payments: [], note: 'Laufzeit 60 Monate',
    },
    {
      id: uid(), creditor: 'Studienkredit (KfW)', type: 'Studium',
      principal: 14000, remaining: 6180.0, rate: 3.4, minPayment: 180,
      startDate: D(-1600), payments: [], note: '',
    },
    {
      id: uid(), creditor: 'Kreditkarte', type: 'Kreditkarte',
      principal: 2400, remaining: 640.2, rate: 16.9, minPayment: 120,
      startDate: D(-210), payments: [], note: 'Zuerst tilgen — höchster Zins',
    },
    {
      id: uid(), creditor: 'Privat — Marco', type: 'Privat',
      principal: 1500, remaining: 500, rate: 0, minPayment: 100,
      startDate: D(-300), payments: [], note: 'Zinsfrei',
    },
  ];

  /* --- Termine --- */
  const events = [
    { id: uid(), title: 'Standup Team', date: DT(0, '09:00'), durationMin: 15, category: 'Arbeit', location: 'Teams', notes: '', done: false },
    { id: uid(), title: 'Krafttraining — Push', date: DT(0, '18:30'), durationMin: 75, category: 'Sport', location: 'Gym', notes: 'Bank, Schulter, Trizeps', done: false },
    { id: uid(), title: 'Zahnarzt Kontrolle', date: DT(2, '10:30'), durationMin: 45, category: 'Gesundheit', location: 'Praxis Dr. Weber', notes: '', done: false },
    { id: uid(), title: 'Quartalsreview', date: DT(3, '14:00'), durationMin: 90, category: 'Arbeit', location: 'Raum 4.02', notes: 'Zahlen vorbereiten', done: false },
    { id: uid(), title: 'Abendessen mit Familie', date: DT(4, '19:00'), durationMin: 120, category: 'Familie', location: 'Zuhause', notes: '', done: false },
    { id: uid(), title: 'Laufeinheit 10 km', date: DT(5, '07:00'), durationMin: 60, category: 'Sport', location: 'Park', notes: '', done: false },
    { id: uid(), title: 'Beratung Finanzen', date: DT(9, '11:00'), durationMin: 60, category: 'Finanzen', location: 'Bankfiliale', notes: 'Umschuldung Kreditkarte prüfen', done: false },
    { id: uid(), title: 'Wochenendtrip', date: D(16), durationMin: 0, category: 'Reise', location: 'Bodensee', notes: '', done: false },
    { id: uid(), title: 'Kickoff Projekt Nova', date: DT(-3, '10:00'), durationMin: 60, category: 'Arbeit', location: 'Teams', notes: '', done: true },
  ];

  /* --- To-dos --- */
  const todos = [
    { id: uid(), title: 'Kreditkarte zuerst tilgen — Sonderzahlung planen', notes: 'Höchster Zinssatz, größter Hebel.', priority: 'critical', due: D(1), tags: ['finanzen'], done: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: uid(), title: 'Quartalszahlen aufbereiten', notes: '', priority: 'high', due: D(2), tags: ['arbeit'], done: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: uid(), title: 'Steuerunterlagen sortieren', notes: 'Belege 2025 scannen', priority: 'normal', due: D(-2), tags: ['finanzen', 'admin'], done: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: uid(), title: 'Trainingsplan überarbeiten', notes: 'Push/Pull/Legs auf 4 Tage', priority: 'normal', due: D(6), tags: ['sport'], done: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: uid(), title: 'Versicherung vergleichen', notes: '', priority: 'low', due: D(20), tags: ['admin'], done: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: uid(), title: 'Geschenk für Mama besorgen', notes: '', priority: 'high', due: D(0), tags: ['privat'], done: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: uid(), title: 'Whoop-Daten exportieren', notes: '', priority: 'low', due: '', tags: ['health'], done: true, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    { id: uid(), title: 'Wocheneinkauf', notes: '', priority: 'normal', due: D(-1), tags: ['privat'], done: true, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
  ];

  /* --- Biometrie: 60 Tage plausible Whoop-Zeitreihe --- */
  const bio = [];
  let hrvBase = 68, rhrBase = 52;
  for (let i = 59; i >= 0; i--) {
    const date = D(-i);
    const dow = parseLocal(date).getDay();
    const weekend = dow === 0 || dow === 6;
    const wave = Math.sin(i / 6.5) * 9 + Math.sin(i / 2.1) * 4;
    const noise = (Math.random() - 0.5) * 12;

    hrvBase += (Math.random() - 0.48) * 2.2;
    hrvBase = Math.max(38, Math.min(96, hrvBase));
    rhrBase += (Math.random() - 0.5) * 0.8;
    rhrBase = Math.max(45, Math.min(62, rhrBase));

    const sleepHours = Math.max(4.4, Math.min(9.2, (weekend ? 8.0 : 7.1) + (Math.random() - 0.5) * 1.7));
    const recovery = Math.round(Math.max(12, Math.min(99, 58 + wave + noise + (sleepHours - 7) * 7)));
    const strain = Math.max(4, Math.min(20.5, (weekend ? 9 : 12.5) + (Math.random() - 0.4) * 5 + (recovery > 66 ? 2.2 : -1.4)));

    bio.push({
      id: uid(),
      date,
      source: 'whoop',
      recovery,
      strain: Number(strain.toFixed(1)),
      hrv: Math.round(hrvBase + (recovery - 58) * 0.22),
      rhr: Math.round(rhrBase - (recovery - 58) * 0.05),
      sleepHours: Number(sleepHours.toFixed(2)),
      sleepPerf: Math.round(Math.max(45, Math.min(100, (sleepHours / 8.1) * 100 + (Math.random() - 0.5) * 8))),
      calories: Math.round(2200 + strain * 95 + (Math.random() - 0.5) * 180),
      respRate: Number((14.4 + (Math.random() - 0.5) * 1.1).toFixed(1)),
      spo2: Number((95.5 + Math.random() * 2.4).toFixed(1)),
    });
  }

  return {
    schema: 1,
    profile: { name: 'Arton', currency: 'EUR', monthlyIncomeTarget: 3200 },
    ui: { debtsHidden: true, view: 'dashboard' },
    events,
    todos,
    accounts,
    transactions,
    budgets: {
      Lebensmittel: 450,
      Freizeit: 200,
      Transport: 180,
      Shopping: 150,
      Abos: 120,
    },
    debts,
    bio,
    integrations: {
      whoop: { connected: true, lastSync: new Date().toISOString(), note: 'Demo-Zeitreihe' },
      garmin: { connected: false, lastSync: null, note: '' },
    },
    meta: { created: todayISO(), seeded: true },
  };
}
