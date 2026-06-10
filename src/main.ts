import type { FigmaNode, SnippetType } from "./core/types.js";
import { convert } from "./core/registry.js";
import { collectTextNodes, textOf } from "./core/extract.js";
import { prettyXml } from "./core/format.js";

/** figma SceneNode의 덕타입(테스트용). 실제로는 figma SceneNode가 들어온다. */
export interface SceneLike {
  id: string;
  type: string;
  name: string;
  characters?: string;
  width: number;
  height: number;
  layoutMode?: string;
  componentName?: string;
  children?: SceneLike[];
}

export function toFigmaNode(scene: SceneLike): FigmaNode {
  const node: FigmaNode = {
    id: scene.id,
    type: scene.type,
    name: scene.name,
    width: scene.width,
    height: scene.height,
    children: (scene.children ?? []).map(toFigmaNode),
  };
  if (scene.characters !== undefined) node.characters = scene.characters;
  if (scene.layoutMode !== undefined && scene.layoutMode !== "NONE") {
    node.layoutMode = scene.layoutMode;
  }
  if (scene.componentName !== undefined) node.componentName = scene.componentName;
  return node;
}

// --- 아래는 figma 런타임에서만 실행 (테스트는 toFigmaNode만 import) ---
declare const figma: any;
declare const __html__: string;

if (typeof figma !== "undefined") {
  figma.showUI(__html__, { width: 420, height: 560 });

  const selectedOne = (): SceneLike | null => {
    const sel = figma.currentPage.selection;
    if (sel.length !== 1) {
      figma.ui.postMessage({
        type: "result", xml: "",
        warnings: [{ message: "프레임 하나를 선택하세요 (현재 " + sel.length + "개 선택됨)" }],
      });
      return null;
    }
    return sel[0] as SceneLike;
  };

  // 선택이 바뀔 때마다 어떤 레이어가 읽혔고 어떤 텍스트가 추출되는지 UI에 보여준다.
  const postSelection = (): void => {
    const sel = figma.currentPage.selection;
    if (sel.length !== 1) {
      figma.ui.postMessage({ type: "selection", name: null, count: sel.length, texts: [] });
      return;
    }
    const node = toFigmaNode(sel[0] as SceneLike);
    const texts = collectTextNodes(node).map(textOf).filter((s) => s !== "");
    figma.ui.postMessage({ type: "selection", name: node.name, count: 1, texts });
  };
  figma.on("selectionchange", postSelection);
  postSelection();

  figma.ui.onmessage = (msg: { type: string; snippetType?: SnippetType; kind?: string; cols?: number }) => {
    if (msg.type === "convert" && msg.snippetType) {
      const scene = selectedOne();
      if (!scene) return;
      const overrides: Record<string, unknown> = {};
      if (msg.kind !== undefined) overrides.kind = msg.kind;
      if (msg.cols !== undefined) overrides.cols = msg.cols;
      const result = convert(toFigmaNode(scene), msg.snippetType, overrides);
      figma.ui.postMessage({ type: "result", xml: prettyXml(result.xml), warnings: result.warnings });
    }
    // 픽스처 수집: 현재 선택을 축약 노드 JSON으로 덤프 (테스트 픽스처 박제용)
    if (msg.type === "dump") {
      const scene = selectedOne();
      if (!scene) return;
      const json = JSON.stringify(toFigmaNode(scene), null, 2);
      figma.ui.postMessage({ type: "result", xml: json, warnings: [] });
    }
  };
}
