/* Der Schwimmtest: Start, Fahrt-Update, Sieg/Untergang, Endscreen. */

import { $, BASE_SPEED, BRUDI_WEIGHT, COLS, CT, GOAL_M, PXPM } from "./config";
import { placed, renderBuild } from "./builder";
import {
  buildStructure,
  capAt,
  components,
  contactCount,
  rocketRisk,
  solveDepth,
  spamPenalty,
  standCell,
  topfiCountOf,
  worstSpam,
} from "./physics";
import {
  canvas,
  inRapids,
  resizeCanvas,
  sim,
  spawnBubble,
  spawnSplash,
  waveAmp,
  waveAt,
} from "./state";
import { showBanner } from "./hud";
import { detachPart, nukeDetonate, policeHit, rockCrash, rocketImpact } from "./damage";
import { draw } from "./scene";

export function startTest() {
  const groups = components(placed);
  groups.sort(
    (a, b) =>
      b.reduce((s, p) => s + p.def.w * p.def.h, 0) - a.reduce((s, p) => s + p.def.w * p.def.h, 0),
  );
  const mainParts = groups[0] ? groups[0].map((p) => ({ ...p, broken: false })) : [];
  const drifterGroups = groups.slice(1);

  const main = mainParts.length ? buildStructure(mainParts) : null;

  // Abgetrennte Teile treiben davon
  const mainCenterCol = main ? main.minCol + main.Wpx / CT / 2 : COLS / 2;
  const drifters = drifterGroups.flat().map((p) => ({
    def: p.def,
    dx: (p.col + p.def.w / 2 - mainCenterCol) * CT,
    vx: (p.col + p.def.w / 2 < mainCenterCol ? -1 : 1) * (25 + Math.random() * 30),
    wob: Math.random() * 10,
  }));

  Object.assign(sim, {
    running: true,
    ended: false,
    phase: "drop",
    t: 0,
    lastTs: 0,
    main,
    drifters,
    freeBrudi: null,
    swamp: 0,
    tilt: 0,
    dEq: 0,
    sinkDepth: 0,
    dropY: -340,
    particles: [],
    sinkAt: 0,
    comfort: mainParts.reduce((s, p) => s + (p.def.comfort || 0), 0),
    dist: 0,
    speed: BASE_SPEED,
    shake: 0,
    explosion: null,
    rockHits: 0,
    rocketHit: false,
  });

  // ---- Der Flusslauf: Stromschnellen, Felsen, ggf. eine Rakete. Normal. ----
  sim.zones = [];
  let zm = 100 + Math.random() * 50;
  while (zm < GOAL_M - 120) {
    sim.zones.push({ s: zm, e: zm + 55 + Math.random() * 45, announced: false });
    zm += 180 + Math.random() * 90;
  }
  sim.rocks = [];
  let rm = 70 + Math.random() * 40;
  while (rm < GOAL_M - 60) {
    sim.rocks.push({
      m: rm,
      size: 24 + Math.random() * 22,
      inLine: Math.random() < 0.55,
      hit: false,
      nearMissed: false,
    });
    rm += 55 + Math.random() * 60;
  }
  // Erst ab einer EXTREMEN Topfi-Sammlung (10+) wird nicht mehr verhandelt.
  const tc = topfiCountOf(mainParts);
  sim.nuke =
    tc >= 10
      ? {
          atM: 200 + Math.random() * 220,
          warned: false,
          bomber: 0,
          bomberSeen: false,
          dropped: false,
          bombProg: 0,
          detonated: false,
        }
      : null;
  sim.nukeHit = false;
  sim.nukeTopfis = tc;
  sim.nukeFlash = 0;

  // Große Flöße ziehen militärische Aufmerksamkeit auf sich. Ist so.
  sim.rocket =
    !sim.nuke && Math.random() < rocketRisk(mainParts)
      ? {
          atM: 180 + Math.random() * (GOAL_M - 300),
          warned: false,
          fired: false,
          prog: 0,
          exploded: false,
        }
      : null;

  // Die Wasserschutzpolizei patrouilliert hier. Manchmal. Mit Bordkanone.
  // Auffällige Monokulturen mag sie gar nicht. (Bei DEFCON 1 hält sie sich raus.)
  const policeChance = Math.min(0.9, 0.12 + spamPenalty(mainParts) * 0.8);
  sim.police =
    !sim.nuke && Math.random() < policeChance
      ? {
          atM: 140 + Math.random() * (GOAL_M - 320),
          announced: false,
          approach: 0,
          hailed: false,
          holdT: 0,
          shot: false,
          shotProg: 0,
          done: false,
        }
      : null;
  sim.policeHit = false;

  sim.chaosEvents = (main ? main.parts : [])
    .filter((p) => p.def.chaos && Math.random() < p.def.chaos)
    .map((p) => ({ part: p, at: 6 + Math.random() * 26, done: false }));

  // Schlampig verknotete Teile (wenig Kontaktfläche) verabschieden sich — Qualität halt.
  sim.breakEvents = [];
  sim.brokeOff = [];
  if (main && main.parts.length > 1) {
    const sc = standCell(main.parts);
    for (const p of main.parts) {
      if (p.def.id === "topfi") continue; // Topfi verlässt Brudi nie.
      const contacts = contactCount(p, main.parts);
      let prob = contacts <= 1 ? 0.9 : contacts === 2 ? 0.55 : 0.25;
      // Das Teil, auf dem Brudi rumtrampelt, leidet zusätzlich
      if (
        sc &&
        sc[0] >= p.col &&
        sc[0] < p.col + p.def.w &&
        sc[1] >= p.row &&
        sc[1] < p.row + p.def.h
      )
        prob += 0.15;
      if (Math.random() < prob)
        sim.breakEvents.push({ part: p, at: 5 + Math.random() * 32, warned: false, done: false });
    }
  }

  sim.gull = Math.random() < 0.35 ? { at: 8 + Math.random() * 22, landed: false } : null;

  const QUOTES = [
    "Brudi: „Die Route hab ich auf Google Maps gecheckt.“",
    "Brudi: „Stromschnellen sind nur schnelles Wasser, Bro.“",
    "Brudi: „Das ist zu 100% safe, Chat.“",
    "Brudi: „Wer braucht schon ein Paddel.“",
    "Brudi: „Läuft doch su– was war das für ein Geräusch?“",
    "Brudi: „Ich spüre kaum Wasser in den Schuhen.“",
    "Brudi: „TÜV? Kenn ich nicht.“",
  ];
  const shuffled = QUOTES.sort(() => Math.random() - 0.5);
  sim.quotes = [6, 17, 30].map((base, i) => ({
    at: base + Math.random() * 5,
    text: shuffled[i],
    done: false,
  }));
  const spam = worstSpam(mainParts);
  if (spam && spam.over >= 2) {
    sim.quotes.push({
      at: 4,
      text: `⚠️ Satellit erfasst verdächtige ${spam.def.name}-Ansammlung… ${spam.def.icon}🛰️`,
      done: false,
    });
  }

  $("build-screen").classList.add("hidden");
  $("end-screen").classList.add("hidden");
  $("test-screen").classList.remove("hidden");
  $("event-log").innerHTML = "";
  showBanner("3… 2… 1… WASSERUNG! 🌊", false, 2600);
  if (drifters.length) {
    setTimeout(() => showBanner("Moment… da war was nicht festgebunden?! 🪢", true, 2800), 2800);
  }

  resizeCanvas();
  requestAnimationFrame(loop);
}

function loop(ts: number) {
  if (!sim.running) return;
  if (!sim.lastTs) sim.lastTs = ts;
  const dt = Math.min(0.05, (ts - sim.lastTs) / 1000);
  sim.lastTs = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt: number) {
  const c = canvas();
  const W = c.width / devicePixelRatio,
    H = c.height / devicePixelRatio;
  const waterBase = H * 0.62;
  const raftX = W * 0.44;
  let st = sim.main;

  if (sim.phase === "drop") {
    sim.dropY += dt * 500;
    if (sim.dropY >= 0) {
      sim.dropY = 0;
      spawnSplash(raftX, waterBase, 45, true);
      if (!st) {
        sim.phase = "soloswim";
        sim.freeBrudi = { x: raftX, y: waterBase - 60, vx: 0, vy: 80, inWater: false, since: 0 };
        showBanner("Kein Floß. Er ist einfach REINGELAUFEN. 🫠", true, 3000);
      } else if (solveDepth(st) === null) {
        sim.phase = "sinking";
        sim.sinkAt = 0;
        showBanner("Ähm. Das sinkt SOFORT. 🫠", true, 3000);
      } else {
        sim.phase = "float";
      }
    }
    return;
  }

  sim.t += dt;

  // Chaos-Events
  for (const ev of sim.chaosEvents) {
    if (!ev.done && sim.t >= ev.at && sim.phase === "float") {
      ev.done = true;
      ev.part.broken = true;
      showBanner(ev.part.def.chaosMsg, true, 3200);
      spawnSplash(raftX + (Math.random() - 0.5) * 100, waterBase, 25, true);
    }
  }

  // Bau-Qualität: schlecht verknotete Teile verabschieden sich
  for (const ev of sim.breakEvents) {
    if (ev.done || sim.phase !== "float") continue;
    if (!ev.warned && sim.t >= ev.at - 1.3) {
      ev.warned = true;
      showBanner("*KNARZ* … das klingt nicht gut. 😬", true, 1200);
    }
    if (sim.t >= ev.at) {
      ev.done = true;
      detachPart(ev.part, raftX, waterBase);
    }
  }

  // Möwe. Einfach so.
  if (sim.gull && !sim.gull.landed && sim.phase === "float" && sim.t >= sim.gull.at) {
    sim.gull.landed = true;
    if (sim.main) sim.main.weight += 2;
    showBanner("Eine Möwe ist gelandet. +2 kg. Warum auch nicht. 🕊️", false, 2600);
  }

  // Brudi-Kommentare
  for (const q of sim.quotes) {
    if (!q.done && sim.phase === "float" && sim.t >= q.at) {
      q.done = true;
      showBanner(q.text, false, 2300);
    }
  }

  if (sim.phase === "float") {
    // Fahrt flussabwärts
    sim.speed = BASE_SPEED * (inRapids(sim.dist) ? 1.7 : 1);
    sim.dist += sim.speed * dt;

    for (const z of sim.zones) {
      if (!z.announced && sim.dist >= z.s - 15) {
        z.announced = true;
        showBanner("STROMSCHNELLEN! 🌊 FESTHALTEN!", true, 2000);
      }
    }

    // Felsen: manche stehen genau in der Fahrrinne
    const halfW = st.Wpx / 2;
    for (const rock of sim.rocks) {
      const rel = (rock.m - sim.dist) * PXPM;
      if (!rock.hit && rock.inLine && Math.abs(rel) < halfW + rock.size * 0.4) {
        rockCrash(rock, raftX, waterBase);
        if (sim.phase !== "float") break;
      } else if (!rock.inLine && !rock.nearMissed && Math.abs(rel) < halfW + 30) {
        rock.nearMissed = true;
        if (Math.random() < 0.5) showBanner("Puh. Knapp. 🪨", false, 1100);
      }
    }
    if (sim.phase !== "float") return;

    // Die Rakete. Frag nicht.
    if (sim.rocket && !sim.rocket.exploded) {
      const r = sim.rocket;
      if (!r.warned && sim.dist > r.atM - 90) {
        r.warned = true;
        showBanner("⚠️ …pfeift da was?", true, 1800);
      }
      if (!r.fired && sim.dist > r.atM) {
        r.fired = true;
        showBanner("EINE RAKETE?! WARUM IST DA EINE RAKETE?! 🚀", true, 2400);
      }
      if (r.fired) {
        r.prog += dt / 3.5;
        if (r.prog >= 1) {
          rocketImpact(raftX, waterBase);
          if (sim.phase !== "float") return;
        }
      }
    }

    // DEFCON 1: Bomber fliegt ein, Bombe fällt, Physik endet.
    if (sim.nuke && !sim.nuke.detonated) {
      const nk = sim.nuke;
      if (!nk.warned && sim.dist > nk.atM - 100) {
        nk.warned = true;
        showBanner("🛰️ DEFCON 1. Topf-Ansammlung bestätigt.", true, 2400);
      }
      if (sim.dist > nk.atM) {
        nk.bomber = Math.min(1, nk.bomber + dt / 3);
        if (!nk.bomberSeen && nk.bomber > 0.05) {
          nk.bomberSeen = true;
          showBanner("✈️ Ein Bomber. Es ist ein BOMBER.", true, 2200);
        }
        if (!nk.dropped && nk.bomber >= 0.55) {
          nk.dropped = true;
          showBanner("💣 Bombe ausgeklinkt. War schön mit euch.", true, 2000);
        }
        if (nk.dropped) {
          nk.bombProg += dt / 2.2;
          if (nk.bombProg >= 1) {
            nukeDetonate(raftX, waterBase);
            if (sim.phase !== "float") return;
          }
        }
      }
    }

    // Wasserschutzpolizei: erst Blaulicht, dann Ansage, dann… Bordkanone.
    if (sim.police && !sim.police.done) {
      const po = sim.police;
      if (!po.announced && sim.dist > po.atM - 60) {
        po.announced = true;
        showBanner("🚨 Blaulicht hinter euch…", true, 1800);
      }
      if (sim.dist > po.atM) {
        po.approach = Math.min(1, po.approach + dt / 2.5);
        if (!po.hailed && po.approach >= 1) {
          po.hailed = true;
          showBanner("🚔 WASSERSCHUTZPOLIZEI! SOFORT ANHALTEN!", true, 2200);
          setTimeout(
            () => showBanner("Brudi: „NIEMALS! Das ist ein FLOẞ, kein Boot!“", false, 2000),
            2300,
          );
        }
        if (po.hailed) {
          po.holdT += dt;
          if (!po.shot && po.holdT > 5) {
            po.shot = true;
            showBanner("🚔 Sie laden die Bordkanone durch. Oh nein.", true, 1600);
          }
          if (po.shot) {
            po.shotProg += dt / 1.4;
            if (po.shotProg >= 1) {
              policeHit(raftX, waterBase);
              if (sim.phase !== "float") return;
            }
          }
        }
      }
    }

    st = sim.main; // Crashs können die Struktur umgebaut haben
    if (!st) return;

    const d = solveDepth(st);
    if (d === null) {
      sim.phase = "sinking";
      sim.sinkAt = sim.t;
      sim.dEq = st.Hpx;
      showBanner("Der Auftrieb ist WEG! 😱", true, 3000);
    } else {
      sim.dEq += (d - sim.dEq) * Math.min(1, dt * 3);

      // Neigung: Massezentrum vs. Auftriebszentrum + Wellen-Schaukeln
      const { cbx } = capAt(st, sim.dEq);
      const cmHeight = st.Hpx - st.cmy;
      const topHeavy = 1 + (cmHeight / Math.max(CT, st.Wpx)) * 1.4;
      const slope = (waveAt(raftX + 50, sim.t) - waveAt(raftX - 50, sim.t)) / 100;
      const target =
        Math.max(-0.9, Math.min(0.9, (st.cmx - cbx) * 0.0045 * topHeavy)) +
        slope * (0.8 + topHeavy * 0.4);
      sim.tilt += (target - sim.tilt) * Math.min(1, dt * 1.6);

      if (Math.abs(sim.tilt) > 0.5) {
        sim.phase = "capsize";
        sim.sinkAt = sim.t;
        showBanner("KENTERUNG! ⚠️ Physik 1 : 0 Brudi", true, 3200);
        const side = Math.sign(sim.tilt);
        sim.freeBrudi = {
          x: raftX + side * 40,
          y: waterBase - (st.Hpx - sim.dEq) - 70,
          vx: side * 110,
          vy: -60,
          inWater: false,
          since: 0,
        };
        spawnSplash(raftX + side * 60, waterBase, 30, true);
      }

      // Wellen schwappen über die Standfläche
      const freeboard = st.Hpx - sim.dEq - st.standY;
      const excess = waveAmp() - (freeboard * 0.65 + 8);
      if (excess > 0) {
        sim.swamp += dt * excess * 0.02;
        if (Math.random() < 0.15)
          spawnSplash(
            raftX + (Math.random() - 0.5) * st.Wpx,
            waterBase + waveAt(raftX, sim.t),
            3,
            false,
          );
      } else {
        sim.swamp = Math.max(0, sim.swamp - dt * 0.05);
      }
      if (sim.phase === "float" && sim.swamp >= 1) {
        sim.phase = "sinking";
        sim.sinkAt = sim.t;
        showBanner("Zu viel Wasser im Floß! 🌊😱", true, 3000);
      }

      if (sim.phase === "float" && sim.dist >= GOAL_M) {
        sim.phase = "won";
        showBanner("DER STEG! ANGEKOMMEN! 🏁 EIN WUNDER!", false, 4000);
        setTimeout(() => endTest(true), 3000);
      }
    }
  } else if (sim.phase === "sinking") {
    sim.sinkDepth += dt * 45;
    sim.tilt += dt * 0.15 * Math.sign(sim.tilt || 1);
    if (Math.random() < 0.5)
      spawnBubble(
        raftX + (Math.random() - 0.5) * (st ? st.Wpx : 80),
        waterBase + sim.sinkDepth * 0.5,
      );
    if (sim.sinkDepth > 240) {
      sim.phase = "sunk";
      setTimeout(() => endTest(false), 1600);
    }
  } else if (sim.phase === "capsize") {
    sim.tilt += dt * 2.2 * Math.sign(sim.tilt);
    sim.sinkDepth += dt * 35;
    if (Math.abs(sim.tilt) > 1.6) sim.tilt = 1.6 * Math.sign(sim.tilt);
  } else if (sim.phase === "soloswim") {
    // nichts – freeBrudi wird unten animiert
  }

  // Frei schwimmender Brudi (Kenterung / kein Floß)
  if (sim.freeBrudi) {
    const b = sim.freeBrudi;
    const surf = waterBase + waveAt(b.x, sim.t);
    if (!b.inWater) {
      b.vy += 550 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y >= surf - 14) {
        b.inWater = true;
        spawnSplash(b.x, surf, 35, true);
      }
    } else {
      b.since += dt;
      b.y += (surf + 4 - b.y) * Math.min(1, dt * 4);
      b.x += Math.sin(sim.t * 3) * 10 * dt;
      if (Math.random() < 0.3) spawnBubble(b.x + (Math.random() - 0.5) * 20, b.y + 20);
      if (b.since > 2.6 && sim.phase !== "sunk") {
        sim.phase = "sunk";
        setTimeout(() => endTest(false), 800);
      }
    }
  }

  // Treibende Einzelteile fallen hinter das fahrende Floß zurück
  for (const dr of sim.drifters) dr.dx += (dr.vx - sim.speed * PXPM * 0.5) * dt;

  // Screen-Shake, Blitz & Explosion abklingen lassen
  sim.shake = Math.max(0, sim.shake - dt * 2.2);
  sim.nukeFlash = Math.max(0, (sim.nukeFlash || 0) - dt * 0.9);
  if (sim.explosion) {
    sim.explosion.r += dt * 420;
    sim.explosion.life -= dt * 1.1;
    if (sim.explosion.life <= 0) sim.explosion = null;
  }

  // Partikel
  for (const p of sim.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === "drop") p.vy += 600 * dt;
  }
  sim.particles = sim.particles.filter((p: any) => p.life > 0);

  // HUD
  st = sim.main;
  const cap = st ? capAt(st, st.Hpx + 0.1).cap : 0;
  $("hud").innerHTML =
    `📍 Noch <b>${Math.max(0, GOAL_M - sim.dist).toFixed(0)} m</b> bis zum Steg${inRapids(sim.dist) ? " · 🌊 <b>STROMSCHNELLEN</b>" : ""}<br>` +
    `🎈 Auftrieb: <b>${Math.round(cap)}</b> / ⚖️ <b>${st ? st.weight : BRUDI_WEIGHT} kg</b><br>` +
    `↺ Neigung: <b>${Math.round(Math.abs(sim.tilt) * 57)}°</b> · 🌊 Wasser im Floß: <b>${Math.round(Math.min(1, sim.swamp) * 100)}%</b>`;
}

/* ---------- Endscreen ---------- */

function endTest(won: boolean) {
  if (sim.ended) return;
  sim.ended = true;
  sim.running = false;
  clearTimeout(sim.bannerTimeout);
  $("banner").classList.add("hidden");
  const st = sim.main;
  const meters = Math.min(GOAL_M, Math.round(sim.dist));
  const score = Math.max(
    0,
    Math.round(meters * 2 + (st ? st.parts.length * 15 : 0) + sim.comfort * 40 + (won ? 500 : 0)),
  );

  const card = document.querySelector(".end-card")!;
  card.className = "end-card " + (won ? "won" : "lost");
  $("end-title").textContent = won
    ? "🏁 ANGEKOMMEN!"
    : sim.nukeHit
      ? "☢️ ATOMISIERT!"
      : sim.policeHit
        ? "🚔 VERSENKT!"
        : sim.rocketHit
          ? "🚀 ABGESCHOSSEN!"
          : sim.phase === "sunk" && Math.abs(sim.tilt) > 0.5 && sim.freeBrudi
            ? "🙃 GEKENTERT!"
            : "🫧 ABGESOFFEN!";

  let text: string;
  if (won) {
    const abzug = sim.brokeOff.length ? ` Unterwegs verloren: „${sim.brokeOff.join("“, „")}“.` : "";
    if (sim.policeHit || sim.rocketHit) {
      const was = [sim.rocketHit ? "RAKETENEINSCHLAG" : "", sim.policeHit ? "POLIZEI-BESCHUSS" : ""]
        .filter(Boolean)
        .join(" und ");
      text = `${GOAL_M} m überstanden – inklusive ${was}. Absolute Legende.${abzug}`;
    } else if (sim.rockHits >= 2) {
      text = `${GOAL_M} m Wildwasser, ${sim.rockHits} Felsen frontal mitgenommen – und TROTZDEM angekommen.${abzug} Absoluter Ehrenmann, das Floß.`;
    } else {
      text = `${GOAL_M} m Wildwasser überstanden! Der Steg hat gehalten. Das Floß… so halb.${abzug}`;
    }
  } else if (sim.nukeHit) {
    text = `Bei Meter ${meters} wurde das Floß per taktischem Nuklearschlag neutralisiert. Grund: ${sim.nukeTopfis} Topfis. Verluste: alles. Überlebende: Brudi (knapp) und sämtliche Topfis (selbstverständlich).`;
  } else if (sim.policeHit) {
    text = `Die Wasserschutzpolizei hat das Floß bei Meter ${meters} versenkt. Begründung: „Keine Zulassung.“ Als ob ein FLOẞ eine Zulassung bräuchte.`;
  } else if (sim.rocketHit) {
    text = `Bei Meter ${meters} von einer RAKETE getroffen. Auf einem Fluss. Statistisch nahezu unmöglich. Brudi hat's trotzdem geschafft.`;
  } else if (!st && !sim.brokeOff.length) {
    text =
      "Es gab… kein Floß. Brudi ist einfach in den Fluss gelaufen. Der Bademeister hat es kommen sehen.";
  } else if (!st && sim.brokeOff.length) {
    text = `Das Floß hat sich bei Meter ${meters} in seine EINZELTEILE zerlegt. Baumarkt-Bewertung: ⭐ „Kam als Bausatz an. Blieb einer.“`;
  } else if (Math.abs(sim.tilt) > 0.5 && sim.freeBrudi) {
    text = `Bei Meter ${meters} gekentert – der Schwerpunkt saß schief. Vielleicht das schwere Zeug nächstes Mal in die MITTE?`;
  } else if (meters < 15) {
    text =
      "Das Floß ist ungefähr so schwimmfähig wie eine Waschmaschine. Sofort abgesoffen. Peinlich.";
  } else if (sim.rockHits >= 2) {
    text = `Felsen: ${sim.rockHits}, Floß: 0. Bei Meter ${meters} war der TÜV dann doch fällig.`;
  } else if (sim.brokeOff.length) {
    text = `Erst ging „${sim.brokeOff.join("“, „")}“ über Bord, dann die Hoffnung. Bei Meter ${meters} war Schluss. Mehr Knoten nächstes Mal?`;
  } else if (sim.chaosEvents.some((e: any) => e.done)) {
    const broken = sim.chaosEvents
      .filter((e: any) => e.done)
      .map((e: any) => e.part.def.name)
      .join(", ");
    text = `Bei Meter ${meters} war Schluss – Schuld: ${broken}. War abzusehen, ehrlich.`;
  } else {
    text = `${meters} m gekämpft, dann haben die Wellen gewonnen. Tipp: Höher bauen oder mehr Auftrieb unten rein.`;
  }
  $("end-text").textContent = text;
  $("end-score").textContent = String(score);
  $("end-screen").classList.remove("hidden");
}

export function backToBuild() {
  $("end-screen").classList.add("hidden");
  $("test-screen").classList.add("hidden");
  $("build-screen").classList.remove("hidden");
  sim.running = false;
  renderBuild();
}
