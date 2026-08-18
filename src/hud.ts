/* Banner in der Mitte + Ereignis-Verlauf an der Seite. */

import { $ } from "./config";
import { sim } from "./state";

export function showBanner(text: string, chaos?: boolean, ms?: number) {
  if (sim.ended) return;
  const b = $("banner");
  b.textContent = text;
  b.className = "banner" + (chaos ? " chaos" : "");
  clearTimeout(sim.bannerTimeout);
  if (ms) sim.bannerTimeout = setTimeout(() => b.classList.add("hidden"), ms);

  // …und in den Ereignis-Verlauf an der Seite
  const log = $("event-log");
  const ev = document.createElement("div");
  ev.className = "ev" + (chaos ? " chaos" : "");
  ev.innerHTML = `<span class="m">${Math.round(sim.dist || 0)} m</span>`;
  ev.appendChild(document.createTextNode(text));
  log.appendChild(ev);
  while (log.children.length > 9) log.removeChild(log.firstChild);
}
