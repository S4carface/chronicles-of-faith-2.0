import { describe, it, expect, beforeEach } from "vitest";
import {
  CARDS_TABS,
  DEFAULT_CARDS_TAB,
  LEGACY_SHOP_REDIRECT,
  isValidCardsTab,
  resolveInitialCardsTab,
  loadStoredCardsTab,
  saveStoredCardsTab,
} from "@/game/cardsHubTabs";

// localStorage polyfill for the "reopen last tab" persistence tests.
class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.has(k) ? this.store.get(k) : null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
globalThis.localStorage = new MemoryStorage();

describe("Cards hub tab set", () => {
  it("keeps all three tabs, in Deck / Collection / Shop order", () => {
    expect(CARDS_TABS).toEqual(["deck", "collection", "shop"]);
  });
  it("defaults to Deck", () => {
    expect(DEFAULT_CARDS_TAB).toBe("deck");
  });
  it("validates tab keys", () => {
    expect(isValidCardsTab("shop")).toBe(true);
    expect(isValidCardsTab("nope")).toBe(false);
    expect(isValidCardsTab(undefined)).toBe(false);
    expect(isValidCardsTab(null)).toBe(false);
  });
});

describe("resolveInitialCardsTab", () => {
  it("Test 1 — a first-time visitor (no param, no stored preference) opens Deck", () => {
    expect(resolveInitialCardsTab({ tabParam: null, storedTab: null })).toBe("deck");
  });

  it("Test 6 — a direct link with ?tab=shop opens the Shop tab", () => {
    expect(resolveInitialCardsTab({ tabParam: "shop", storedTab: null })).toBe("shop");
    // Even overriding a different stored preference — the explicit param wins.
    expect(resolveInitialCardsTab({ tabParam: "shop", storedTab: "deck" })).toBe("shop");
  });

  it("Test 7 — refreshing on Shop (tab param persists in the URL) restores Shop", () => {
    expect(resolveInitialCardsTab({ tabParam: "shop", storedTab: "collection" })).toBe("shop");
  });

  it("a returning visitor (no param) reopens their last selected tab", () => {
    expect(resolveInitialCardsTab({ tabParam: null, storedTab: "collection" })).toBe("collection");
    expect(resolveInitialCardsTab({ tabParam: null, storedTab: "shop" })).toBe("shop");
  });

  it("an invalid tab param falls back to the stored preference, then Deck", () => {
    expect(resolveInitialCardsTab({ tabParam: "bogus", storedTab: "collection" })).toBe("collection");
    expect(resolveInitialCardsTab({ tabParam: "bogus", storedTab: null })).toBe("deck");
  });
});

describe("stored Cards tab persistence", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a saved tab", () => {
    expect(loadStoredCardsTab()).toBeNull();
    saveStoredCardsTab("shop");
    expect(loadStoredCardsTab()).toBe("shop");
  });

  it("Test 15 — persists across a simulated reload (fresh read from storage)", () => {
    saveStoredCardsTab("collection");
    // Simulate a reload: nothing but localStorage carries state forward.
    expect(loadStoredCardsTab()).toBe("collection");
  });

  it("ignores an invalid stored value defensively", () => {
    localStorage.setItem("chronicles_of_faith_cards_tab", "not_a_tab");
    expect(loadStoredCardsTab()).toBeNull();
  });

  it("never stores an invalid tab", () => {
    saveStoredCardsTab("deck");
    saveStoredCardsTab("invalid");
    expect(loadStoredCardsTab()).toBe("deck");
  });
});

describe("Test 13 — legacy Shop route mapping", () => {
  it("maps the legacy /shop route to the Cards hub's Shop tab", () => {
    expect(LEGACY_SHOP_REDIRECT).toBe("/collection?tab=shop");
  });
});
