const $ = (id: string) => document.getElementById(id) as HTMLElement;

$("convert").onclick = () => {
  const snippetType = ($("type") as HTMLSelectElement).value;
  parent.postMessage({ pluginMessage: { type: "convert", snippetType } }, "*");
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
  if (!msg || msg.type !== "result") return;
  ($("xml") as HTMLTextAreaElement).value = msg.xml;
  const warnings: { message: string }[] = msg.warnings ?? [];
  $("warnings").textContent = warnings.map((w) => "⚠ " + w.message).join("\n");
};
