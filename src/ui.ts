const $ = (id: string) => document.getElementById(id) as HTMLElement;

$("convert").onclick = () => {
  const snippetType = ($("type") as HTMLSelectElement).value;
  const kind = ($("kind") as HTMLSelectElement).value;
  const cols = Number(($("cols") as HTMLSelectElement).value);
  parent.postMessage({ pluginMessage: { type: "convert", snippetType, kind, cols } }, "*");
};

$("copy").onclick = () => {
  const xml = ($("xml") as HTMLTextAreaElement).value;
  (navigator as any).clipboard?.writeText(xml);
};

$("dump").onclick = () => {
  parent.postMessage({ pluginMessage: { type: "dump" } }, "*");
};

onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  // 현재 선택된 레이어와 추출된 텍스트를 보여준다 (레이어 반영 여부가 눈에 보이게)
  if (msg.type === "selection") {
    const el = $("selection");
    if (msg.count !== 1) {
      el.textContent =
        msg.count === 0
          ? "선택 없음 — 레이어를 하나 선택하세요"
          : `${msg.count}개 선택됨 — 하나만 선택하세요`;
      el.style.color = "#b30000";
      return;
    }
    const texts: string[] = msg.texts ?? [];
    const tinfo = texts.length ? `텍스트(${texts.length}): ${texts.join(", ")}` : "텍스트 없음";
    el.textContent = `선택: ${msg.name} · ${tinfo}`;
    el.style.color = texts.length ? "#0a7" : "#b30000";
    return;
  }

  if (msg.type !== "result") return;
  ($("xml") as HTMLTextAreaElement).value = msg.xml;
  const warnings: { message: string }[] = msg.warnings ?? [];
  $("warnings").textContent = warnings.map((w) => "⚠ " + w.message).join("\n");
};
