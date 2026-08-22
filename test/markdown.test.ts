import { describe, expect, it } from "vitest";
import { headingOf, parseMarkdown } from "../src/markdown.js";

describe("parseMarkdown", () => {
  it("classifies heading, comment, fence, text", () => {
    const doc = parseMarkdown(
      "# T\n\n<!-- c -->\n\n```sh\nnpm run x\n```\nplain `src/lib`",
    );
    expect(doc.lines.map((l) => l.kind)).toEqual([
      "heading",
      "text",
      "comment",
      "text",
      "fence",
      "fence",
      "fence",
      "text",
    ]);
    expect(doc.lines[7]?.text).toContain("`src/lib`");
  });

  it("marks list lines and keeps 1-based numbering", () => {
    const doc = parseMarkdown("intro\n- item\n2. ordered");
    expect(doc.lines[1]).toMatchObject({ n: 2, kind: "list" });
    expect(doc.lines[2]).toMatchObject({ n: 3, kind: "list" });
  });

  it("treats indented comment-only lines as comments", () => {
    const doc = parseMarkdown("  <!-- x -->");
    expect(doc.lines[0]?.kind).toBe("comment");
  });

  it("headingOf returns level and normalized title", () => {
    const doc = parseMarkdown("## Setup & Install\n");
    expect(headingOf(doc.lines[0]!)).toEqual({
      level: 2,
      title: "setup & install",
    });
    expect(headingOf({ n: 1, kind: "text", text: "nope" })).toBeUndefined();
  });
});
