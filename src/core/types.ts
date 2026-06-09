/** Main 스레드가 figma 노드에서 추출한 축약 JSON. 엔진은 이것만 받는다. */
export interface FigmaNode {
  id: string;
  /** figma node.type: 'FRAME' | 'TEXT' | 'RECTANGLE' | 'INSTANCE' | 'GROUP' ... */
  type: string;
  name: string;
  /** TEXT 노드의 텍스트 내용 */
  characters?: string;
  width: number;
  height: number;
  /** auto-layout 방향: 'HORIZONTAL' | 'VERTICAL' | 'NONE' */
  layoutMode?: string;
  /** INSTANCE의 메인 컴포넌트 이름 (옵션 B 확장에서 사용) */
  componentName?: string;
  children: FigmaNode[];
}

export type SnippetType =
  | "pageContainer"
  | "title"
  | "inputTable"
  | "grid"
  | "singleInput"
  | "button";

export interface Warning {
  /** 사람이 읽는 경고 메시지 (한국어) */
  message: string;
}

export interface ConvertResult {
  xml: string;
  warnings: Warning[];
}

/** 각 변환기가 반환하는 추출 결과. 변환기마다 형태가 다르므로 unknown 슬롯. */
export type SlotValues = Record<string, unknown>;

export interface Converter<S extends SlotValues = SlotValues> {
  type: SnippetType;
  extract(node: FigmaNode): { slots: S; warnings: Warning[] };
  render(slots: S): string;
}
