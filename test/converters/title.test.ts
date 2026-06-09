import { describe, it, expect } from "vitest";
import { titleConverter } from "../../src/core/converters/title.js";
import type { FigmaNode } from "../../src/core/types.js";

const frame = (children: FigmaNode[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "title", width: 200, height: 40, children,
});
const text = (s: string): FigmaNode => ({
  id: "t", type: "TEXT", name: s, characters: s, width: 100, height: 20, children: [],
});

describe("title converter", () => {
  it("uses the first text node as tit_main label", () => {
    const { slots, warnings } = titleConverter.extract(frame([text("회원 목록")]));
    expect(slots).toEqual({ label: "회원 목록" });
    expect(warnings).toEqual([]);
    expect(titleConverter.render(slots)).toBe(
      '<xf:group class="titbox" id="" style="">' +
        '<xf:group class="lt" id="">' +
        '<w2:textbox class="tit_main" id="" label="회원 목록" style="" tagname=""/>' +
        "</xf:group>" +
        '<xf:group class="rt" id="" style=""/>' +
        "</xf:group>"
    );
  });

  it("warns when no text node is found", () => {
    const { slots, warnings } = titleConverter.extract(frame([]));
    expect(slots).toEqual({ label: "" });
    expect(warnings[0].message).toContain("제목 텍스트");
  });
});
