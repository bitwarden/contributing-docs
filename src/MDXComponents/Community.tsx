import React from "react";
import { useDevMode } from "../contexts/devMode";

export default function Community({ children }): JSX.Element {
  const { devMode } = useDevMode();

  if (devMode === "community") {
    return <>{children}</>;
  }

  return <></>;
}
