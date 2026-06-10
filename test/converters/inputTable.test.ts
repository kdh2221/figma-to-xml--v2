import { describe, it, expect } from "vitest";
import { inputTableConverter } from "../../src/core/converters/inputTable.js";
import type { FigmaNode } from "../../src/core/types.js";

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
