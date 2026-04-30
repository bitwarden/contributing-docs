import React from "react";

const formatDate = (date: Date): string | undefined => {
  try {
    return date.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
};

const AdrStatus = {
  Proposed: "Proposed",
  Accepted: "Accepted",
  Rejected: "Rejected",
  Deprecated: "Deprecated",
  Superseded: "Superseded",
} as const;

type AdrStatus = (typeof AdrStatus)[keyof typeof AdrStatus];

const badgeColors: Record<AdrStatus, string> = {
  [AdrStatus.Proposed]: "primary",
  [AdrStatus.Accepted]: "success",
  [AdrStatus.Rejected]: "danger",
  [AdrStatus.Deprecated]: "warning",
  [AdrStatus.Superseded]: "warning",
};

function isAdrStatus(value: unknown): value is AdrStatus {
  return typeof value === "string" && value in AdrStatus;
}

interface AdrFrontMatter {
  adr: string;
  status?: string;
  date: Date;
}

export default function AdrTable({
  frontMatter,
}: {
  frontMatter: AdrFrontMatter;
}): React.JSX.Element {
  const { status } = frontMatter;
  const badgeColor = isAdrStatus(status) ? badgeColors[status] : "secondary";

  return (
    <table>
      <tbody>
        <tr>
          <th>ID:</th>
          <td>ADR-{frontMatter.adr}</td>
        </tr>
        {status && (
          <tr>
            <th>Status:</th>
            <td>
              <span className={`badge badge--${badgeColor}`}>{status.toUpperCase()}</span>
            </td>
          </tr>
        )}
        <tr>
          <th>Published:</th>
          <td>{formatDate(frontMatter.date)}</td>
        </tr>
      </tbody>
    </table>
  );
}
