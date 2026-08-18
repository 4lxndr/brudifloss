import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "strudel",
  icon: "🥧",
  name: "Apfelstrudel",
  w: 2,
  h: 1,
  weight: 5,
  buoy: 10,
  tough: 1,
  comfort: 1,
  max: 3,
  chaos: 0.5,
  chaosMsg: "😋 Brudi hat den Apfelstrudel GEGESSEN. Es war es wert.",
  brokenIcon: "😋",
  flavor: "Tragendes Bauteil UND Proviant. Mehr als 3 passen nicht in die Kühlbox.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Teigrolle
  rr(ctx, x + w * 0.06, y + h * 0.34, w * 0.88, h * 0.44, h * 0.2, "#d9a441", "#a3742a");
  // Querkerben mit Füllung
  for (const fx of [0.26, 0.46, 0.66]) {
    ctx.strokeStyle = "#a3742a";
    ctx.beginPath();
    ctx.moveTo(x + w * fx, y + h * 0.36);
    ctx.quadraticCurveTo(x + w * (fx + 0.04), y + h * 0.56, x + w * fx, y + h * 0.76);
    ctx.stroke();
    ctx.fillStyle = "#8f5b23";
    ctx.beginPath();
    ctx.arc(x + w * (fx + 0.05), y + h * 0.56, h * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  // Puderzucker
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (const [px, py] of [
    [0.2, 0.4],
    [0.4, 0.38],
    [0.58, 0.42],
    [0.78, 0.4],
    [0.32, 0.46],
    [0.68, 0.46],
  ]) {
    ctx.beginPath();
    ctx.arc(x + w * px, y + h * py, h * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dampf
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = h * 0.04;
  for (const fx of [0.35, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(x + w * fx, y + h * 0.28);
    ctx.quadraticCurveTo(x + w * (fx - 0.04), y + h * 0.18, x + w * fx, y + h * 0.08);
    ctx.stroke();
  }
}
