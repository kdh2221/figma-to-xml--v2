import { describe, it, expect } from "vitest";
import { buttonConverter } from "../../src/core/converters/button.js";
import type { FigmaNode } from "../../src/core/types.js";

const btn = (label: string): FigmaNode => ({
  id: "b", type: "FRAME", name: "btn", width: 80, height: 32,
  children: [{ id: "t", type: "TEXT", name: label, characters: label, width: 40, height: 16, children: [] }],
});

describe("button converter", () => {
  it("renders a btn_cm button with the text label", () => {
    const { slots, warnings } = buttonConverter.extract(btn("저장"));
    expect(slots).toEqual({ label: "저장" });
    expect(warnings).toEqual([]);
    expect(buttonConverter.render(slots)).toBe(
      '<w2:button class="btn_cm" id="" style="">' +
        '<w2:textbox id="" label="저장" style="" tagname="span"/>' +
        "</w2:button>"
    );
  });

  it("warns when no label text is found", () => {
    const empty: FigmaNode = { id: "b", type: "FRAME", name: "btn", width: 80, height: 32, children: [] };
    const { slots, warnings } = buttonConverter.extract(empty);
    expect(slots).toEqual({ label: "" });
    expect(warnings[0].message).toContain("버튼 라벨");
  });
});
