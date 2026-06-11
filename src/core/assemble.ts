import type { FigmaNode } from "./types.js";
import { el, serialize, escapeAttr, type XmlEl } from "./xml.js";
import { collectTextNodes, textOf } from "./extract.js";
import { denoise, isNoise } from "./denoise.js";
import { defaultSnippetFor, getSnippet, LEGACY_REGION_TYPE_TO_ID } from "./snippets/registry.js";
import { withMeta } from "./snippets/builders/meta.js";
import { buildFormTable } from "./converters/inputTable.js";
import type { RenderOpts } from "./snippets/types.js";

/** 작은 정사각형(체크 박스) — denoise 전 RAW에서 본다. */
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
      if (label) out.push(label);
    }
    n.children.forEach(walk);
  };
  walk(node);
  return out;
}

/** 들어온 키가 레거시 RegionType 이면 snippetId 로 변환. */
function normalizeId(key: string): string {
  return getSnippet(key) ? key : (LEGACY_REGION_TYPE_TO_ID[key] ?? key);
}

/** 한 영역을 snippetId 로 렌더 (레지스트리 빌더 + 메타). */
export function renderSnippet(snippetId: string, node: FigmaNode, opts: RenderOpts = {}): XmlEl {
  const def = getSnippet(normalizeId(snippetId));
  if (!def) return el("xf:group", { class: "", id: "" });
  return withMeta(def.build(node, opts), def.category, def.name);
}

/** 호환: 기존 renderRegion(type, node, opts) 시그니처를 renderSnippet 로 위임. */
export function renderRegion(type: string, node: FigmaNode, opts: RenderOpts = {}): XmlEl {
  return renderSnippet(type, node, opts);
}

/** 그리드 바인딩용 dataList1 컬럼 수(템플릿 동일). */
const DATALIST_COLS = 15;
/** dataList1 빈 데이터행 수. */
const DATALIST_ROWS = 5;
/** body ev:onpageload 핸들러를 안전하게 만드는 스크립트 스텁. */
const ONPAGELOAD_STUB = "scwin.onpageload = function(){};";

/** xf:model XML. 그리드가 있으면 dataCollection/dataList1 스캐폴드, 아니면 빈 instance. */
export function buildModelXml(hasGrid: boolean): string {
  if (!hasGrid) {
    return '<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>';
  }
  let cols = "";
  for (let i = 1; i <= DATALIST_COLS; i++) {
    cols += `<w2:column id="col${i}" name="name${i}" dataType="text"/>`;
  }
  const rows = "<w2:row/>".repeat(DATALIST_ROWS);
  return (
    "<xf:model>" +
    '<w2:dataCollection baseNode="map">' +
    '<w2:dataList baseNode="list" repeatNode="map" id="dataList1" saveRemovedData="true">' +
    `<w2:columnInfo>${cols}</w2:columnInfo>` +
    `<w2:data use="true">${rows}</w2:data>` +
    "</w2:dataList>" +
    "</w2:dataCollection>" +
    "</xf:model>"
  );
}

/** 문서 외피로 감싼다 (body 루트 = 전달된 inner XML). hasGrid면 모델에 dataList1 스캐폴드. */
function wrapDocument(screenName: string, bodyInner: string, hasGrid: boolean): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" ' +
    'xmlns:w2="http://www.inswave.com/websquare" xmlns:xf="http://www.w3.org/2002/xforms">' +
    `<head meta_vertical_guides="" meta_horizontal_guides="" meta_screenName="${escapeAttr(screenName)}">` +
    "<w2:type>COMPONENT</w2:type><w2:buildDate/><w2:MSA/>" +
    buildModelXml(hasGrid) +
    `<script type="text/javascript"><![CDATA[${ONPAGELOAD_STUB}]]></script>` +
    "</head>" +
    `<body ev:onpageload="scwin.onpageload" class="">${bodyInner}</body>` +
    "</html>"
  );
}

/** 영역의 라벨(첫 텍스트, 필수표시 '*'는 제외). 폼 테이블 행 헤더로 쓴다. */
function rowLabel(node: FigmaNode): string {
  const texts = collectTextNodes(node).map(textOf).filter((s) => s !== "" && s.trim() !== "*");
  return texts[0] ?? "";
}

/** 선택 루트를 영역별 snippetId 맵으로 조립해 완성 WebSquare 페이지 생성.
 *  idById 에 없는 영역은 휴리스틱 기본 snippetId 를 쓴다. 레거시 RegionType 문자열도 허용.
 *  연속된 입출력테이블 영역(2개 이상)은 하나의 테이블로 합치고 각 영역이 한 행이 된다. */
export function assemblePage(root: FigmaNode, idById: Record<string, string> = {}): string {
  // RAW 자식과 denoise된 자식을 1:1 정렬. RAW는 체크박스 박스 등 denoise가 지우는 신호 탐지용.
  const raws = root.children.filter((c) => !isNoise(c));
  const children = raws.map(denoise);
  const idOf = (i: number): string =>
    normalizeId(idById[children[i].id] ?? defaultSnippetFor(children[i]).id);
  const isTable = (i: number): boolean => getSnippet(idOf(i))?.category === "05_입출력테이블";

  const regionEls: XmlEl[] = [];
  for (let i = 0; i < children.length; ) {
    if (isTable(i)) {
      const start = i;
      while (i < children.length && isTable(i)) i++;
      const run = children.slice(start, i);
      if (run.length >= 2) {
        // 연속된 입출력테이블 → 한 테이블, 각 영역이 한 행(라벨 + 빈 입력칸)
        regionEls.push(withMeta(buildFormTable(run.map(rowLabel)), "05_입출력테이블", "5_01 테이블(1단)"));
      } else {
        regionEls.push(renderSnippet(idOf(start), run[0]));
      }
      continue;
    }
    // 타이틀: RAW에서 우측 체크박스를 살려 rt 그룹에 넣는다.
    const def = getSnippet(idOf(i));
    const opts: RenderOpts = def?.category === "02_타이틀" ? { checkboxes: findCheckboxLabels(raws[i]) } : {};
    regionEls.push(renderSnippet(idOf(i), children[i], opts));
    i++;
  }

  // 최상위 영역만 본다(영역=스니핏 1개 모델). split 등에 그리드가 중첩되는 구조는
  // assemblePage가 렌더하지 않으므로 현재 구조상 이 스캔으로 충분하다.
  const hasGrid = children.some((_, i) => getSnippet(idOf(i))?.category === "06_그리드");
  const sub = el("xf:group", { class: "sub_contents", id: "", meta_componentContainer: "true" }, regionEls);
  return wrapDocument(root.name, serialize(sub), hasGrid);
}
