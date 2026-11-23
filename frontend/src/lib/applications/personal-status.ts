"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { PersonalStage } from "./status";
import { PERSONAL_STAGE_MAP } from "./status";

export interface PersonalStatusRecord {
  stage: PersonalStage | null;
  note?: string;
  relevantDate?: string;
  updatedAt: string;
}

export type PersonalStatusStore = Record<string, PersonalStatusRecord>;

const STORAGE_KEY = "getswydd.personalStatus.v1";

let memoryStore: PersonalStatusStore = {};
let isInitialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function isValidPersonalStage(stage: unknown): stage is PersonalStage {
  return typeof stage === "string" && stage in PERSONAL_STAGE_MAP;
}

function parseAndValidateStore(raw: string | null): PersonalStatusStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const clean: PersonalStatusStore = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const item = val as Record<string, unknown>;
        const stage = isValidPersonalStage(item.stage) ? item.stage : null;
        const note = typeof item.note === "string" ? item.note.slice(0, 500) : undefined;
        const relevantDate = typeof item.relevantDate === "string" ? item.relevantDate : undefined;
        const updatedAt = typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString();

        if (stage !== null || note || relevantDate) {
          clean[key] = { stage, note, relevantDate, updatedAt };
        }
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function loadStore(): PersonalStatusStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return parseAndValidateStore(raw);
  } catch {
    return {};
  }
}

function saveStore(store: PersonalStatusStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // LocalStorage quota or unavailable
  }
}

function ensureInitialized() {
  if (!isInitialized && typeof window !== "undefined") {
    memoryStore = loadStore();
    isInitialized = true;
  }
}

export function getPersonalStatus(appKey: string): PersonalStatusRecord | null {
  ensureInitialized();
  return memoryStore[appKey] ?? null;
}

export function setPersonalStatus(
  appKey: string,
  entry: { stage: PersonalStage | null; note?: string; relevantDate?: string }
) {
  ensureInitialized();
  const record: PersonalStatusRecord = {
    stage: entry.stage,
    note: entry.note?.trim() || undefined,
    relevantDate: entry.relevantDate || undefined,
    updatedAt: new Date().toISOString(),
  };

  if (!record.stage && !record.note && !record.relevantDate) {
    const next = { ...memoryStore };
    delete next[appKey];
    memoryStore = next;
  } else {
    memoryStore = {
      ...memoryStore,
      [appKey]: record,
    };
  }

  saveStore(memoryStore);
  notify();
}

export function clearPersonalStatus(appKey: string) {
  ensureInitialized();
  if (memoryStore[appKey]) {
    const next = { ...memoryStore };
    delete next[appKey];
    memoryStore = next;
    saveStore(memoryStore);
    notify();
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): PersonalStatusStore {
  ensureInitialized();
  return memoryStore;
}

const emptyStore: PersonalStatusStore = {};
function getServerSnapshot(): PersonalStatusStore {
  return emptyStore;
}

export function useAllPersonalStatuses(): PersonalStatusStore {
  const [mounted, setMounted] = useState(false);
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureInitialized();
    queueMicrotask(() => setMounted(true));
    notify();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        memoryStore = parseAndValidateStore(e.newValue);
        notify();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return mounted ? store : emptyStore;
}

export function usePersonalStatus(appKey: string): {
  status: PersonalStatusRecord | null;
  updateStatus: (entry: { stage: PersonalStage | null; note?: string; relevantDate?: string }) => void;
  clearStatus: () => void;
} {
  const store = useAllPersonalStatuses();
  const status = store[appKey] ?? null;

  return {
    status,
    updateStatus: (entry) => setPersonalStatus(appKey, entry),
    clearStatus: () => clearPersonalStatus(appKey),
  };
}
