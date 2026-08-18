/* ============================================================
   FLOẞ-SIMULATOR – Brudivoeller_TV Edition
   Einstiegspunkt: verdrahtet Werkbank, Buttons und Debug-Zugang.
   ============================================================ */

import { $ } from "./config";
import { initBuilderInput, placed, renderBuild } from "./builder";
import { backToBuild, startTest } from "./sim";
import { sim } from "./state";
import { PARTS } from "./parts/index";

$("start-btn").addEventListener("click", startTest);
$("retry-btn").addEventListener("click", backToBuild);

initBuilderInput();
renderBuild();

// Debug-Zugang nur mit ?debugflos in der URL (für Entwicklung/Tests)
if (location.search.includes("debugflos")) {
  (window as any).__flos = {
    sim,
    PARTS,
    get placed() {
      return placed;
    },
  };
}
