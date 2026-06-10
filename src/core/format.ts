/** 컴팩트(한 줄) XML 문자열을 깊이별 들여쓰기로 재포맷한다.
 *  엔진 출력은 요소 사이에 텍스트 콘텐츠가 없으므로(전부 속성), 태그 단위로 안전하게 들여쓸 수 있다.
 *  속성값의 < > 는 이미 이스케이프되어 있어 태그 경계 토큰화가 깨지지 않는다. */
export function prettyXml(xml: string, indent = "  "): string {
  if (!xml) return xml;
  // 태그와 태그 사이 텍스트를 모두 토큰화한다(텍스트 콘텐츠 보존).
  const tokens = xml.match(/<[^>]+>|[^<]+/g);
  if (!tokens) return xml;

  const lines: string[] = [];
  let depth = 0;
  let inlineText = false; // 직전에 연 요소가 같은 줄에 텍스트를 가지고 있는가
  for (const tok of tokens) {
    if (tok[0] === "<") {
      const isClosing = tok.startsWith("</");
      const isSelfClosing = tok.endsWith("/>");
      const isDeclaration = tok.startsWith("<?") || tok.startsWith("<!");

      if (isClosing) {
        depth = Math.max(0, depth - 1);
        if (inlineText && lines.length > 0) {
          lines[lines.length - 1] += tok; // 텍스트 뒤 닫는 태그는 같은 줄에
        } else {
          lines.push(indent.repeat(depth) + tok);
        }
        inlineText = false;
      } else {
        lines.push(indent.repeat(depth) + tok);
        if (!isSelfClosing && !isDeclaration) depth++;
        inlineText = false;
      }
    } else {
      const text = tok.trim();
      if (text === "") continue;
      if (lines.length === 0) lines.push(text);
      else lines[lines.length - 1] += text; // 방금 연 태그 줄에 텍스트를 붙인다
      inlineText = true;
    }
  }
  return lines.join("\n");
}
