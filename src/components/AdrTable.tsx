import React from "react";

const formatDate = (date: Date): string | undefined => {
  try {
    return date.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
};

const badgeColors = {
  Proposed: "primary",
  Accepted: "success",
  Rejected: "danger",
  Deprecated: "warning",
  Superseded: "warning",
};

const isBadgeColorKey = (key: string): key is keyof typeof badgeColors => key in badgeColors;

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
  const badgeColor = status && isBadgeColorKey(status) ? badgeColors[status] : "secondary";

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
