import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "wanne",
  icon: "🛁",
  name: "Alte Badewanne",
  w: 3,
  h: 2,
  weight: 45,
  buoy: 120,
  tough: 5,
  chaos: 0.25,
  chaosMsg: "🕳️ Die Badewanne hat ein LOCH!",
  flavor: "Vintage. Gusseisen. Stöpsel fehlt.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  rr(ctx, x + w * 0.04, y + h * 0.3, w * 0.92, h * 0.44, h * 0.2, "#eef2f5", "#93a1ac");
  // Innenkante
  ctx.strokeStyle = "#b7c2cb";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.08, y + h * 0.38);
  ctx.lineTo(x + w * 0.92, y + h * 0.38);
  ctx.stroke();
  // Füße
  ctx.fillStyle = "#93a1ac";
  for (const fx of [0.2, 0.8]) {
    ctx.beginPath();
    ctx.arc(x + w * fx, y + h * 0.8, h * 0.07, 0, Math.PI);
    ctx.fill();
  }
  // Wasserhahn
  ctx.strokeStyle = "#7d8a94";
  ctx.lineWidth = h * 0.06;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y + h * 0.28);
  ctx.lineTo(x + w * 0.12, y + h * 0.14);
  ctx.lineTo(x + w * 0.2, y + h * 0.14);
  ctx.lineTo(x + w * 0.2, y + h * 0.2);
  ctx.stroke();
  // Tropfen
  ctx.fillStyle = "#5dade2";
  ctx.beginPath();
  ctx.arc(x + w * 0.2, y + h * 0.26, h * 0.03, 0, Math.PI * 2);
  ctx.fill();
}
