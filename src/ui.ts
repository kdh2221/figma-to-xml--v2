const $ = (id: string) => document.getElementById(id) as HTMLElement;

interface Region {
  id: string;
  name: string;
  type: string;
  confidence: "high" | "medium" | "low";
  texts: string[];
}

const REGION_TYPES: { value: string; label: string }[] = [
  { value: "title", label: "타이틀" },
  { value: "inputTable", label: "입출력테이블" },
  { value: "grid", label: "그리드" },
  { value: "button", label: "버튼" },
  { value: "input", label: "인풋" },
  { value: "select", label: "셀렉트" },
  { value: "text", label: "텍스트" },
  { value: "tab", label: "탭" },
  { value: "group", label: "그룹" },
];

function post(message: Record<string, unknown>): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

$("analyze").onclick = () => post({ type: "analyze" });

$("generate").onclick = () => {
  const typeById: Record<string, string> = {};
  $("regions").querySelectorAll<HTMLSelectElement>("select[data-region]").forEach((sel) => {
    typeById[sel.dataset.region as string] = sel.value;
  });
  post({ type: "generate", typeById });
};

$("convert").onclick = () =>
  post({
    type: "convert",
    snippetType: ($("type") as HTMLSelectElement).value,
    kind: ($("kind") as HTMLSelectElement).value,
    cols: Number(($("cols") as HTMLSelectElement).value),
  });

$("dump").onclick = () => post({ type: "dump" });

$("copy").onclick = () => {
  (navigator as any).clipboard?.writeText(($("xml") as HTMLTextAreaElement).value);
};

$("save").onclick = () => {
  const xml = ($("xml") as HTMLTextAreaElement).value;
  if (!xml.trim()) return;
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "websquare-page.xml";
  a.click();
  URL.revokeObjectURL(url);
};

function renderRegions(regions: Region[]): void {
  const host = $("regions");
  host.innerHTML = "";
  if (regions.length === 0) {
    host.innerHTML = '<div class="region" style="color:#888;">분석된 영역이 없습니다.</div>';
    return;
  }
  for (const r of regions) {
    const row = document.createElement("div");
    row.className = "region";

    const info = document.createElement("div");
    info.className = "info";
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = r.name;
    const tx = document.createElement("div");
    tx.className = "tx";
    tx.textContent = r.texts.join(", ");
    info.appendChild(nm);
    info.appendChild(tx);

    const badge = document.createElement("span");
    badge.className = "badge " + r.confidence;
    badge.textContent = r.confidence === "high" ? "확실" : r.confidence === "medium" ? "추측" : "불명";

    const sel = document.createElement("select");
    sel.dataset.region = r.id;
    for (const opt of REGION_TYPES) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === r.type) o.selected = true;
      sel.appendChild(o);
    }

    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(sel);
    host.appendChild(row);
  }
}

onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "selection") {
    const el = $("selection");
    if (msg.count !== 1) {
      el.textContent = msg.count === 0 ? "선택 없음 — 레이어를 하나 선택하세요" : `${msg.count}개 선택됨 — 하나만 선택하세요`;
      el.style.color = "#b30000";
      return;
    }
    const texts: string[] = msg.texts ?? [];
    el.textContent = `선택: ${msg.name} · ${texts.length ? "텍스트(" + texts.length + "): " + texts.join(", ") : "텍스트 없음"}`;
    el.style.color = texts.length ? "#0a7" : "#b30000";
    return;
  }

  if (msg.type === "regions") {
    renderRegions(msg.regions as Region[]);
    return;
  }

  if (msg.type === "result") {
    ($("xml") as HTMLTextAreaElement).value = msg.xml;
    const warnings: { message: string }[] = msg.warnings ?? [];
    $("warnings").textContent = warnings.map((w) => "⚠ " + w.message).join("\n");
    return;
  }
};
