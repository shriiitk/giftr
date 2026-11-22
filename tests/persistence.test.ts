import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
  workspaceStorageKey,
  type WorkspaceSnapshot,
} from "@/lib/persistence";

function installStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
  return store;
}

const email = "friend@example.com";
const key = workspaceStorageKey(email);

const snapshot: WorkspaceSnapshot = {
  brief: {
    nickname: "The Coffee Purist",
    occasion: "Birthday",
    currency: "INR",
    currencyCustom: "",
    budgetMin: "1500",
    budgetMax: "4000",
    likes: "pour-over coffee",
    age: "",
    gender: "",
    location: "Bengaluru",
    job: "",
    owns: ["French press"],
    avoid: ["Gift cards"],
  },
  activeBrief: {
    nickname: "The Coffee Purist",
    occasion: "Birthday",
    currency: "INR",
    budgetMin: 1500,
    budgetMax: 4000,
    likes: "pour-over coffee",
    location: "Bengaluru",
    owns: ["French press"],
    avoid: ["Gift cards"],
  },
  ideas: [
    {
      id: "slot-1-test",
      slot: 1,
      title: "Stoneware Pour-Over Set",
      description: "A hand-glazed dripper and carafe.",
      estimatedPrice: 3200,
      currency: "INR",
      whyItFits: "Matches the pour-over ritual.",
      exactUrl: null,
      searchUrl: "https://www.google.com/search?q=Stoneware+Pour-Over+Set",
      shopUrl: "https://www.amazon.in/s?k=Stoneware+Pour-Over+Set",
      status: "rejected",
      rejectionReason: "Over budget",
    },
  ],
  note: "A slow-morning ritual.",
  view: "grid",
  rejectedTitles: ["Stoneware Pour-Over Set"],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("workspace persistence", () => {
  it("round-trips a workspace snapshot", () => {
    const store = installStorage();
    saveWorkspace(email, snapshot);
    expect(store.has(key)).toBe(true);
    expect(loadWorkspace(email)).toEqual(snapshot);
  });

  it("scopes snapshots to the signed-in email", () => {
    installStorage();
    saveWorkspace(email, snapshot);
    expect(loadWorkspace("other@example.com")).toBeNull();
  });

  it("clears the saved snapshot", () => {
    const store = installStorage();
    saveWorkspace(email, snapshot);
    clearWorkspace(email);
    expect(store.has(key)).toBe(false);
    expect(loadWorkspace(email)).toBeNull();
  });

  it("ignores malformed or stale snapshots", () => {
    const store = installStorage();
    store.set(key, "not json");
    expect(loadWorkspace(email)).toBeNull();

    store.set(key, JSON.stringify({ version: 99 }));
    expect(loadWorkspace(email)).toBeNull();
  });

  it("keeps a saved form but drops stale cards when there is no active brief", () => {
    installStorage();
    saveWorkspace(email, {
      ...snapshot,
      activeBrief: null,
      ideas: [],
      note: "",
      view: "intake",
      rejectedTitles: [],
    });
    expect(loadWorkspace(email)).toEqual({
      ...snapshot,
      activeBrief: null,
      ideas: [],
      note: "",
      view: "intake",
      rejectedTitles: [],
    });
  });

  it("returns null on the server where window is unavailable", () => {
    expect(loadWorkspace(email)).toBeNull();
  });
});
