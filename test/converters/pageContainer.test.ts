import { describe, it, expect } from "vitest";
import { pageContainerConverter } from "../../src/core/converters/pageContainer.js";
import type { FigmaNode } from "../../src/core/types.js";

const node: FigmaNode = { id: "p", type: "FRAME", name: "page", width: 1280, height: 800, children: [] };

describe("pageContainer converter", () => {
  it("renders an empty sub_contents container", () => {
    const { slots, warnings } = pageContainerConverter.extract(node);
    expect(warnings).toEqual([]);
    expect(pageContainerConverter.render(slots)).toBe(
      '<xf:group class="sub_contents" id="" meta_componentContainer="true" style=""/>'
    );
  });
});
