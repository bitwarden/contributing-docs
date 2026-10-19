import React, { type ReactNode } from "react";
import clsx from "clsx";
import DefaultAdmonitionTypes from "@theme-original/Admonition/Types";
import AdmonitionLayout from "@theme/Admonition/Layout";
import type { Props } from "@theme/Admonition/Type/Info";

// Question-mark counterpart to the built-in info icon, drawn on the same 14x16 grid
function IconQuestion(): ReactNode {
  return (
    <svg viewBox="0 0 14 16">
      <path
        fillRule="evenodd"
        d="M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z"
      />
      <path
        d="M5.1 6.3a1.95 1.95 0 1 1 2.75 1.8c-.55.25-.85.65-.85 1.2v.5"
        fill="none"
        style={{ stroke: "var(--ifm-alert-foreground-color)" }}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="7" cy="11.5" r="0.85" />
    </svg>
  );
}

// Anticipated question answered in place, written as :::faq[Question?]
function AdmonitionTypeFaq(props: Props): ReactNode {
  return (
    <AdmonitionLayout
      icon={<IconQuestion />}
      title="question"
      {...props}
      className={clsx("alert alert--info", props.className)}
    >
      {props.children}
    </AdmonitionLayout>
  );
}

export default {
  ...DefaultAdmonitionTypes,
  faq: AdmonitionTypeFaq,
};
