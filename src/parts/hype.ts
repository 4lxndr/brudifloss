import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "hype",
  icon: "🚂",
  name: "Hype Train",
  w: 4,
  h: 2,
  weight: 15,
  buoy: 150,
  tough: 4,
  chaos: 0.2,
  chaosMsg: "🚂 Der Hype Train verliert Luft! Choo… choo…",
  flavor: "Level-5-Auftrieb. Industrie-Gummi. Tankt Felsen.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Kessel
  rr(ctx, x + w * 0.04, y + h * 0.34, w * 0.56, h * 0.36, h * 0.14, "#9146ff", "#5d2ba8");
  // Führerhaus
  rr(ctx, x + w * 0.6, y + h * 0.16, w * 0.32, h * 0.54, h * 0.08, "#7a35d6", "#5d2ba8");
  rr(ctx, x + w * 0.65, y + h * 0.22, w * 0.22, h * 0.2, h * 0.05, "#cfe8ff", "#5d2ba8");
  // Schornstein + Dampf
  rr(ctx, x + w * 0.12, y + h * 0.12, w * 0.09, h * 0.24, w * 0.02, "#5d2ba8");
  ctx.fillStyle = "rgba(230,230,240,0.8)";
  ctx.beginPath();
  ctx.arc(x + w * 0.19, y + h * 0.08, h * 0.06, 0, Math.PI * 2);
  ctx.arc(x + w * 0.25, y + h * 0.05, h * 0.045, 0, Math.PI * 2);
  ctx.fill();
  // Frontlicht
  ctx.fillStyle = "#ffe17a";
  ctx.beginPath();
  ctx.arc(x + w * 0.05, y + h * 0.5, h * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Räder
  for (const fx of [0.16, 0.42, 0.72]) {
    ctx.fillStyle = "#2b2b34";
    ctx.beginPath();
    ctx.arc(x + w * fx, y + h * 0.78, h * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b6b7a";
    ctx.beginPath();
    ctx.arc(x + w * fx, y + h * 0.78, h * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
}
