import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTableXml, buildControl } from "../../../src/core/recursive/table.js";
import type { FigmaNode } from "../../../src/core/types.js";

let seq = 0;
const F = (name: string, children: FigmaNode[], layoutMode?: string): FigmaNode =>
  ({ id: name + ++seq, type: "FRAME", name, width: 100, height: 38, children, ...(layoutMode ? { layoutMode } : {}) });
const I = (name: string, children: FigmaNode[]): FigmaNode =>
  ({ id: name + ++seq, type: "INSTANCE", name, width: 40, height: 20, children });
const TX = (s: string): FigmaNode =>
  ({ id: "t" + ++seq, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] });

const label = (t: string, req = false) => I("label", req ? [TX(t), TX("*")] : [TX(t)]);
const td = (children: FigmaNode[]) => I("\btd", children);
const boxSelect = () => I("item/boxitem", [TX("Placeholder"), I("arrow-down", [])]);
const button = (l: string) => I("Button", [TX(l)]);

// 폼형 2단 테이블 (332:10400 구조 모사)
const formTable = F("Table", [
  F("row1", [
    F("h1", [label("항목"), td([TX("input field"), button("버튼")])], "HORIZONTAL"),
    F("h2", [label("항목"), td([TX("input field")])], "HORIZONTAL"),
  ], "HORIZONTAL"),
  F("row2", [
    F("h3", [label("필수 항목", true), boxSelect()], "HORIZONTAL"),
    F("h4", [label("항목"), td([TX("input field")])], "HORIZONTAL"),
  ], "HORIZONTAL"),
], "VERTICAL");

describe("buildControl", () => {
  it("selectbox/boxitem(arrow-down) → select", () => {
    expect(serialize(buildControl(boxSelect()))).toContain("xf:select1");
  });
  it("Button → btn_cm with label", () => {
    expect(serialize(buildControl(button("조회")))).toContain('label="조회"');
  });
});

describe("buildTableXml (form, no coords)", () => {
  const xml = serialize(buildTableXml(formTable));
  it("th count = number of label cells (4), not every text", () => {
    expect((xml.match(/tagname="th"/g) ?? []).length).toBe(4);
  });
  it("td count = number of value cells (4)", () => {
    expect((xml.match(/tagname="td"/g) ?? []).length).toBe(4);
  });
  it("required label gets req class", () => {
    expect(xml).toContain('class="req"');
  });
  it("value cell renders a control (select for arrow-down boxitem)", () => {
    expect(xml).toContain("xf:select1");
  });
  it("is wrapped in tblbox/w2tb tbl", () => {
    expect(xml).toContain('class="tblbox"');
    expect(xml).toContain('class="w2tb tbl"');
  });
});
