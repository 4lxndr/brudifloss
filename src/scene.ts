/* Das Fluss-Rendering: Himmel, Ufer, Wasser, Floß, Brudi, Gegner, Effekte. */

import type { Ctx2D } from "./types";
import { CT, FACE, GOAL_M, PXPM } from "./config";
import { canvas, sim, waveAt } from "./state";
import { drawFifthMark, drawPartRect } from "./painters";

export function draw() {
  const c = canvas(),
    ctx = c.getContext("2d")!;
  const W = c.width / devicePixelRatio,
    H = c.height / devicePixelRatio;
  const shx = (Math.random() - 0.5) * sim.shake * 16;
  const shy = (Math.random() - 0.5) * sim.shake * 16;
  ctx.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    shx * devicePixelRatio,
    shy * devicePixelRatio,
  );

  const time = sim.t;
  const waterBase = H * 0.62;
  const raftX = W * 0.44;

  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, waterBase);
  sky.addColorStop(0, "#2a6ac7");
  sky.addColorStop(1, "#a8d8f0");
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, W + 40, waterBase + 60);

  // Sonne, Wolken, Möwe
  ctx.fillStyle = "#ffe17a";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.13, 34, 0, Math.PI * 2);
  ctx.fill();
  const cloudAt = (cx: number, cy: number, s: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(cx + s * 0.22, cy, s * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.48, cy - s * 0.14, s * 0.26, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.74, cy - s * 0.02, s * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220,230,240,0.9)";
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.48, cy + s * 0.1, s * 0.44, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  cloudAt(((performance.now() / 120) % (W + 260)) - 130, H * 0.12, 110);
  cloudAt(((performance.now() / 180 + 300) % (W + 260)) - 130, H * 0.22, 85);
  cloudAt(((performance.now() / 150 + 600) % (W + 260)) - 130, H * 0.07, 65);
  drawMonkeyPigeon(ctx, W, H);
  drawUmbrellaMonkey(ctx, raftX, W, H);

  // Ufer: Hügel + Bäume ziehen vorbei (Parallaxe)
  const scroll = (sim.dist || 0) * PXPM;
  ctx.fillStyle = "#2e6b45";
  ctx.beginPath();
  ctx.moveTo(-20, waterBase + 10);
  for (let x = -20; x <= W + 20; x += 16) {
    ctx.lineTo(
      x,
      waterBase -
        42 +
        Math.sin((x + scroll * 0.35) * 0.008) * 16 +
        Math.sin((x + scroll * 0.35) * 0.02) * 6,
    );
  }
  ctx.lineTo(W + 20, waterBase + 10);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const treeGap = 110,
    treeOff = scroll * 0.35;
  for (let x = -(treeOff % treeGap) - treeGap; x < W + treeGap; x += treeGap) {
    const idx = Math.round((x + treeOff) / treeGap);
    const size = 30 + ((idx * 37) % 22);
    const tx = x + ((idx * 53) % 30);
    const ty = waterBase - 22 + ((idx * 29) % 10);
    const green = ["#2f7d4a", "#3c9159", "#27693e"][((idx % 3) + 3) % 3];
    // Stamm
    ctx.fillStyle = "#6e4a2a";
    ctx.fillRect(tx - size * 0.06, ty - size * 0.24, size * 0.12, size * 0.26);
    ctx.fillStyle = green;
    if (idx % 2 === 0) {
      // Tanne: drei gestaffelte Dreiecke
      for (let i = 0; i < 3; i++) {
        const ly = ty - size * (0.2 + i * 0.3);
        const lw = size * (0.5 - i * 0.11);
        ctx.beginPath();
        ctx.moveTo(tx - lw, ly);
        ctx.lineTo(tx + lw, ly);
        ctx.lineTo(tx, ly - size * 0.42);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Laubbaum: Kronen-Kreise
      ctx.beginPath();
      ctx.arc(tx, ty - size * 0.62, size * 0.34, 0, Math.PI * 2);
      ctx.arc(tx - size * 0.2, ty - size * 0.45, size * 0.24, 0, Math.PI * 2);
      ctx.arc(tx + size * 0.2, ty - size * 0.45, size * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ufer-Cameos (Ägypten, Amsterdam, McCarry, Koffer)
  drawCameos(ctx, raftX, W, waterBase, time);

  // Struktur + Brudi + Treibgut (vor dem Wasser gezeichnet → schimmert durch)
  drawStructure(ctx, raftX, waterBase, time);
  drawDrifters(ctx, raftX, waterBase, time);
  drawMayflies(ctx, raftX, waterBase, 0);
  if (sim.freeBrudi) {
    ctx.save();
    ctx.translate(sim.freeBrudi.x, sim.freeBrudi.y);
    drawBrudi(ctx, 0, 20, time, true);
    ctx.restore();
  }

  // Wasser
  for (const [alpha, speed, off] of [
    [0.75, 1, 0],
    [0.45, 1.5, 30],
  ]) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      ctx.lineTo(x, waterBase + off * 0.3 + waveAt(x + off * 40, time * speed));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, waterBase, 0, H);
    grad.addColorStop(0, `rgba(30, 120, 200, ${alpha})`);
    grad.addColorStop(1, `rgba(8, 40, 90, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Felsen ragen aus dem Wasser (fest verankert — Felsen wackeln nicht)
  for (const rock of sim.rocks || []) {
    const sx = raftX + (rock.m - sim.dist) * PXPM;
    if (sx < -120 || sx > W + 120) continue;
    const sy = waterBase + 8;
    ctx.fillStyle = rock.hit ? "#565b63" : "#6d737d";
    ctx.beginPath();
    ctx.moveTo(sx - rock.size, sy + 14);
    ctx.quadraticCurveTo(
      sx - rock.size * 0.6,
      sy - rock.size,
      sx + rock.size * 0.15,
      sy - rock.size * 0.95,
    );
    ctx.quadraticCurveTo(sx + rock.size * 0.8, sy - rock.size * 0.6, sx + rock.size, sy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#464b52";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 8, rock.size * 1.1, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPoliceBoat(ctx, raftX, waterBase, time);

  // Gischt in Stromschnellen
  for (const z of sim.zones || []) {
    const zs = raftX + (z.s - sim.dist) * PXPM;
    const ze = raftX + (z.e - sim.dist) * PXPM;
    if (ze < 0 || zs > W) continue;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let x = Math.max(0, zs); x < Math.min(W, ze); x += 18) {
      if (Math.random() < 0.6) {
        ctx.beginPath();
        ctx.arc(
          x + Math.random() * 12,
          waterBase + waveAt(x, time) + Math.random() * 6,
          2 + Math.random() * 4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  // Der Ziel-Steg
  const goalX = raftX + (GOAL_M - sim.dist) * PXPM;
  if (goalX < W + 260) drawGoal(ctx, goalX, waterBase);

  drawRocket(ctx, raftX, waterBase);
  drawBomber(ctx, raftX, waterBase, W, H, time);
  drawExplosion(ctx, waterBase);

  // Partikel
  for (const p of sim.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    if (p.type === "bubble") {
      ctx.strokeStyle = "#bfe6ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === "banana") {
      // Der Affe verliert gelegentlich eine Banane. Niemand fragt, warum.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 4);
      ctx.strokeStyle = "#ffd23e";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, 6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#cfeaff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Große Maifliegen ganz vorn — für das echte Schwarm-Gefühl
  drawMayflies(ctx, raftX, waterBase, 1);

  // Nuklearer Weißblitz
  if (sim.nukeFlash > 0) {
    ctx.globalAlpha = Math.min(1, sim.nukeFlash);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.globalAlpha = 1;
  }
}

// Ziel-Steg samt (sehr seltener) Beamten-Delegation.
export function drawGoal(ctx: Ctx2D, goalX: number, waterBase: number) {
  const gy = waterBase - 26;
  ctx.fillStyle = "#6e4620";
  for (const px of [goalX + 20, goalX + 90, goalX + 160]) ctx.fillRect(px, gy, 10, 60);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(goalX, gy - 12, 220, 14);
  ctx.strokeStyle = "#5c3a18";
  ctx.strokeRect(goalX, gy - 12, 220, 14);
  ctx.font = "30px serif";
  ctx.textAlign = "center";
  ctx.fillText("🏁", goalX + 30, gy - 20);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("ZIEL-STEG", goalX + 120, gy - 22);

  // Sehr selten: zwei Beamte warten am Steg. Routinekontrolle.
  if (sim.blizzcon) {
    for (const ox of [180, 205]) {
      const px = goalX + ox;
      // Anzug
      ctx.fillStyle = "#22242c";
      ctx.beginPath();
      ctx.roundRect(px - 6, gy - 40, 12, 28, 3);
      ctx.fill();
      // Kopf + Sonnenbrille
      ctx.fillStyle = "#eab68f";
      ctx.beginPath();
      ctx.arc(px, gy - 46, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillRect(px - 5, gy - 48, 10, 3);
    }
    // Handschellen beim linken Beamten
    ctx.strokeStyle = "#c0c6cc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(goalX + 174, gy - 16, 3, 0, Math.PI * 2);
    ctx.arc(goalX + 181, gy - 15, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Maifliegen: kleine wuselnde weiße Punkte mit Flügelchen, in zwei Tiefenebenen.
export function drawMayflies(ctx: Ctx2D, raftX: number, waterBase: number, layer: number) {
  const mf = sim.mayflies;
  if (!mf || mf.intensity <= 0) return;
  const t = performance.now() / 1000;
  const n = Math.floor(mf.intensity * (layer === 0 ? 60 : 12));
  for (let i = 0; i < n; i++) {
    const seed = i * 127.3 + layer * 571;
    const bx =
      raftX +
      Math.sin(seed) * (150 + ((seed * 3) % 120)) +
      Math.sin(t * (1.5 + (i % 5) * 0.5) + seed) * 34;
    const by = waterBase - 50 - ((seed * 7) % 150) + Math.cos(t * (2 + (i % 3)) + seed * 2) * 22;
    const s = layer === 0 ? 1.2 + (i % 3) * 0.5 : 3.5 + (i % 3) * 1.4;
    // Körper
    ctx.fillStyle = "rgba(246,246,236,0.9)";
    ctx.beginPath();
    ctx.ellipse(bx, by, s, s * 0.5, seed % 3, 0, Math.PI * 2);
    ctx.fill();
    // Flügelchen (flirren)
    const flap = 0.5 + Math.abs(Math.sin(t * 26 + i)) * 0.6;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(bx - s * 0.7, by - s * 0.8, s * 0.9, s * 0.45 * flap, -0.7, 0, Math.PI * 2);
    ctx.ellipse(bx + s * 0.7, by - s * 0.8, s * 0.9, s * 0.45 * flap, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Ufer-Cameos: frühere Abenteuer als Kulisse am Wegesrand.
export function drawCameos(ctx: Ctx2D, raftX: number, W: number, waterBase: number, time: number) {
  for (const cam of sim.cameos || []) {
    const sx = raftX + (cam.atM - (sim.dist || 0)) * PXPM;
    // Ferne Kulisse (Pyramiden) zieht langsamer vorbei — gleiche Parallaxe wie die Bäume
    const sxFar = raftX + (cam.atM - (sim.dist || 0)) * PXPM * 0.35;
    if ((sx < -260 || sx > W + 260) && (sxFar < -200 || sxFar > W + 200)) continue;
    const gy = waterBase - 24;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    if (cam.id === "egypt") {
      // Pyramiden weit hinten am Horizont (Parallaxe wie die Bäume)
      for (const [ox, s] of [
        [-50, 58],
        [24, 40],
      ]) {
        ctx.fillStyle = "#d9b87a";
        ctx.strokeStyle = "#b3945a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sxFar + ox - s, gy);
        ctx.lineTo(sxFar + ox + s, gy);
        ctx.lineTo(sxFar + ox, gy - s * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Kamel
      ctx.fillStyle = "#c69a5e";
      ctx.beginPath();
      ctx.ellipse(sx + 92, gy - 12, 16, 8, 0, 0, Math.PI * 2); // Körper
      ctx.arc(sx + 88, gy - 22, 5, 0, Math.PI * 2); // Höcker 1
      ctx.arc(sx + 98, gy - 21, 4.5, 0, Math.PI * 2); // Höcker 2
      ctx.fill();
      ctx.strokeStyle = "#c69a5e";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx + 106, gy - 14); // Hals
      ctx.lineTo(sx + 112, gy - 26);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(sx + 114, gy - 28, 4, 2.5, 0.3, 0, Math.PI * 2); // Kopf
      ctx.fillStyle = "#c69a5e";
      ctx.fill();
      ctx.lineWidth = 2.5;
      for (const lx of [84, 90, 96, 101]) {
        ctx.beginPath();
        ctx.moveTo(sx + lx, gy - 8);
        ctx.lineTo(sx + lx, gy + 2);
        ctx.stroke();
      }
      // Schild
      ctx.strokeStyle = "#5c3a18";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 110, gy);
      ctx.lineTo(sx - 110, gy - 26);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx - 145, gy - 40, 70, 15);
      ctx.fillStyle = "#2b2b34";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText("CAIRO DAY TRIP", sx - 110, gy - 30);
    }

    if (cam.id === "amsterdam") {
      // Statue auf Sockel
      ctx.fillStyle = "#8a919a";
      ctx.fillRect(sx - 34, gy - 14, 26, 14);
      ctx.fillStyle = "#6f7680";
      ctx.beginPath();
      ctx.roundRect(sx - 27, gy - 38, 12, 24, 4); // Körper
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx - 21, gy - 42, 5, 0, Math.PI * 2); // Kopf
      ctx.fill();
      // Bettler mit Hut
      ctx.fillStyle = "#7a5c40";
      ctx.beginPath();
      ctx.arc(sx + 24, gy - 8, 9, Math.PI, 0); // sitzender Rücken
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 24, gy - 18, 5, 0, Math.PI * 2); // Kopf
      ctx.fill();
      ctx.fillStyle = "#4d3a28";
      ctx.beginPath();
      ctx.ellipse(sx + 36, gy - 1, 6, 2.5, 0, 0, Math.PI * 2); // Hut für Münzen
      ctx.fill();
      // Quest-Ausrufezeichen (hüpft)
      const qy = gy - 56 + Math.sin(time * 4) * 4;
      ctx.fillStyle = "#ffd200";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("!", sx + 24, qy);
    }

    if (cam.id === "mccarry") {
      // Mast + goldenes M
      ctx.strokeStyle = "#8a2b1a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx, gy - 58);
      ctx.stroke();
      ctx.fillStyle = "#c8102e";
      ctx.beginPath();
      ctx.roundRect(sx - 24, gy - 88, 48, 32, 5);
      ctx.fill();
      // Golden Arches: lange Beine außen, das Mitteltal hängt höher
      ctx.strokeStyle = "#ffd200";
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(sx - 16, gy - 58);
      ctx.quadraticCurveTo(sx - 8, gy - 92, sx, gy - 70);
      ctx.quadraticCurveTo(sx + 8, gy - 92, sx + 16, gy - 58);
      ctx.stroke();
      // Willkommens-Schild
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx - 52, gy - 50, 104, 14);
      ctx.fillStyle = "#2b2b34";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText("WELCOME HOME, MATTI", sx, gy - 40);
    }

    if (cam.id === "suitcase") {
      // Der Koffer treibt im Wasser. Niemand greift zu.
      const cy = waterBase + waveAt(sx, time) + 2;
      ctx.translate(sx, cy);
      ctx.rotate(Math.sin(time * 2.2) * 0.12);
      ctx.fillStyle = "#7a4a26";
      ctx.strokeStyle = "#54301a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-13, -9, 26, 16, 3);
      ctx.fill();
      ctx.stroke();
      // Griff + Schnallen
      ctx.beginPath();
      ctx.arc(0, -9, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(-8, -4, 3, 5);
      ctx.fillRect(5, -4, 3, 5);
    }

    ctx.restore();
  }
}

// Der berühmte Affe. Wiederverwendbar für Taube und Regenschirm.
export function drawMonkey(ctx: Ctx2D, s: number) {
  ctx.save();
  ctx.scale(s, s);
  // Beine klammern
  ctx.strokeStyle = "#6b4a2f";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 8);
  ctx.lineTo(-8, 13);
  ctx.moveTo(5, 8);
  ctx.lineTo(8, 13);
  ctx.stroke();
  // Schwanz-Kringel
  ctx.strokeStyle = "#8a5f3c";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-11, 2, 4, Math.PI * 0.3, Math.PI * 1.7);
  ctx.stroke();
  // Körper + Bauch
  ctx.fillStyle = "#8a5f3c";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9a074";
  ctx.beginPath();
  ctx.ellipse(0, 2, 4.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Kopf + Ohren
  ctx.fillStyle = "#8a5f3c";
  ctx.beginPath();
  ctx.arc(0, -12, 6.5, 0, Math.PI * 2);
  ctx.arc(-6.5, -13, 2.5, 0, Math.PI * 2);
  ctx.arc(6.5, -13, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Gesicht + Augen
  ctx.fillStyle = "#c9a074";
  ctx.beginPath();
  ctx.ellipse(0, -11, 4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2b34";
  ctx.beginPath();
  ctx.arc(-1.7, -12, 0.9, 0, Math.PI * 2);
  ctx.arc(1.7, -12, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Ein viel zu großer Affe auf einer sichtbar überforderten Taube.
export function drawMonkeyPigeon(ctx: Ctx2D, W: number, H: number) {
  const t = performance.now();
  const x = ((t / 60) % (W + 160)) - 80;
  const y = H * 0.28 + Math.sin(t / 400) * 12;
  const flap = Math.sin(t / 80); // Taube flattert hektisch…
  const bob = Math.sin(t / 300) * 2.5; // …der Affe wippt gemütlich
  ctx.save();
  ctx.translate(x, y);
  // Flügel
  ctx.fillStyle = "#d9dee4";
  ctx.beginPath();
  ctx.ellipse(-2, -3, 9, 4 + flap * 3.5, -0.5 + flap * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Taube: Körper, Schwanz, Kopf, Schnabel
  ctx.fillStyle = "#eef1f4";
  ctx.strokeStyle = "#9aa4ad";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d9dee4";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(-20, -6 + flap * 2);
  ctx.lineTo(-12, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#eef1f4";
  ctx.beginPath();
  ctx.arc(12, -4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f5a623";
  ctx.beginPath();
  ctx.moveTo(16, -5);
  ctx.lineTo(20, -3.5);
  ctx.lineTo(16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2b2b34";
  ctx.beginPath();
  ctx.arc(13, -5.5, 1, 0, Math.PI * 2);
  ctx.fill();
  // Affe obendrauf
  ctx.translate(0, -16 + bob);
  drawMonkey(ctx, 1);
  ctx.restore();
}

// Der zweite Affe: hängt am roten Regenschirm und schwebt majestätisch vorbei.
export function drawUmbrellaMonkey(ctx: Ctx2D, raftX: number, W: number, H: number) {
  const um = sim.umbrellaMonkey;
  if (!um) return;
  const sx = raftX + (um.atM - (sim.dist || 0)) * 10 * 0.5;
  if (sx < -80 || sx > W + 80) return;
  const t = performance.now();
  const sway = Math.sin(t / 700) * 0.12;
  const y = H * 0.18 + Math.sin(t / 900) * 8;
  ctx.save();
  ctx.translate(sx, y);
  ctx.rotate(sway);
  // Schirm
  ctx.fillStyle = "#d1382e";
  ctx.strokeStyle = "#8e211a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 22, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (const a of [0.25, 0.5, 0.75]) {
    const ang = Math.PI + a * Math.PI;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 22, Math.sin(ang) * 22);
  }
  ctx.stroke();
  // Spitze + Stiel
  ctx.strokeStyle = "#5c3a18";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -27);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 14);
  ctx.stroke();
  // Affe hängt darunter, Arm zum Stiel
  ctx.translate(0, 28);
  ctx.strokeStyle = "#6b4a2f";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(0, -16);
  ctx.stroke();
  drawMonkey(ctx, 0.9);
  ctx.restore();
}

export function drawStructure(ctx: Ctx2D, raftX: number, waterBase: number, time: number) {
  const st = sim.main;
  if (!st) return;

  const surfaceY = waterBase + waveAt(raftX, time);
  const d =
    sim.phase === "sinking" || sim.phase === "sunk" || sim.phase === "capsize"
      ? sim.dEq + sim.sinkDepth
      : sim.dEq;

  const pivotX = raftX;
  const pivotY = sim.phase === "drop" ? waterBase - 40 + sim.dropY : surfaceY;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(sim.phase === "drop" ? Math.sin(performance.now() / 200) * 0.05 : sim.tilt);

  // lokales Koordinatensystem: (0,0) = Drehpunkt (Massezentrum-x auf Wasserlinie)
  const offX = -st.cmx;
  const offY = sim.phase === "drop" ? -st.Hpx + 20 : d - st.Hpx;

  for (const p of st.parts) {
    const x = offX + (p.col - st.minCol) * CT;
    const y = offY + (p.row - st.minRow) * CT;
    drawPartRect(ctx, p.def, x, y, CT, p.broken);
    if (p.fifth) drawFifthMark(ctx, x, y, p.def.w * CT, p.def.h * CT);
  }

  // Die Brudivoeller_TV-Flagge am Heck
  const flagX = offX + 4;
  const flagY = offY - 2;
  const flutter = Math.sin(performance.now() / 180) * 3;
  ctx.strokeStyle = "#5c3a18";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(flagX, flagY);
  ctx.lineTo(flagX, flagY - 30);
  ctx.stroke();
  ctx.fillStyle = "#9146ff";
  ctx.beginPath();
  ctx.moveTo(flagX, flagY - 30);
  ctx.lineTo(flagX + 36, flagY - 26 + flutter);
  ctx.lineTo(flagX, flagY - 19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("BRUDI", flagX + 4, flagY - 24.5 + flutter * 0.4);

  // Brudi auf der Standfläche (fällt bei Kenterung separat)
  if (!sim.freeBrudi) {
    drawBrudi(ctx, offX + st.standX, offY + st.standY, time, false);
  }

  // Tote Maifliegen sammeln sich als weiße Flecken auf dem Deck
  if (sim.mayflies && sim.mayflies.corpses > 0) {
    ctx.fillStyle = "rgba(242,242,232,0.85)";
    const nC = Math.min(70, sim.mayflies.corpses);
    for (let i = 0; i < nC; i++) {
      const sd = i * 91.7;
      const cx = offX + ((sd * 13) % st.Wpx);
      const cy = offY + ((sd * 29) % Math.max(1, st.Hpx * 0.4));
      ctx.beginPath();
      ctx.arc(cx, cy, 1.1 + (i % 2) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Möwe, sein neuer Mitbewohner
  if (sim.gull && sim.gull.landed) {
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("🕊️", offX + st.standX + 42, offY + st.standY + Math.sin(time * 3) * 2);
  }

  ctx.restore();
}

export function drawDrifters(ctx: Ctx2D, raftX: number, waterBase: number, time: number) {
  for (const dr of sim.drifters) {
    const x = raftX + dr.dx;
    const y = sim.phase === "drop" ? waterBase - 40 + sim.dropY : waterBase + waveAt(x, time);
    const cs = CT * 0.8;
    const w = dr.def.w * cs,
      h = dr.def.h * cs;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2 + dr.wob) * 0.18);
    // Halb eingetaucht davontreiben — als richtige Zeichnung, nicht als Emoji
    drawPartRect(ctx, dr.def, -w / 2, -h + h * 0.3, cs);
    if (dr.fifth) drawFifthMark(ctx, -w / 2, -h + h * 0.3, w, h);
    ctx.restore();
  }
}

export function drawPoliceBoat(ctx: Ctx2D, raftX: number, waterBase: number, time: number) {
  if (!sim.police || !sim.police.announced) return;
  const po = sim.police;
  const bx = -180 + (raftX - 250 + 180) * po.approach;
  const by = waterBase + waveAt(bx, time) * 0.6;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(Math.sin(time * 2.2) * 0.03);
  ctx.lineJoin = "round";

  // Bugwelle & Heckgischt
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(70, 12, 14 + Math.sin(time * 8) * 3, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(-66, 12, 10 + Math.cos(time * 7) * 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rumpf: dunkelblau mit spitzem Bug
  ctx.fillStyle = "#243a5e";
  ctx.strokeStyle = "#16233a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-62, -8);
  ctx.lineTo(52, -8);
  ctx.quadraticCurveTo(72, -7, 78, 2);
  ctx.quadraticCurveTo(70, 14, 50, 15);
  ctx.lineTo(-50, 15);
  ctx.quadraticCurveTo(-64, 12, -62, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Weißer Zierstreifen mit Schriftzug
  ctx.fillStyle = "#e8edf5";
  ctx.beginPath();
  ctx.moveTo(-58, -6);
  ctx.lineTo(56, -6);
  ctx.quadraticCurveTo(66, -5, 70, 0);
  ctx.lineTo(-59, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#16233a";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("POLIZEI", -6, -3);

  // Kajüte mit schräger Scheibe
  ctx.fillStyle = "#dde4ec";
  ctx.strokeStyle = "#9aa7b5";
  ctx.beginPath();
  ctx.moveTo(-38, -8);
  ctx.lineTo(-38, -30);
  ctx.lineTo(6, -30);
  ctx.lineTo(18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Fenster
  ctx.fillStyle = "#8fd0e8";
  ctx.beginPath();
  ctx.moveTo(-2, -26);
  ctx.lineTo(10, -10);
  ctx.lineTo(-2, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-32, -26, 22, 12);
  // Antenne
  ctx.strokeStyle = "#16233a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-32, -30);
  ctx.lineTo(-36, -44);
  ctx.stroke();

  // Blaulichtbalken mit Glow
  const blue = Math.floor(performance.now() / 200) % 2 === 0;
  ctx.fillStyle = "#16233a";
  ctx.fillRect(-20, -36, 22, 5);
  ctx.fillStyle = blue ? "#2ea8ff" : "#ff4d4d";
  ctx.fillRect(blue ? -20 : -9, -36, 11, 5);
  const glow = ctx.createRadialGradient(-9, -34, 2, -9, -34, 26);
  glow.addColorStop(0, blue ? "rgba(46,168,255,0.5)" : "rgba(255,77,77,0.5)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-9, -34, 26, 0, Math.PI * 2);
  ctx.fill();

  // Bordkanone auf Drehsockel
  ctx.fillStyle = "#16233a";
  ctx.beginPath();
  ctx.arc(34, -8, 6, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(34, -12);
  ctx.lineTo(54, -22);
  ctx.stroke();
  // Mündung
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(50, -20);
  ctx.lineTo(55, -22.5);
  ctx.stroke();
  ctx.restore();

  // Das Geschoss fliegt im Bogen aufs Floß
  if (po.shot && !po.done) {
    const p = Math.min(1, po.shotProg);
    const sx0 = bx + 46,
      sy0 = by - 18;
    const sx = sx0 + (raftX - sx0) * p;
    const sy = sy0 + (waterBase - 45 - sy0) * p - Math.sin(Math.PI * p) * 90;
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,180,60,0.6)";
    ctx.beginPath();
    ctx.arc(sx - 8, sy + 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRocket(ctx: Ctx2D, raftX: number, waterBase: number) {
  if (!sim.rocket || !sim.rocket.fired || sim.rocket.exploded) return;
  const p = Math.min(1, sim.rocket.prog);
  const rx = raftX + 950 * (1 - p);
  const ry = -60 + p * (waterBase - 20);
  ctx.save();
  ctx.translate(rx, ry);
  // Flugrichtung: von rechts oben aufs Floß (Zeichnung mit Nase nach oben)
  ctx.rotate(Math.atan2(waterBase + 40, -950) + Math.PI / 2);
  // Flamme
  ctx.fillStyle = "#ff9b2f";
  ctx.beginPath();
  ctx.moveTo(-6, 22);
  ctx.quadraticCurveTo(0, 40 + Math.random() * 8, 6, 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffe17a";
  ctx.beginPath();
  ctx.moveTo(-3, 22);
  ctx.quadraticCurveTo(0, 32 + Math.random() * 5, 3, 22);
  ctx.closePath();
  ctx.fill();
  // Finnen
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(-16, 24);
  ctx.lineTo(-8, 22);
  ctx.closePath();
  ctx.moveTo(8, 10);
  ctx.lineTo(16, 24);
  ctx.lineTo(8, 22);
  ctx.closePath();
  ctx.fill();
  // Körper
  ctx.fillStyle = "#e8edf2";
  ctx.strokeStyle = "#8a95a1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(9, -12, 9, 4);
  ctx.lineTo(9, 22);
  ctx.lineTo(-9, 22);
  ctx.lineTo(-9, 4);
  ctx.quadraticCurveTo(-9, -12, 0, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Spitze
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(8, -15, 9, -6);
  ctx.lineTo(-9, -6);
  ctx.quadraticCurveTo(-8, -15, 0, -26);
  ctx.closePath();
  ctx.fill();
  // Bullauge
  ctx.fillStyle = "#9fd4e8";
  ctx.strokeStyle = "#8a95a1";
  ctx.beginPath();
  ctx.arc(0, 4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = `rgba(255,${140 + Math.random() * 80},40,${0.5 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(
      rx + 24 + Math.random() * 26,
      ry - 24 - Math.random() * 26,
      3 + Math.random() * 6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

export function drawBomber(
  ctx: Ctx2D,
  raftX: number,
  waterBase: number,
  W: number,
  H: number,
  time: number,
) {
  if (!sim.nuke || sim.nuke.bomber <= 0 || sim.nuke.detonated) return;
  const nk = sim.nuke;
  const bx = -120 + (W + 240) * nk.bomber;
  const by = H * 0.1 + Math.sin(time * 1.5) * 4;
  // Prozeduraler Bomber (Nase nach rechts)
  ctx.save();
  ctx.translate(bx, by);
  // Seitenleitwerk
  ctx.fillStyle = "#4c5243";
  ctx.strokeStyle = "#343a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -7);
  ctx.lineTo(-52, -26);
  ctx.lineTo(-42, -26);
  ctx.lineTo(-20, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Rumpf
  ctx.fillStyle = "#59604f";
  ctx.beginPath();
  ctx.moveTo(-48, 0);
  ctx.quadraticCurveTo(-52, -8, -36, -9);
  ctx.lineTo(28, -9);
  ctx.quadraticCurveTo(50, -8, 56, 0);
  ctx.quadraticCurveTo(48, 8, 28, 8);
  ctx.lineTo(-38, 8);
  ctx.quadraticCurveTo(-52, 7, -48, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cockpit-Glas
  ctx.fillStyle = "#9fd4e8";
  ctx.beginPath();
  ctx.moveTo(34, -9);
  ctx.quadraticCurveTo(48, -8, 53, -2);
  ctx.lineTo(38, -2);
  ctx.closePath();
  ctx.fill();
  // Tragfläche (leicht nach vorn-unten gepfeilt)
  ctx.fillStyle = "#515746";
  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.lineTo(-24, 14);
  ctx.lineTo(-8, 16);
  ctx.lineTo(18, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Triebwerk unter der Tragfläche
  ctx.fillStyle = "#2e332a";
  ctx.beginPath();
  ctx.roundRect(-8, 10, 20, 8, 4);
  ctx.fill();
  // Heck-Kennung
  ctx.fillStyle = "#d8dcc9";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("404", -30, 0);
  // Rotes Blinklicht auf dem Leitwerk
  if (Math.floor(performance.now() / 280) % 2) {
    ctx.fillStyle = "#ff4d4d";
    ctx.beginPath();
    ctx.arc(-47, -28, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (nk.dropped) {
    const p = Math.min(1, nk.bombProg);
    const bombX = raftX + Math.sin(p * 9) * 6;
    const bombY = H * 0.13 + (waterBase - 50 - H * 0.13) * (p * p);
    ctx.save();
    ctx.translate(bombX, bombY);
    ctx.fillStyle = "#1b1b1b";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#444";
    ctx.fillRect(-6, -20, 12, 6);
    ctx.restore();
  }
}

export function drawExplosion(ctx: Ctx2D, waterBase: number) {
  // Atompilz nach der Detonation
  if (sim.nukeHit && sim.explosion) {
    const ex = sim.explosion;
    const grow = Math.min(1, (2.4 - ex.life) / 1.4);
    const alpha = Math.max(0, ex.life / 2.4);
    ctx.globalAlpha = alpha * 0.9;
    // Stiel
    ctx.fillStyle = "#b9a08a";
    ctx.beginPath();
    ctx.moveTo(ex.x - 26 * grow, waterBase);
    ctx.quadraticCurveTo(ex.x - 14 * grow, ex.y - 60 * grow, ex.x - 34 * grow, ex.y - 110 * grow);
    ctx.lineTo(ex.x + 34 * grow, ex.y - 110 * grow);
    ctx.quadraticCurveTo(ex.x + 14 * grow, ex.y - 60 * grow, ex.x + 26 * grow, waterBase);
    ctx.closePath();
    ctx.fill();
    // Pilzkappe
    for (const [ox, oy, r] of [
      [0, -150, 62],
      [-52, -132, 40],
      [52, -132, 40],
      [-24, -160, 46],
      [24, -160, 46],
    ]) {
      const gradN = ctx.createRadialGradient(
        ex.x + ox * grow,
        ex.y + oy * grow,
        2,
        ex.x + ox * grow,
        ex.y + oy * grow,
        r * grow,
      );
      gradN.addColorStop(0, "#ffd27a");
      gradN.addColorStop(0.5, "#e8934a");
      gradN.addColorStop(1, "#8d6b52");
      ctx.fillStyle = gradN;
      ctx.beginPath();
      ctx.arc(ex.x + ox * grow, ex.y + oy * grow, r * grow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Feuerball + gezackter Explosions-Stern
  if (sim.explosion) {
    const ex = sim.explosion;
    const alpha = Math.max(0, ex.life);
    const grad2 = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r);
    grad2.addColorStop(0, `rgba(255,240,150,${alpha})`);
    grad2.addColorStop(0.5, `rgba(255,120,30,${alpha * 0.8})`);
    grad2.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
    ctx.fill();
    const burst = (r: number, color: string, rot: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2 + rot;
        const rad = i % 2 === 0 ? r : r * 0.55;
        const px = ex.x + Math.cos(ang) * rad;
        const py = ex.y + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };
    ctx.globalAlpha = Math.max(0, Math.min(1, ex.life));
    const bs = 24 + ex.r * 0.35;
    burst(bs, "#ff7c1f", performance.now() / 900);
    burst(bs * 0.62, "#ffd23e", -performance.now() / 700);
    ctx.globalAlpha = 1;
  }
}

export function drawBrudi(ctx: Ctx2D, x: number, footY: number, time: number, forcePanic: boolean) {
  const panic =
    forcePanic || sim.phase === "sinking" || sim.phase === "sunk" || sim.phase === "capsize";
  const won = sim.phase === "won";
  // Beim Maifliegen-Schwarm wird gewedelt, was die Arme hergeben
  const swatting = !panic && !won && sim.mayflies && sim.mayflies.intensity > 0.4;
  const flail =
    panic || swatting ? Math.sin(performance.now() / 60) * 0.9 : Math.sin(time * 2) * 0.12;

  const skin = "#eab68f";
  const skinDark = "#c68e63";

  ctx.save();
  ctx.translate(x, footY);
  if (panic) ctx.rotate(Math.sin(performance.now() / 150) * 0.15);

  // Beine (nackt — es ist Floßwetter)
  ctx.strokeStyle = skin;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-6, -20);
  ctx.moveTo(7, 0);
  ctx.lineTo(6, -20);
  ctx.stroke();

  // DIE rote Badehose
  ctx.fillStyle = "#e03131";
  ctx.strokeStyle = "#a51f1f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-13, -34, 26, 15, 4);
  ctx.fill();
  ctx.stroke();
  // Kordel
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, -31);
  ctx.lineTo(-4, -26);
  ctx.moveTo(2, -31);
  ctx.lineTo(4, -26);
  ctx.stroke();

  // Oberkörper (Haut) + Details
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.roundRect(-13, -54, 26, 21, 7);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.arc(0, -38, 1.4, 0, Math.PI * 2); // Bauchnabel
  ctx.arc(-5, -48, 1.1, 0, Math.PI * 2);
  ctx.arc(5, -48, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Die viel zu kleine, rein dekorative Schwimmweste
  ctx.fillStyle = "#ff8c1a";
  ctx.strokeStyle = "#c96a08";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-12, -55, 7, 12, 2);
  ctx.roundRect(5, -55, 7, 12, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#5c636e";
  ctx.fillRect(-2, -50, 4, 2.5); // Schnalle, geschlossen über nichts

  // Arme (Haut)
  ctx.strokeStyle = skin;
  ctx.lineWidth = 7;
  const armY = -48;
  ctx.beginPath();
  if (panic || won || swatting) {
    ctx.moveTo(-12, armY);
    ctx.lineTo(-24, armY - 20 + flail * 8);
    ctx.moveTo(12, armY);
    ctx.lineTo(24, armY - 20 - flail * 8);
  } else {
    ctx.moveTo(-12, armY);
    ctx.lineTo(-22, armY + 16 + flail * 20);
    ctx.moveTo(12, armY);
    ctx.lineTo(22, armY + 16 - flail * 20);
  }
  ctx.stroke();

  // Kopf: 7tv-Gesicht
  const headR = 24;
  const headY = -56 - headR + 4;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (FACE.complete && FACE.naturalWidth) {
    if (panic) {
      ctx.translate(0, headY);
      ctx.rotate(Math.sin(performance.now() / 90) * 0.25);
      ctx.translate(0, -headY);
    }
    ctx.drawImage(FACE, -headR, headY - headR, headR * 2, headR * 2);
  } else {
    ctx.fillStyle = "#9146ff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("B", 0, headY + 9);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.strokeStyle = panic ? "#ff5c5c" : "#26263c";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Sprechblase
  if (panic || won) {
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#26263c";
    ctx.lineWidth = 4;
    const msg = won ? "EZ Clap 😎" : "ICH KANN NICHT SCHWIMMEN!!";
    ctx.strokeText(msg, 0, headY - headR - 12);
    ctx.fillText(msg, 0, headY - headR - 12);
  }

  ctx.restore();
}
