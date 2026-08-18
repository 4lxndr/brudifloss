import type { Ctx2D } from "./types";

// Abgerundetes Rechteck mit Füllung (und optionaler Kontur) — der Grundbaustein aller Zeichnungen.
export function rr(
  ctx: Ctx2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
