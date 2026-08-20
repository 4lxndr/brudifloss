/* ============================================================
   FLOẞ-SIMULATOR – Brudivoeller_TV Edition
   Einstiegspunkt: verdrahtet Werkbank, Buttons und Debug-Zugang.
   ============================================================ */

import { $ } from "./config";
import { initBuilderInput, placed, renderBuild } from "./builder";
import { backToBuild, startTest, tryTape } from "./sim";
import { settings, sim } from "./state";
import { PARTS } from "./parts/index";
import { initGallery } from "./gallery";
import { initAccount, initOverlay, refreshBoard } from "./leaderboard";

if (document.getElementById("gallery-root")) {
  // gallery.html: nur die Element-Galerie rendern (dev-only)
  initGallery();
} else {
  $("start-btn").addEventListener("click", startTest);
  $("retry-btn").addEventListener("click", backToBuild);
  $("tape-btn").addEventListener("click", tryTape);

  // Modus-Switch: 600 m Klassik vs. Endlos
  const setMode = (endless: boolean) => {
    settings.endless = endless;
    $("mode-classic").classList.toggle("active", !endless);
    $("mode-endless").classList.toggle("active", endless);
    void refreshBoard();
  };
  $("mode-classic").addEventListener("click", () => setMode(false));
  $("mode-endless").addEventListener("click", () => setMode(true));

  initBuilderInput();
  renderBuild();
  void initAccount();
  initOverlay();
  void refreshBoard();

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
}
