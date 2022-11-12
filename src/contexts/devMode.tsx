// Based on https://github.com/facebook/docusaurus/blob/main/packages/docusaurus-theme-common/src/contexts/colorMode.tsx
import React, { useState, useEffect, useContext, useMemo, type ReactNode } from "react";
import { createStorageSlot, ReactContextError } from "@docusaurus/theme-common";

type ContextValue = {
  readonly devMode: DevMode;
  readonly setDevMode: (devMode: DevMode) => void;
};

const Context = React.createContext<ContextValue | undefined>(undefined);

const DevModeStorageKey = "bitwarden-dev";
const DevModeStorage = createStorageSlot(DevModeStorageKey);

export const DevModes = {
  community: "community",
  bitwarden: "bitwarden",
} as const;

export type DevMode = typeof DevModes[keyof typeof DevModes];

const coerceToDevMode = (devMode?: string | null): DevMode =>
  devMode === DevModes.bitwarden ? DevModes.bitwarden : DevModes.community;

const storeDevMode = (newDevMode: DevMode) => {
  DevModeStorage.set(coerceToDevMode(newDevMode));
};

function useContextValue(): ContextValue {
  const [devMode, setDevModeState] = useState(coerceToDevMode(DevModeStorage.get()));

  const setDevMode = (newDevMode: DevMode) => {
    setDevModeState(newDevMode);
    storeDevMode(newDevMode);
  };

  useEffect(() => {
    const onChange = (e: StorageEvent) => {
      if (e.key !== DevModeStorageKey) {
        return;
      }
      const storedDevMode = DevModeStorage.get();
      if (storedDevMode !== null) {
        setDevMode(coerceToDevMode(storedDevMode));
      }
    };
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, [setDevMode]);

  return useMemo(
    () => ({
      devMode,
      setDevMode,
    }),
    [devMode, setDevMode]
  );
}

export function DevModeProvider({ children }: { children: ReactNode }): JSX.Element {
  const value = useContextValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDevMode(): ContextValue {
  const context = useContext(Context);
  if (context == null) {
    throw new ReactContextError("DevModeProvider");
  }
  return context;
}
