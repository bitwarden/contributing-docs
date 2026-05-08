import React, { type ReactNode } from "react";
import { useDevMode } from "../contexts/devMode";

export default function Community({ children }: { children: ReactNode }): React.JSX.Element {
  const { devMode } = useDevMode();

  if (devMode === "community") {
    return <>{children}</>;
  }

  return <></>;
}
