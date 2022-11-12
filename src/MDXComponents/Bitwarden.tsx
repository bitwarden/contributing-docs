import React from "react";
import { useDevMode } from "../contexts/devMode";

export default function Bitwarden({ children }): JSX.Element {
  const {devMode} = useDevMode();

  if (devMode === "bitwarden") {
    return <>{children}</>;
  }

  return <></>;
}
