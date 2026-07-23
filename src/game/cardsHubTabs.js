// Cards hub tab resolution — single source of truth for which of the three
// Cards tabs (Deck / Collection / Shop) should be active. Pure functions plus
// a thin localStorage wrapper for "reopen the last selected tab", kept
// separate from the profile blob because it is ephemeral UI state, not
// durable game progression.

export const CARDS_TABS = ["deck", "collection", "shop"];
export const DEFAULT_CARDS_TAB = "deck";

// The canonical path for the Shop, reached via the Cards hub. Anything linking
// to the legacy standalone /shop route should redirect here.
export const LEGACY_SHOP_REDIRECT = "/collection?tab=shop";

const STORAGE_KEY = "chronicles_of_faith_cards_tab";

export function isValidCardsTab(tab) {
  return CARDS_TABS.includes(tab);
}

// Resolves which tab should be active on entering the Cards hub.
//   1. An explicit, valid ?tab= query param always wins (direct Shop links,
//      and refreshing the page, both restore the exact tab from the URL).
//   2. Otherwise, a previously-stored preference reopens for a returning visitor.
//   3. Otherwise (first-time visitor, no param, no stored preference), Deck.
export function resolveInitialCardsTab({ tabParam, storedTab } = {}) {
  if (isValidCardsTab(tabParam)) return tabParam;
  if (isValidCardsTab(storedTab)) return storedTab;
  return DEFAULT_CARDS_TAB;
}

export function loadStoredCardsTab() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isValidCardsTab(raw) ? raw : null;
  } catch (e) {
    return null;
  }
}

export function saveStoredCardsTab(tab) {
  if (!isValidCardsTab(tab)) return;
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch (e) {
    // Ignore storage failures (private browsing, quota) — the tab still works
    // for this session via the URL param and in-memory state.
  }
}
