import React from "react";
import { useDevMode } from "../contexts/devMode";

export default function Community({ children }): React.JSX.Element {
  const { devMode } = useDevMode();

  if (devMode === "community") {
    return <>{children}</>;
  }

  return <></>;
}
