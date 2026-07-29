"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  isLengthUnit,
  LENGTH_UNIT_STORAGE_KEY,
  type LengthUnit,
  metersToUnit,
  unitDecimals,
  unitStep,
  unitToMeters,
  formatLength,
  LENGTH_UNIT_SHORT,
} from "@/lib/units";

type Listener = () => void;

let memoryUnit: LengthUnit = "m";
const listeners = new Set<Listener>();

function readStored(): LengthUnit {
  if (typeof window === "undefined") return "m";
  try {
    const raw = localStorage.getItem(LENGTH_UNIT_STORAGE_KEY);
    if (isLengthUnit(raw)) return raw;
  } catch {
    /* ignore */
  }
  return memoryUnit;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): LengthUnit {
  return memoryUnit;
}

function getServerSnapshot(): LengthUnit {
  return "m";
}

/** Call once on the client to hydrate from localStorage. */
function hydrateFromStorage() {
  const next = readStored();
  if (next !== memoryUnit) {
    memoryUnit = next;
    emit();
  }
}

export function setLengthUnit(unit: LengthUnit) {
  memoryUnit = unit;
  try {
    localStorage.setItem(LENGTH_UNIT_STORAGE_KEY, unit);
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * Shared length-unit preference (m / cm / ft / in).
 * Geometry stays in meters; convert only for display and user input.
 */
export function useLengthUnit() {
  const unit = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LENGTH_UNIT_STORAGE_KEY) hydrateFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUnit = useCallback((next: LengthUnit) => {
    setLengthUnit(next);
  }, []);

  return {
    unit,
    ready,
    setUnit,
    label: LENGTH_UNIT_SHORT[unit],
    decimals: unitDecimals(unit),
    step: unitStep(unit),
    toDisplay: (meters: number) => metersToUnit(meters, unit),
    fromDisplay: (value: number) => unitToMeters(value, unit),
    format: (meters: number, digits?: number) =>
      formatLength(meters, unit, digits),
  };
}
