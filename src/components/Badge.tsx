import React from "react";
import { rgb, stringToColor, visibleOverlayColor } from "./colors";

export function Badge({
  children,
  bgColor,
}: {
  children: JSX.Element | string;
  bgColor: string;
}): JSX.Element {
  return (
    <span
      className={[
        "tw-inline-block",
        "tw-py-0.5",
        "tw-px-1.5",
        "tw-font-bold",
        "tw-text-center",
        "tw-align-text-top",
        "!tw-text-contrast",
        "tw-rounded",
        "tw-border-none",
        "tw-box-border",
        "tw-whitespace-nowrap",
        "tw-text-xs",
        "hover:tw-no-underline",
        "focus:tw-outline-none",
        "focus:tw-ring",
        "focus:tw-ring-offset-2",
        "focus:tw-ring-blue-700",
      ].join(" ")}
      style={{
        backgroundColor: bgColor,
        color: visibleOverlayColor(rgb(bgColor)),
      }}
    >
      {children}
    </span>
  );
}
