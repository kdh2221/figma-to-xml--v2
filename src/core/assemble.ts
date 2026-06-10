import type { FigmaNode } from "./types.js";
import { el, serialize, escapeAttr, type XmlEl } from "./xml.js";
import { collectTextNodes, textOf } from "./extract.js";
import { denoise } from "./denoise.js";
import { classifyRegion, type RegionType } from "./regions.js";
import { buildInputTable, inputTableConverter } from "./converters/inputTable.js";
import { buildGrid, gridConverter } from "./converters/grid.js";

/** 영역의 첫 텍스트 (없으면 빈 문자열) */
function firstText(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : "";
}

/** 스니펫 루트에 식별 메타 부착 */
function withMeta(root: XmlEl, category: string, name: string): XmlEl {
  root.attrs.meta_snippetCategory = category;
  root.attrs.meta_snippetName = name;
  root.attrs.meta_snippetKeyComponent = "true";
  return root;
}

/** 탭컨트롤: 텍스트들 = 탭 라벨 */
function buildTab(node: FigmaNode): XmlEl {
  const found = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  const labels = found.length > 0 ? found : ["TAB1"];
  const tabs = labels.map((label, i) =>
    el("w2:tabs", { disabled: "false", style: "", id: `tabs${i + 1}`, label })
  );
  const contents = labels.map((_, i) =>
    el("w2:content", { alwaysDraw: "false", style: "", id: `content${i + 1}` })
  );
  return withMeta(
    el("xf:group", { id: "", class: "tbcbox" }, [
      el("w2:tabControl", { alwaysDraw: "false", style: "", id: "", class: "tbc" }, [...tabs, ...contents]),
    ]),
    "04_탭", "4_01 탭"
  );
}

/** 한 영역을 확정된 스니펫 타입으로 깔끔하게 렌더 (기존 변환기 재사용) */
export function renderRegion(type: RegionType, node: FigmaNode): XmlEl {
  switch (type) {
    case "title":
      return withMeta(
        el("xf:group", { class: "titbox", id: "" }, [
          el("xf:group", { class: "lt", id: "" }, [
            el("w2:textbox", { class: "tit_main", id: "", label: firstText(node), tagname: "" }),
          ]),
          el("xf:group", { class: "rt", id: "" }),
        ]),
        "02_타이틀", "2_02 타이틀그룹(제목)"
      );
    case "inputTable":
      return withMeta(buildInputTable(inputTableConverter.extract(node).slots), "05_입출력테이블", "5_01 테이블(1단)");
    case "grid":
      return withMeta(buildGrid(gridConverter.extract(node).slots), "06_그리드", "6_01 그리드");
    case "button":
      return el("w2:button", { class: "btn_cm", id: "" }, [
        el("w2:textbox", { id: "", label: firstText(node), tagname: "span" }),
      ]);
    case "input":
      return el("xf:input", { class: "", id: "" });
    case "select":
      return el("xf:select1", { appearance: "minimal", allOption: "true", chooseOption: "", class: "", id: "" });
    case "text":
      return el("w2:textbox", { id: "", label: firstText(node), tagname: "span" });
    case "tab":
      return buildTab(node);
    case "group":
    default:
      return el("xf:group", { class: "", id: "" }, node.children.map((c) => renderRegion(classifyRegion(c).type, c)));
  }
}

/** 문서 외피로 감싼다 (body 루트 = 전달된 inner XML) */
function wrapDocument(screenName: string, bodyInner: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" ' +
    'xmlns:w2="http://www.inswave.com/websquare" xmlns:xf="http://www.w3.org/2002/xforms">' +
    `<head meta_screenName="${escapeAttr(screenName)}">` +
    "<w2:type>COMPONENT</w2:type><w2:buildDate/>" +
    '<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>' +
    '<script type="text/javascript"><![CDATA[]]></script>' +
    "</head>" +
    `<body>${bodyInner}</body>` +
    "</html>"
  );
}

/** 선택 루트를 영역별 타입 맵으로 조립해 완성 WebSquare 페이지 생성.
 *  typeById에 없는 영역은 휴리스틱 추측 타입을 사용한다. */
export function assemblePage(root: FigmaNode, typeById: Record<string, RegionType> = {}): string {
  const clean = denoise(root);
  const regionEls = clean.children.map((child) => {
    const type = typeById[child.id] ?? classifyRegion(child).type;
    return renderRegion(type, child);
  });
  const sub = el(
    "xf:group",
    { class: "sub_contents", id: "", meta_componentContainer: "true" },
    regionEls
  );
  return wrapDocument(root.name, serialize(sub));
}
