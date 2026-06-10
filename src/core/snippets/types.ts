import type { FigmaNode } from "../types.js";
import type { XmlEl } from "../xml.js";

/** 렌더 시 빌더에 전달되는 부가 정보. */
export interface RenderOpts {
  /** 타이틀 우측(rt)에 넣을 체크박스 라벨들 (denoise 전 RAW에서 추출) */
  checkboxes?: string[];
}

/** 사용자가 선택 가능한 스니핏 한 종류. 레지스트리의 단위. */
export interface SnippetDef {
  /** 안정 키. typeById/snippetById 의 값으로 쓰인다. 예: "table-2" */
  id: string;
  /** meta_snippetCategory. 예: "05_입출력테이블" */
  category: string;
  /** UI 카테고리 표시명. 예: "입출력테이블" */
  categoryLabel: string;
  /** meta_snippetName. 예: "5_02 테이블(2단)" */
  name: string;
  /** UI 변형 표시명. 예: "2단" */
  label: string;
  /** 영역 노드를 받아 스니핏 XmlEl 을 만든다. */
  build(node: FigmaNode, opts: RenderOpts): XmlEl;
}

/** UI로 보내는 경량 카탈로그 descriptor (build 제외, postMessage 직렬화 가능). */
export interface CatalogCategory {
  category: string;
  categoryLabel: string;
  variants: { id: string; label: string }[];
}
