import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "matratze",
  icon: "🦩",
  name: "Luftmatratze",
  w: 3,
  h: 1,
  weight: 2,
  buoy: 45,
  tough: 1,
  chaos: 0.3,
  chaosMsg: "💥 POP! Die Luftmatratze ist GEPLATZT!",
  flavor: "Sehr rosa. Eventuell undicht.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Matratzen-Körper
  rr(ctx, x + w * 0.03, y + h * 0.42, w * 0.68, h * 0.4, h * 0.2, "#ff7fb0", "#c2517f");
  ctx.strokeStyle = "#c2517f";
  ctx.beginPath();
  for (const fx of [0.2, 0.37, 0.54]) {
    ctx.moveTo(x + w * fx, y + h * 0.45);
    ctx.lineTo(x + w * fx, y + h * 0.79);
  }
  ctx.stroke();
  // Flamingo-Hals + Kopf
  ctx.strokeStyle = "#ff7fb0";
  ctx.lineWidth = h * 0.14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.72, y + h * 0.6);
  ctx.quadraticCurveTo(x + w * 0.92, y + h * 0.55, x + w * 0.88, y + h * 0.28);
  ctx.stroke();
  ctx.fillStyle = "#ff7fb0";
  ctx.beginPath();
  ctx.arc(x + w * 0.88, y + h * 0.22, h * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // Schnabel
  ctx.fillStyle = "#2b2b34";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.94, y + h * 0.2);
  ctx.lineTo(x + w * 1.0 - 2, y + h * 0.28);
  ctx.lineTo(x + w * 0.93, y + h * 0.3);
  ctx.closePath();
  ctx.fill();
  // Auge
  ctx.beginPath();
  ctx.arc(x + w * 0.885, y + h * 0.2, h * 0.025, 0, Math.PI * 2);
  ctx.fill();
}
