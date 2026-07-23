// @vitest-environment jsdom
//
// Regression coverage for "useGame must be used within GameProvider" (the
// Base44 runtime error reported after commit cd7e2bb, "Add fragment card
// crafting"). Root cause: Collection.jsx and CollectionTab.jsx called
// useGame() unconditionally at the top of the component, so any render path
// that mounts them without the app's single canonical GameProvider ancestor
// (e.g. an external preview/issue-scanning tool rendering a page/component
// file in isolation, bypassing App.jsx's provider tree) throws instead of
// rendering something safe.
//
// This file actually mounts the real components with react-dom, under both
// the genuine app provider structure (GameProvider + MemoryRouter, the same
// shape App.jsx uses for the /collection route) and, deliberately, without
// it — the exact scenario from the bug report — to prove the fix holds in
// both directions, while confirming the useGame() safety guard itself still
// throws for any other consumer used incorrectly.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GameProvider, useGame } from "@/game/GameContext";
import Collection from "@/pages/Collection";
import CollectionTab from "@/components/game/CollectionTab";

let container;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

describe("Collection page — actual application provider structure", () => {
  it("renders the /collection route without throwing when wrapped in the real GameProvider", () => {
    const root = createRoot(container);
    expect(() => {
      act(() => {
        root.render(
          <MemoryRouter initialEntries={["/collection?tab=collection"]}>
            <GameProvider>
              <Collection />
            </GameProvider>
          </MemoryRouter>
        );
      });
    }).not.toThrow();
    expect(container.textContent).toContain("Cards");
    root.unmount();
  });

  it("renders safely (no throw) when mounted outside GameProvider — the reported Base44 preview/scanning scenario", () => {
    const root = createRoot(container);
    expect(() => {
      act(() => {
        root.render(
          <MemoryRouter initialEntries={["/collection"]}>
            <Collection />
          </MemoryRouter>
        );
      });
    }).not.toThrow();
    // No provider present — the page safely renders nothing instead of crashing.
    expect(container.textContent).toBe("");
    root.unmount();
  });
});

describe("CollectionTab — actual application provider structure", () => {
  it("renders without throwing under the real GameProvider (crafting/Fragments/Gold UI intact)", () => {
    const root = createRoot(container);
    expect(() => {
      act(() => {
        root.render(
          <GameProvider>
            <CollectionTab />
          </GameProvider>
        );
      });
    }).not.toThrow();
    // Faith Shards balance and the Fragments explanation are always present
    // once a provider is confirmed — confirms real context-driven content
    // still renders, not just an empty shell.
    expect(container.textContent).toContain("Faith Shards");
    root.unmount();
  });

  it("renders safely (no throw) when mounted outside GameProvider", () => {
    const root = createRoot(container);
    expect(() => {
      act(() => {
        root.render(<CollectionTab />);
      });
    }).not.toThrow();
    expect(container.textContent).toBe("");
    root.unmount();
  });
});

describe("useGame — safety guard is preserved for every other consumer", () => {
  it("still throws when used outside GameProvider", () => {
    function BrokenConsumer() {
      useGame();
      return null;
    }
    const root = createRoot(container);
    // React logs the render error to console as part of its own reporting;
    // suppress that expected noise for this specific assertion.
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => {
        act(() => {
          root.render(<BrokenConsumer />);
        });
      }).toThrow(/useGame must be used within GameProvider/);
    } finally {
      console.error = originalError;
    }
  });

  it("still returns the real context when used inside GameProvider", () => {
    let captured = null;
    function Consumer() {
      captured = useGame();
      return null;
    }
    const root = createRoot(container);
    act(() => {
      root.render(
        <GameProvider>
          <Consumer />
        </GameProvider>
      );
    });
    expect(captured).not.toBeNull();
    expect(typeof captured.craftCard).toBe("function");
    expect(typeof captured.convertFragments).toBe("function");
    root.unmount();
  });
});
