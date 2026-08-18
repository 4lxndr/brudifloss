import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "stuhl",
  icon: "🪑",
  name: "Gaming-Stuhl",
  w: 1,
  h: 2,
  weight: 30,
  buoy: 2,
  tough: 3,
  comfort: 2,
  flavor: "Null Auftrieb, aber ERGONOMIE.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Rückenlehne
  rr(ctx, x + w * 0.16, y + h * 0.06, w * 0.3, h * 0.5, w * 0.1, "#2b2b34", "#141419");
  rr(ctx, x + w * 0.24, y + h * 0.1, w * 0.14, h * 0.4, w * 0.06, "#c0392b");
  // Sitzfläche
  rr(ctx, x + w * 0.14, y + h * 0.54, w * 0.62, h * 0.12, w * 0.05, "#2b2b34", "#141419");
  // Gasfeder + Fußkreuz
  ctx.strokeStyle = "#6b6b7a";
  ctx.lineWidth = w * 0.08;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.45, y + h * 0.66);
  ctx.lineTo(x + w * 0.45, y + h * 0.82);
  ctx.stroke();
  ctx.lineWidth = w * 0.06;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + h * 0.92);
  ctx.lineTo(x + w * 0.45, y + h * 0.82);
  ctx.lineTo(x + w * 0.72, y + h * 0.92);
  ctx.stroke();
  // Rollen
  ctx.fillStyle = "#141419";
  for (const fx of [0.18, 0.72]) {
    ctx.beginPath();
    ctx.arc(x + w * fx, y + h * 0.94, w * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
}
