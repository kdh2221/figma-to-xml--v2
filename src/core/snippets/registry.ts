import type { FigmaNode } from "../types.js";
import type { SnippetDef, CatalogCategory, RenderOpts } from "./types.js";
import { classifyRegion } from "../regions.js";
import { buildSplit } from "./builders/split.js";
import { buildTitle } from "./builders/title.js";
import { buildSearch } from "./builders/search.js";
import { buildTableForNode, buildListTableForNode, buildMultiTableForNode } from "./builders/table.js";
import { buildTab } from "./builders/tab.js";
import * as SF from "./builders/singleForm.js";
import * as MF from "./builders/multiForm.js";
import { buildButton, buildText } from "./builders/button.js";
import * as ST from "./builders/statics.js";
import type { XmlEl } from "../xml.js";

/** id → {category, name, label, build}. 카테고리 라벨은 def 마다 명시. */
function def(
  id: string, category: string, categoryLabel: string, name: string, label: string,
  build: (n: FigmaNode, o: RenderOpts) => XmlEl
): SnippetDef {
  return { id, category, categoryLabel, name, label, build };
}

export const SNIPPETS: SnippetDef[] = [
  // 01_화면분할
  def("split-2", "01_화면분할", "화면분할", "1_01 분할(2단)", "2단", () => buildSplit([5, 5])),
  def("split-3", "01_화면분할", "화면분할", "1_03 분할(3단)", "3단", () => buildSplit([3, 3, 3])),
  def("split-4", "01_화면분할", "화면분할", "1_04 분할(4단)", "4단", () => buildSplit([2, 2, 2, 2])),
  def("split-2-8", "01_화면분할", "화면분할", "1_05 분할(2-8)", "2-8", () => buildSplit([2, 8])),
  def("split-3-7", "01_화면분할", "화면분할", "1_06 분할(3-7)", "3-7", () => buildSplit([3, 7])),
  def("split-7-3", "01_화면분할", "화면분할", "1_09 분할(7-3)", "7-3", () => buildSplit([7, 3])),
  // 02_타이틀
  def("title-main", "02_타이틀", "타이틀", "2_02 타이틀그룹(제목)", "제목", (n, o) => buildTitle("main", n, o)),
  def("title-sub", "02_타이틀", "타이틀", "2_03 타이틀그룹(소제목)", "소제목", (n, o) => buildTitle("sub", n, o)),
  // 03_조회영역
  def("search-1x2", "03_조회영역", "조회영역", "3_01 조회(1행 2단)", "1행 2단", () => buildSearch(1, 2)),
  def("search-2x2", "03_조회영역", "조회영역", "3_03 조회(2행 2단)", "2행 2단", () => buildSearch(2, 2)),
  def("search-2x3", "03_조회영역", "조회영역", "3_04 조회(2행 3단)", "2행 3단", () => buildSearch(2, 3)),
  // 04_탭
  def("tab", "04_탭", "탭", "4_01 탭", "탭", (n) => buildTab(n)),
  // 05_입출력테이블
  def("table-1", "05_입출력테이블", "입출력테이블", "5_01 테이블(1단)", "1단", (n) => buildTableForNode(n, 1)),
  def("table-2", "05_입출력테이블", "입출력테이블", "5_02 테이블(2단)", "2단", (n) => buildTableForNode(n, 2)),
  def("table-3", "05_입출력테이블", "입출력테이블", "5_03 테이블(3단)", "3단", (n) => buildTableForNode(n, 3)),
  def("table-4", "05_입출력테이블", "입출력테이블", "5_04 테이블(4단)", "4단", (n) => buildTableForNode(n, 4)),
  def("table-5", "05_입출력테이블", "입출력테이블", "5_05 테이블(5단)", "5단", (n) => buildTableForNode(n, 5)),
  def("table-list", "05_입출력테이블", "입출력테이블", "5_06 테이블(목록형)", "목록형", (n) => buildListTableForNode(n)),
  def("table-multi", "05_입출력테이블", "입출력테이블", "5_07 테이블(멀티형)", "멀티형", (n) => buildMultiTableForNode(n)),
  // 06_그리드
  def("grid", "06_그리드", "그리드", "6_01 그리드", "그리드", (n) => ST.buildGridForNode(n)),
  // 07_트리
  def("tree", "07_트리", "트리", "7_01 트리", "트리", () => ST.buildTree()),
  // 08_기본버튼
  def("button", "08_기본버튼", "버튼", "8_02 기본버튼", "기본버튼", (n) => buildButton(n)),
  // 10_아코디언
  def("accordion", "10_아코디언", "아코디언", "10_01 아코디언", "아코디언", () => ST.buildAccordion()),
  // 11_단일입력폼
  def("input", "11_단일입력폼", "단일입력폼", "11_05 인풋", "인풋", () => SF.buildInput()),
  def("input-100", "11_단일입력폼", "단일입력폼", "11_06 인풋(100)", "인풋(100)", () => SF.buildInput("100%")),
  def("select", "11_단일입력폼", "단일입력폼", "11_07 셀렉트", "셀렉트", () => SF.buildSelect()),
  def("select-100", "11_단일입력폼", "단일입력폼", "11_08 셀렉트(100)", "셀렉트(100)", () => SF.buildSelect("100%")),
  def("radio", "11_단일입력폼", "단일입력폼", "11_02 라디오", "라디오", () => SF.buildRadio()),
  def("checkbox", "11_단일입력폼", "단일입력폼", "11_03 체크박스", "체크박스", () => SF.buildCheckboxGroup()),
  def("checkbox-single", "11_단일입력폼", "단일입력폼", "11_04 체크박스(단일)", "체크박스(단일)", () => SF.buildCheckboxSingle()),
  def("calendar-ymd", "11_단일입력폼", "단일입력폼", "11_09 인풋캘린더(년월일)", "캘린더(년월일)", () => SF.buildCalendar("yearMonthDate")),
  def("calendar-100", "11_단일입력폼", "단일입력폼", "11_10 인풋캘린더(100)", "캘린더(100)", () => SF.buildCalendar("yearMonthDate", "100%")),
  def("calendar-ym", "11_단일입력폼", "단일입력폼", "11_11 인풋캘린더(년월)", "캘린더(년월)", () => SF.buildCalendar("yearMonth")),
  def("calendar-year", "11_단일입력폼", "단일입력폼", "11_12 인풋캘린더(년)", "캘린더(년)", () => SF.buildCalendar("year")),
  def("textarea", "11_단일입력폼", "단일입력폼", "11_13 텍스트에어리어", "텍스트에어리어", () => SF.buildTextarea()),
  def("textarea-100", "11_단일입력폼", "단일입력폼", "11_14 텍스트에어리어(100)", "텍스트에어리어(100)", () => SF.buildTextarea("100%")),
  def("autocomplete", "11_단일입력폼", "단일입력폼", "11_15 오토컴플릿", "오토컴플릿", () => SF.buildAutoComplete()),
  def("autocomplete-100", "11_단일입력폼", "단일입력폼", "11_16 오토컴플릿(100)", "오토컴플릿(100)", () => SF.buildAutoComplete("100%")),
  def("checkcombo", "11_단일입력폼", "단일입력폼", "11_17 체크콤보박스", "체크콤보박스", () => SF.buildCheckCombo()),
  def("checkcombo-100", "11_단일입력폼", "단일입력폼", "11_18 체크콤보박스(100)", "체크콤보박스(100)", () => SF.buildCheckCombo("100%")),
  def("upload", "11_단일입력폼", "단일입력폼", "11_19 업로드", "업로드", () => SF.buildUpload()),
  def("upload-100", "11_단일입력폼", "단일입력폼", "11_20 업로드(100)", "업로드(100)", () => SF.buildUpload("100%")),
  def("form-text", "11_단일입력폼", "단일입력폼", "11_01 텍스트", "텍스트", () => SF.buildFormText()),
  // 12_다중입력폼
  def("code", "12_다중입력폼", "다중입력폼", "12_01 코드조회", "코드조회", () => SF.buildInput("150px")),
  def("code-detail", "12_다중입력폼", "다중입력폼", "12_02 코드상세조회", "코드상세조회", () => MF.buildCodeSearch()),
  def("addr", "12_다중입력폼", "다중입력폼", "12_06 주소", "주소", () => MF.buildAddress()),
  def("email", "12_다중입력폼", "다중입력폼", "12_04 이메일", "이메일", () => MF.buildEmail()),
  def("phone", "12_다중입력폼", "다중입력폼", "12_03 전화번호", "전화번호", () => MF.buildPhone()),
  def("period", "12_다중입력폼", "다중입력폼", "12_05 기간조회", "기간조회", () => MF.buildPeriod()),
  def("amount", "12_다중입력폼", "다중입력폼", "12_07 금액", "금액", () => MF.buildAmount()),
  // 13_메시지
  def("msg-list", "13_메시지", "메시지", "13_08 리스트", "리스트", () => ST.buildMessageList()),
  // 99_기타
  def("chart-bar", "99_기타", "기타", "99_02 차트(막대형)", "차트(막대형)", () => ST.buildChartBar()),
  def("chart-pie", "99_기타", "기타", "99_03 차트(원형)", "차트(원형)", () => ST.buildChartPie()),
  def("schedule", "99_기타", "기타", "99_01 스케줄캘린더", "스케줄캘린더", () => ST.buildSchedule()),
  // 텍스트 (구조 영역)
  def("text", "02_타이틀", "타이틀", "2_08 타이틀(제목)", "단일 텍스트", (n) => buildText(n)),
];

const BY_ID = new Map(SNIPPETS.map((s) => [s.id, s]));

export function getSnippet(id: string): SnippetDef | undefined {
  return BY_ID.get(id);
}

export function snippetsByCategory(): CatalogCategory[] {
  const out: CatalogCategory[] = [];
  for (const s of SNIPPETS) {
    let cat = out.find((c) => c.category === s.category);
    if (!cat) { cat = { category: s.category, categoryLabel: s.categoryLabel, variants: [] }; out.push(cat); }
    cat.variants.push({ id: s.id, label: s.label });
  }
  return out;
}

/** UI postMessage 용 (snippetsByCategory 와 동일 구조, build 없음). */
export function catalogDescriptor(): CatalogCategory[] {
  return snippetsByCategory();
}

/** 기존 RegionType 문자열 → 기본 snippetId (하위호환). */
export const LEGACY_REGION_TYPE_TO_ID: Record<string, string> = {
  title: "title-main", inputTable: "table-1", grid: "grid", button: "button",
  input: "input", select: "select", text: "text", tab: "tab", group: "split-2",
};

/** 노드 1차 추측 → 기본 snippetId + confidence. 기존 classifyRegion 휴리스틱 재사용. */
export function defaultSnippetFor(node: FigmaNode): { id: string; confidence: "high" | "medium" | "low" } {
  const { type, confidence } = classifyRegion(node);
  return { id: LEGACY_REGION_TYPE_TO_ID[type] ?? "split-2", confidence };
}
