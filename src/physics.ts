/* Physik & Analyse der gebauten Form: Auftrieb, Schwerpunkt, Zusammenhalt, Risiko. */

import type { PartDef, PlacedPart, Structure } from "./types";
import { BRUDI_WEIGHT, CT } from "./config";

export function cellsOf(p: PlacedPart): [number, number][] {
  const out: [number, number][] = [];
  for (let c = p.col; c < p.col + p.def.w; c++)
    for (let r = p.row; r < p.row + p.def.h; r++) out.push([c, r]);
  return out;
}

// Wie viele Zellkanten teilt ein Teil mit dem Rest? (1 = nur ein Knoten = wackelig)
export function contactCount(part: PlacedPart, parts: PlacedPart[]): number {
  let n = 0;
  for (const [c, r] of cellsOf(part))
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (
        parts.some(
          (p) =>
            p !== part &&
            c + dc >= p.col &&
            c + dc < p.col + p.def.w &&
            r + dr >= p.row &&
            r + dr < p.row + p.def.h,
        )
      )
        n++;
  return n;
}

// Zerlege die gebauten Teile in zusammenhängende Gruppen (Flood-Fill über Nachbarschaft).
export function components(parts: PlacedPart[]): PlacedPart[][] {
  const groups: PlacedPart[][] = [];
  const seen = new Set<PlacedPart>();
  const adjacent = (a: PlacedPart, b: PlacedPart) => {
    for (const [c1, r1] of cellsOf(a))
      for (const [c2, r2] of cellsOf(b))
        if (Math.abs(c1 - c2) + Math.abs(r1 - r2) === 1) return true;
    return false;
  };
  for (const p of parts) {
    if (seen.has(p)) continue;
    const group = [p];
    seen.add(p);
    for (let i = 0; i < group.length; i++)
      for (const q of parts)
        if (!seen.has(q) && adjacent(group[i], q)) {
          seen.add(q);
          group.push(q);
        }
    groups.push(group);
  }
  return groups;
}

// Wo stellt sich Brudi hin? Oberste Zelle der Spalte, die dem Massezentrum am nächsten ist.
export function standCell(parts: PlacedPart[]): [number, number] | null {
  if (!parts.length) return null;
  let mx = 0,
    mw = 0;
  for (const p of parts) {
    mx += (p.col + p.def.w / 2) * p.def.weight + (p.col + p.def.w / 2);
    mw += p.def.weight + 1;
  }
  const target = mx / mw;
  const cols = new Map<number, number>(); // col -> min row
  for (const p of parts)
    for (const [c, r] of cellsOf(p)) cols.set(c, Math.min(cols.get(c) ?? 99, r));
  let best: [number, number] | null = null;
  for (const [c, r] of cols)
    if (!best || Math.abs(c + 0.5 - target) < Math.abs(best[0] + 0.5 - target)) best = [c, r];
  return best; // [col, topRow]
}

// Baut das Physik-Modell der Hauptstruktur.
export function buildStructure(parts: PlacedPart[]): Structure {
  let minCol = 99,
    maxCol = -1,
    minRow = 99,
    maxRow = -1;
  for (const p of parts)
    for (const [c, r] of cellsOf(p)) {
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
    }
  const Wpx = (maxCol - minCol + 1) * CT;
  const Hpx = (maxRow - minRow + 1) * CT;

  const cells: Structure["cells"] = [];
  for (const p of parts)
    for (const [c, r] of cellsOf(p))
      cells.push({
        part: p,
        x: (c - minCol + 0.5) * CT,
        hb: Hpx - (r - minRow + 1) * CT, // Höhe der Zell-Unterkante über Strukturboden
        cap: p.def.buoy / (p.def.w * p.def.h),
      });

  const sc = standCell(parts)!;
  const standX = (sc[0] - minCol + 0.5) * CT;
  const standY = (sc[1] - minRow) * CT; // localY (von oben) der Standfläche

  const weight = BRUDI_WEIGHT + parts.reduce((s, p) => s + p.def.weight, 0);
  let mx = BRUDI_WEIGHT * standX,
    my = BRUDI_WEIGHT * (standY - 30);
  for (const p of parts) {
    mx += p.def.weight * ((p.col - minCol + p.def.w / 2) * CT);
    my += p.def.weight * ((p.row - minRow + p.def.h / 2) * CT);
  }
  return {
    parts,
    minCol,
    minRow,
    Wpx,
    Hpx,
    cells,
    standX,
    standY,
    weight,
    cmx: mx / weight,
    cmy: my / weight,
  };
}

// Auftrieb (und dessen Zentrum) bei Eintauchtiefe d.
export function capAt(st: Structure, d: number) {
  let cap = 0,
    cbx = 0;
  for (const c of st.cells) {
    const eff = c.part.broken ? c.cap * 0.08 : c.cap;
    const frac = Math.max(0, Math.min(1, (d - c.hb) / CT));
    cap += eff * frac;
    cbx += eff * frac * c.x;
  }
  return { cap, cbx: cap > 0 ? cbx / cap : st.Wpx / 2 };
}

// Eintauchtiefe im Gleichgewicht (oder null, wenn's nicht reicht).
export function solveDepth(st: Structure): number | null {
  const { cap } = capAt(st, st.Hpx + 0.1);
  if (cap < st.weight) return null;
  let lo = 0,
    hi = st.Hpx;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (capAt(st, mid).cap < st.weight) lo = mid;
    else hi = mid;
  }
  return hi;
}

/* ---------- Risiko-Analyse (Raketen mögen große Flöße) ---------- */

export function topfiCountOf(parts: { def: PartDef }[]): number {
  return parts.filter((p) => p.def.id === "topfi").length;
}

// Monokulturen sind verdächtig: mehr als 5 gleiche Teile (Topfi: mehr als 2)
// treiben das Risiko hoch. Nudel-Farmen und Matratzen-Teppiche inklusive.
export function spamPenalty(parts: { def: PartDef }[]): number {
  const counts: Record<string, number> = {};
  for (const p of parts) counts[p.def.id] = (counts[p.def.id] || 0) + 1;
  let pen = 0;
  for (const [id, n] of Object.entries(counts)) {
    const over = n - (id === "topfi" ? 2 : 5);
    if (over > 0) pen += over * (id === "topfi" ? 0.09 : 0.05);
  }
  return pen;
}

// Das am dreistesten gespammte Teil (für die Satelliten-Warnung).
export function worstSpam(parts: { def: PartDef }[]): { def: PartDef; over: number } | null {
  const counts = new Map<PartDef, number>();
  for (const p of parts) counts.set(p.def, (counts.get(p.def) || 0) + 1);
  let worst: { def: PartDef; over: number } | null = null;
  for (const [def, n] of counts) {
    const over = n - (def.id === "topfi" ? 2 : 5);
    if (over > 0 && (!worst || over > worst.over)) worst = { def, over };
  }
  return worst;
}

export function rocketRisk(parts: { def: PartDef }[]): number {
  const cells = parts.reduce((s, p) => s + p.def.w * p.def.h, 0);
  const base = Math.min(0.35, cells * 0.008);
  return Math.min(0.95, base + spamPenalty(parts));
}
