/**
 * Remark plugin to replace remote placeholders with fetched content.
 *
 * Uses backtick syntax which stays atomic in MDX:
 *   `remote:https://example.com/file.txt`
 *   `remote:https://example.com/data.json|path.to.value`
 *
 * Also handles placeholders split across multiple adjacent text nodes.
 */
function remarkRemoteValues() {
  const DEBUG = true;
  const log = (...args) => {
    if (DEBUG) console.log("[remark-remote-values]", ...args);
  };

  const cache = new Map();

  if (DEBUG) log("plugin initialized. Debug logging enabled:", DEBUG);

  return async function transformer(tree) {
    // Step 1: Merge adjacent text nodes to handle split placeholders
    mergeAdjacentTextNodes(tree);

    // Step 2: Find and process placeholders
    const placeholders = [];

    walk(tree, (node) => {
      if (node.type === "inlineCode" && node.value) {
        const match = node.value.match(/^remote:([^|]+)(?:\|([^`]+))?$/);
        if (match) {
          placeholders.push({
            node,
            url: match[1].trim(),
            path: match[2] ? match[2].trim() : undefined,
          });
        }
      }
    });

    if (placeholders.length === 0) return;

    // Step 3: Fetch all unique URLs in parallel
    const uniqueUrls = [...new Set(placeholders.map((p) => `${p.url}|${p.path || ""}`))];

    await Promise.all(
      uniqueUrls.map(async (key) => {
        if (cache.has(key)) return;

        const [url, path] = key.split("|");
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
          }

          const contentType = response.headers.get("content-type") || "";
          let content;

          if (contentType.includes("application/json") || url.endsWith(".json")) {
            const data = await response.json();
            content = path ? extractJsonPath(data, path) : JSON.stringify(data);
          } else {
            content = await response.text();
          }

          content = String(content || "").trim();
          cache.set(key, content);
        } catch (error) {
          console.error(`remark-remote-values: ${error.message}`);
          cache.set(key, ""); // Cache empty result to avoid retrying
        }
      }),
    );

    // Step 4: Replace placeholders with fetched content
    placeholders.forEach(({ node, url, path }) => {
      const key = `${url}|${path || ""}`;
      const content = cache.get(key) || "";

      // Replace inlineCode node with text node
      node.type = "text";
      node.value = content;
      delete node.lang;
      delete node.meta;
      log(`replaced placeholder ${key} with content: ${content}`);
    });
  };
}

// Lightweight AST walker
function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  visitor(node);
  if (node.children) {
    for (const child of node.children) {
      walk(child, visitor);
    }
  }
}

function mergeAdjacentTextNodes(node) {
  if (!node.children) return;

  const children = node.children;
  let i = 0;

  while (i < children.length - 1) {
    const current = children[i];
    const next = children[i + 1];

    if (current.type === "text" && next.type === "text") {
      // Merge adjacent text nodes
      current.value += next.value;
      children.splice(i + 1, 1);
      // Don't increment i, check if we can merge with the next node too
    } else {
      // Recursively process child nodes
      mergeAdjacentTextNodes(current);
      i++;
    }
  }

  // Process the last child
  if (children.length > 0) {
    mergeAdjacentTextNodes(children[children.length - 1]);
  }
}

function extractJsonPath(data, path) {
  if (!path) return JSON.stringify(data);

  const parts = path.split(".");
  let current = data;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return "";
    }
  }

  return current;
}

module.exports = remarkRemoteValues;
