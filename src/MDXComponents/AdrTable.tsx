import React from "react";

const formatDate = (date: Date) => {
  try {
    return date.toISOString().split("T")[0];
  } catch {}
};

export default function AdrTable({ frontMatter }): JSX.Element {
  return (
    <table>
      <tbody>
        <tr>
          <th>ID:</th>
          <td>ADR-{frontMatter.adr}</td>
        </tr>
        <tr>
          <th>Status:</th>
          <td>ADR-{frontMatter.adr}</td>
        </tr>
        <tr>
          <th>Published:</th>
          <td>{formatDate(frontMatter.date)}</td>
        </tr>
      </tbody>
    </table>
  );
}
