import { describe, it, expect } from "vitest";
import { inputTableConverter } from "../../src/core/converters/inputTable.js";
import type { FigmaNode } from "../../src/core/types.js";
import { buildListTable, buildMultiTable } from "../../src/core/converters/inputTable.js";
import { serialize } from "../../src/core/xml.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 80, height: 16, children: [],
});
const table = (labels: string[]): FigmaNode => ({
  id: "tb", type: "FRAME", name: "table", width: 600, height: 100, children: labels.map(text),
});

describe("inputTable converter", () => {
  it("renders a 1-col form table with one label row", () => {
    const { slots, warnings } = inputTableConverter.extract(table(["이름"]));
    expect(warnings).toEqual([]);
    const xml = inputTableConverter.render({ ...slots, cols: 1 });
    expect(xml).toBe(
      '<xf:group class="tblbox" id="" style="">' +
        '<xf:group class="w2tb tbl" tagname="table">' +
          '<xf:group tagname="colgroup">' +
            '<xf:group style="width:100px;" tagname="col"/><xf:group tagname="col"/>' +
          "</xf:group>" +
          '<xf:group tagname="tr">' +
            '<xf:group class="w2tb_th" tagname="th"><w2:textbox label="이름"/></xf:group>' +
            '<xf:group class="w2tb_td" tagname="td"/>' +
          "</xf:group>" +
        "</xf:group>" +
      "</xf:group>"
    );
  });

  it("pads the last row when label count is not a multiple of cols", () => {
    const { slots } = inputTableConverter.extract(table(["A", "B", "C"]));
    const result = inputTableConverter.render({ ...slots, cols: 2 });
    // 3 labels / 2 cols => 2 rows (2 + padded 1).
    expect(result.match(/tagname="tr"/g)?.length).toBe(2);
  });
});

describe("buildListTable (목록형)", () => {
  it("header row of th + data row of td, no label column", () => {
    const xml = serialize(buildListTable(["A", "B", "C"]));
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(3);
    expect(xml.match(/class="w2tb_td"/g)?.length).toBe(3);
    expect(xml).toContain('label="A"');
    expect(xml).not.toContain('style="width:100px;"'); // 라벨열 없음
  });
  it("falls back to 1 column when no headers", () => {
    const xml = serialize(buildListTable([]));
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(1);
  });
});

describe("buildMultiTable (멀티형)", () => {
  it("row-header column + column headers + data row", () => {
    const xml = serialize(buildMultiTable(["A", "B"]));
    expect(xml).toContain('style="width:100px;"');        // 행헤더 col
    expect(xml.match(/class="w2tb_th req"/g)?.length).toBe(2); // 헤더행 선두 + 데이터행 선두
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(2); // 컬럼헤더 2
    expect(xml.match(/class="w2tb_td"/g)?.length).toBe(2);     // 데이터 셀 2
  });
});
