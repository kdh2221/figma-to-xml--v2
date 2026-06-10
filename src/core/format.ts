/** 컴팩트(한 줄) XML 문자열을 깊이별 들여쓰기로 재포맷한다.
 *  엔진 출력은 요소 사이에 텍스트 콘텐츠가 없으므로(전부 속성), 태그 단위로 안전하게 들여쓸 수 있다.
 *  속성값의 < > 는 이미 이스케이프되어 있어 태그 경계 토큰화가 깨지지 않는다. */
export function prettyXml(xml: string, indent = "  "): string {
  const tags = xml.match(/<[^>]+>/g);
  if (!tags) return xml;

  const lines: string[] = [];
  let depth = 0;
  for (const tag of tags) {
    const isClosing = tag.startsWith("</");
    const isSelfClosing = tag.endsWith("/>");
    const isDeclaration = tag.startsWith("<?") || tag.startsWith("<!");

    if (isClosing) depth = Math.max(0, depth - 1);
    lines.push(indent.repeat(depth) + tag);
    if (!isClosing && !isSelfClosing && !isDeclaration) depth++;
  }
  return lines.join("\n");
}
