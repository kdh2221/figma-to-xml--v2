import { describe, it, expect } from "vitest";
import * as N from "../../../src/core/recursive/names.js";
import type { FigmaNode } from "../../../src/core/types.js";

const node = (name: string, children: FigmaNode[] = [], type = "INSTANCE"): FigmaNode =>
  ({ id: name, type, name, width: 40, height: 20, children });
const text = (s: string): FigmaNode =>
  ({ id: "t" + s, type: "TEXT", name: s, characters: s, width: 10, height: 10, children: [] });

describe("recursive names", () => {
  it("isTable matches 'Table' case-insensitively", () => {
    expect(N.isTable(node("Table"))).toBe(true);
    expect(N.isTable(node("table"))).toBe(true);
    expect(N.isTable(node("Frame 2561"))).toBe(false);
  });
  it("isLabelCell matches 'label'", () => {
    expect(N.isLabelCell(node("label"))).toBe(true);
    expect(N.isLabelCell(node("Table"))).toBe(false);
  });
  it("isTdCell matches control-char-prefixed td (\\btd)", () => {
    expect(N.isTdCell(node("\btd"))).toBe(true);
    expect(N.isTdCell(node("td"))).toBe(true);
    expect(N.isTdCell(node("label"))).toBe(false);
  });
  it("isSelectbox / isBoxItem / isButtonNode", () => {
    expect(N.isSelectbox(node("selectbox"))).toBe(true);
    expect(N.isBoxItem(node("item/boxitem"))).toBe(true);
    expect(N.isButtonNode(node("Button"))).toBe(true);
    expect(N.isButtonNode(node("Button_M"))).toBe(true);
    expect(N.isButtonNode(node("label"))).toBe(false);
  });
  it("isRequiredLabel detects a '*' text descendant", () => {
    expect(N.isRequiredLabel(node("label", [text("필수 항목"), text("*")]))).toBe(true);
    expect(N.isRequiredLabel(node("label", [text("항목")]))).toBe(false);
  });
  it("controlKindOfBoxItem reads child icon name", () => {
    expect(N.controlKindOfBoxItem(node("item/boxitem", [text("P"), node("arrow-down")]))).toBe("select");
    expect(N.controlKindOfBoxItem(node("item/boxitem", [text("P"), node("calendar")]))).toBe("calendar");
    expect(N.controlKindOfBoxItem(node("item/boxitem", [text("P"), node("search-01")]))).toBe("input");
  });
});
