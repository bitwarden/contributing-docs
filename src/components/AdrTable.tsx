import React from "react";

const formatDate = (date: Date) => {
  try {
    return date.toISOString().split("T")[0];
  } catch {}
};

const badgeColors = {
  Proposed: "primary",
  Accepted: "success",
  Rejected: "danger",
  Deprecated: "warning",
  Superseded: "warning",
};

export default function AdrTable({ frontMatter }): JSX.Element {
  return (
    <table>
      <tbody>
        <tr>
          <th>ID:</th>
          <td>ADR-{frontMatter.adr}</td>
        </tr>
        {frontMatter.status && (
          <tr>
            <th>Status:</th>
            <td>
              <span className={`badge badge--${badgeColors[frontMatter.status] ?? "secondary"}`}>
                {frontMatter.status?.toUpperCase()}
              </span>
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
