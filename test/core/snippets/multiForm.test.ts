import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import * as M from "../../../src/core/snippets/builders/multiForm.js";

describe("multi input forms", () => {
  it("phone has a select and dash separators", () => {
    const xml = serialize(M.buildPhone());
    expect(xml).toContain("xf:select1");
    expect(xml.match(/label="-"/g)?.length).toBe(2);
  });

  it("email has @ separator and 3 inputs/select", () => {
    const xml = serialize(M.buildEmail());
    expect(xml).toContain('label="@"');
  });

  it("address is flex_col with a search button", () => {
    const xml = serialize(M.buildAddress());
    expect(xml).toContain('class="flex_col"');
    expect(xml).toContain("btn_cm search icon");
  });

  it("amount is a right-aligned number input with 원", () => {
    const xml = serialize(M.buildAmount());
    expect(xml).toContain('dataType="number"');
    expect(xml).toContain('label="원"');
  });
});
