export type MdLineKind = "heading" | "fence" | "text" | "list" | "comment";

export interface MdLine {
  n: number;
  kind: MdLineKind;
  text: string;
}

export interface MarkdownDoc {
  lines: MdLine[];
}

/**
 * Minimal markdown structure parser. Classifies each line without building
 * an AST: headings, fenced code blocks, full-line HTML comments, list
 * items, and plain text. Inline spans (backticks, links) stay in `text`
 * verbatim for downstream rule extraction.
 */
export function parseMarkdown(text: string): MarkdownDoc {
  const lines: MdLine[] = [];
  const raw = text.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i] ?? "";
    const n = i + 1;
    if (line.startsWith("```") || line.startsWith("~~~")) {
      lines.push({ n, kind: "fence", text: line });
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      lines.push({ n, kind: "fence", text: line });
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      lines.push({ n, kind: "heading", text: line });
      continue;
    }
    if (/^\s*<!--.*-->\s*$/.test(line)) {
      lines.push({ n, kind: "comment", text: line });
      continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s/.test(line)) {
      lines.push({ n, kind: "list", text: line });
      continue;
    }
    lines.push({ n, kind: "text", text: line });
  }
  return { lines };
}

/** Heading level and normalized title of a heading line, if it is one. */
export function headingOf(line: MdLine): { level: number; title: string } | undefined {
  if (line.kind !== "heading") return undefined;
  const m = /^(#{1,6})\s+(.*)$/.exec(line.text);
  if (!m || m[2] === undefined) return undefined;
  return { level: m[1]!.length, title: m[2].trim().toLowerCase() };
}
