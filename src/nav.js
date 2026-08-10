/* Kleiner Vermittler, damit Views navigieren/neu rendern können,
   ohne main.js zu importieren (vermeidet Zirkelbezüge). */

let navHandler = () => {};
let refreshHandler = () => {};

export function setNavigator(fn) { navHandler = fn; }
export function setRefresher(fn) { refreshHandler = fn; }

/** Wechselt die Ansicht. */
export function go(view, params) { navHandler(view, params); }

/** Rendert die aktuelle Ansicht neu (ohne Zustandsänderung). */
export function refresh() { refreshHandler(); }
