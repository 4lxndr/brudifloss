import type { Ctx2D, PartDef } from "../types";

export const def: PartDef = {
  id: "ente",
  icon: "🦆",
  name: "Gummiente XXL",
  w: 2,
  h: 2,
  weight: 6,
  buoy: 70,
  tough: 1,
  chaos: 0.15,
  chaosMsg: "🦆 Die Ente ist GEPLATZT! RIP Quietschie.",
  flavor: "Quietscht bedrohlich. Platzt bei Blickkontakt.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Körper
  ctx.fillStyle = "#ffd23e";
  ctx.strokeStyle = "#c79a1a";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.45, y + h * 0.64, w * 0.38, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Schwanz-Zipfel
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y + h * 0.52);
  ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.36, x + w * 0.16, y + h * 0.4);
  ctx.closePath();
  ctx.fillStyle = "#ffd23e";
  ctx.fill();
  // Kopf
  ctx.beginPath();
  ctx.arc(x + w * 0.68, y + h * 0.3, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Schnabel
  ctx.fillStyle = "#f5871f";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.87, y + h * 0.33, w * 0.1, h * 0.06, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Auge
  ctx.fillStyle = "#2b2b34";
  ctx.beginPath();
  ctx.arc(x + w * 0.71, y + h * 0.25, h * 0.035, 0, Math.PI * 2);
  ctx.fill();
  // Flügel
  ctx.strokeStyle = "#c79a1a";
  ctx.beginPath();
  ctx.arc(x + w * 0.42, y + h * 0.62, w * 0.14, Math.PI * 0.2, Math.PI * 1.1);
  ctx.stroke();
}
