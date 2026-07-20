import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression guard: startDailyBattle previously read the player's
// profile.activeDeck (custom deck) instead of the sealed dailyConfig.deck.
// This test pins the fixed behavior at the source level so the bug can't
// silently come back.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.resolve(__dirname, "../GameContext.jsx"),
  "utf-8"
);

function extractFunctionBody(src, startMarker) {
  const start = src.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  // Grab a generous window after the marker — startDailyBattle is a short
  // function, so this comfortably covers its whole body plus a margin.
  return src.slice(start, start + 1500);
}

describe("startDailyBattle uses the sealed daily deck, not the player's profile", () => {
  const body = extractFunctionBody(source, "const startDailyBattle = useCallback");

  it("reads the deck from dailyConfig, not from profile.activeDeck", () => {
    expect(body).toContain("dailyConfig.deck");
    expect(body).not.toMatch(/profile\.activeDeck/);
  });

  it("never mutates the player's saved profile when starting a Daily Challenge run", () => {
    expect(body).not.toMatch(/saveProfile\(/);
    expect(body).not.toMatch(/setProfile\(/);
  });

  it("stores the battle mode explicitly as \"daily\"", () => {
    expect(body).toMatch(/mode:\s*"daily"/);
    expect(body).toMatch(/isDaily:\s*true/);
  });
});
