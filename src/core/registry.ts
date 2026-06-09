import type { Converter, ConvertResult, FigmaNode, SnippetType } from "./types.js";
import { titleConverter } from "./converters/title.js";

const registry = new Map<SnippetType, Converter>();

export function registerConverter(converter: Converter): void {
  registry.set(converter.type, converter);
}

export function convert(node: FigmaNode, type: SnippetType): ConvertResult {
  const converter = registry.get(type);
  if (!converter) {
    return { xml: "", warnings: [{ message: `지원하지 않는 스니펫 타입입니다: ${type}` }] };
  }
  const { slots, warnings } = converter.extract(node);
  const xml = converter.render(slots);
  return { xml, warnings };
}

export function registeredTypes(): SnippetType[] {
  return [...registry.keys()];
}

registerConverter(titleConverter);
