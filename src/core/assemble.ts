import type { FigmaNode } from "./types.js";
import { el, serialize, escapeAttr, cdata, type XmlEl } from "./xml.js";
import { collectTextNodes, textOf } from "./extract.js";
import { denoise, isNoise } from "./denoise.js";
import { classifyRegion, type RegionType } from "./regions.js";
import { buildInputTable, buildFormTable, inputTableConverter } from "./converters/inputTable.js";
import { buildFormFromNode, hasFormControls } from "./converters/formTable.js";
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

/** 체크/라디오 박스: 텍스트 없는 작은 정사각형 프레임(체크 표시 박스). denoise가 지우기 전에 본다. */
function isControlBox(n: FigmaNode): boolean {
  if (collectTextNodes(n).length > 0) return false;
  const square = Math.abs(n.width - n.height) <= 6;
  return square && n.width >= 10 && n.width <= 28;
}

/** RAW 노드에서 체크박스(작은 박스 + 라벨) 라벨을 찾는다 (denoise 전 호출). */
export function findCheckboxLabels(node: FigmaNode): string[] {
  const out: string[] = [];
  const walk = (n: FigmaNode) => {
    if (n.children.some(isControlBox)) {
      const label = n.children.filter((c) => c.type === "TEXT").map(textOf).find((t) => t !== "");
      if (label !== undefined && label !== "") out.push(label);
    }
    n.children.forEach(walk);
  };
  walk(node);
  return out;
}

/** 단일 체크박스 (11_03 체크박스 스니펫). 라벨 1개를 가진 checkboxgroup. */
function buildCheckbox(label: string): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "",
    meta_snippetCategory: "11_단일입력폼", meta_snippetKeyComponent: "true",
    meta_snippetName: "11_03 체크박스", ref: "", renderType: "checkboxgroup", rows: "",
    selectedindex: "", style: "",
  }, [
    el("xf:choices", {}, [
      el("xf:item", {}, [
        el("xf:label", {}, [cdata(label)]),
        el("xf:value", {}, [cdata("")]),
      ]),
    ]),
  ]);
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

/** renderRegion 부가 정보 (타입별로 필요한 보조 데이터) */
export interface RenderOpts {
  /** 타이틀 우측(rt)에 넣을 체크박스 라벨들 (denoise 전 RAW에서 추출) */
  checkboxes?: string[];
}

/** 한 영역을 확정된 스니펫 타입으로 깔끔하게 렌더 (기존 변환기 재사용) */
export function renderRegion(type: RegionType, node: FigmaNode, opts: RenderOpts = {}): XmlEl {
  switch (type) {
    case "title":
      return withMeta(
        el("xf:group", { class: "titbox", id: "" }, [
          el("xf:group", { class: "lt", id: "" }, [
            el("w2:textbox", { class: "tit_main", id: "", label: firstText(node), tagname: "" }),
          ]),
          el("xf:group", { class: "rt", id: "" }, (opts.checkboxes ?? []).map(buildCheckbox)),
        ]),
        "02_타이틀", "2_02 타이틀그룹(제목)"
      );
    case "inputTable":
      // 폼 안에 플레이스홀더/버튼 신호가 있으면 라벨·인풋·버튼을 구분한 스마트 폼 테이블,
      // 아니면 기존 라벨 전용 테이블.
      return withMeta(
        hasFormControls(node) ? buildFormFromNode(node) : buildInputTable(inputTableConverter.extract(node).slots),
        "05_입출력테이블", "5_01 테이블(1단)"
      );
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

/** 영역의 라벨(첫 텍스트, 필수표시 '*'는 제외). 폼 테이블 행 헤더로 쓴다. */
function rowLabel(node: FigmaNode): string {
  const texts = collectTextNodes(node).map(textOf).filter((s) => s !== "" && s.trim() !== "*");
  return texts[0] ?? "";
}

/** 선택 루트를 영역별 타입 맵으로 조립해 완성 WebSquare 페이지 생성.
 *  typeById에 없는 영역은 휴리스틱 추측 타입을 사용한다.
 *  연속된 입출력테이블 영역(2개 이상)은 하나의 테이블로 합치고 각 영역이 한 행이 된다. */
export function assemblePage(root: FigmaNode, typeById: Record<string, RegionType> = {}): string {
  // RAW 자식과 denoise된 자식을 1:1 정렬해 둔다. RAW는 체크박스 박스 등 denoise가 지우는 신호 탐지용.
  const raws = root.children.filter((c) => !isNoise(c));
  const children = raws.map(denoise);
  const typeOf = (i: number): RegionType => typeById[children[i].id] ?? classifyRegion(children[i]).type;

  const regionEls: XmlEl[] = [];
  for (let i = 0; i < children.length; ) {
    const type = typeOf(i);
    if (type === "inputTable") {
      const start = i;
      while (i < children.length && typeOf(i) === "inputTable") i++;
      const run = children.slice(start, i);
      if (run.length >= 2) {
        // 연속된 입출력테이블 → 한 테이블, 각 영역이 한 행(라벨 + 빈 입력칸)
        regionEls.push(withMeta(buildFormTable(run.map(rowLabel)), "05_입출력테이블", "5_01 테이블(1단)"));
      } else {
        regionEls.push(renderRegion("inputTable", run[0]));
      }
      continue;
    }
    // 타이틀: RAW에서 우측 체크박스를 살려 rt 그룹에 넣는다.
    const opts = type === "title" ? { checkboxes: findCheckboxLabels(raws[i]) } : {};
    regionEls.push(renderRegion(type, children[i], opts));
    i++;
  }

  const sub = el(
    "xf:group",
    { class: "sub_contents", id: "", meta_componentContainer: "true" },
    regionEls
  );
  return wrapDocument(root.name, serialize(sub));
}
