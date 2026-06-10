import { describe, it, expect } from "vitest";
import { toFigmaNode, type SceneLike } from "../../src/main.js";

const sceneText: SceneLike = {
  id: "1", type: "TEXT", name: "label", characters: "이름", width: 40, height: 16,
};
const sceneFrame: SceneLike = {
  id: "2", type: "FRAME", name: "row", width: 200, height: 32, layoutMode: "HORIZONTAL",
  children: [sceneText],
};

describe("toFigmaNode", () => {
  it("maps a TEXT scene node to FigmaNode with characters", () => {
    expect(toFigmaNode(sceneText)).toEqual({
      id: "1", type: "TEXT", name: "label", characters: "이름",
      width: 40, height: 16, children: [],
    });
  });

  it("recursively maps children and layoutMode", () => {
    const out = toFigmaNode(sceneFrame);
    expect(out.layoutMode).toBe("HORIZONTAL");
    expect(out.children).toHaveLength(1);
    expect(out.children[0].characters).toBe("이름");
  });

  it("captures parent-relative x/y when present", () => {
    const positioned: SceneLike = {
      id: "3", type: "FRAME", name: "box", x: 12, y: 6, width: 100, height: 40,
    };
    const out = toFigmaNode(positioned);
    expect(out.x).toBe(12);
    expect(out.y).toBe(6);
  });
});
