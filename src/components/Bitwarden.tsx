// FIXME: remove @ts-nocheck and address type errors in this file
// @ts-nocheck
import React from "react";
import { useDevMode } from "../contexts/devMode";

export default function Bitwarden({ children }): React.JSX.Element {
  const { devMode } = useDevMode();

  if (devMode === "bitwarden") {
    return <>{children}</>;
  }

  return <></>;
}
