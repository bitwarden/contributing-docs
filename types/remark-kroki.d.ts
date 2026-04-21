// FIXME: delete this file once `remark-kroki` ships its own type definitions
// (or once `@types/remark-kroki` is published on DefinitelyTyped). Track
// upstream at https://github.com/show-docs/remark-kroki.
declare module "remark-kroki" {
  export interface RemarkKrokiOptions {
    server?: string;
    headers?: Record<string, string>;
    alias?: string[];
    output?: string;
    target?: "html" | "mdx3";
  }

  export function remarkKroki(options?: RemarkKrokiOptions): (tree: unknown) => Promise<void>;
}
