const $ = (id: string) => document.getElementById(id) as HTMLElement;

interface CatalogCategory {
  category: string;
  categoryLabel: string;
  variants: { id: string; label: string }[];
}

interface Region {
  id: string;
  name: string;
  snippetId: string;
  confidence: "high" | "medium" | "low";
  texts: string[];
}

let CATALOG: CatalogCategory[] = [];

function categoryOf(snippetId: string): CatalogCategory | undefined {
  return CATALOG.find((c) => c.variants.some((v) => v.id === snippetId));
}

function fillVariants(variantSel: HTMLSelectElement, cat: CatalogCategory, selectedId?: string): void {
  variantSel.innerHTML = "";
  for (const v of cat.variants) {
    const o = document.createElement("option");
    o.value = v.id;
    o.textContent = v.label;
    if (v.id === selectedId) o.selected = true;
    variantSel.appendChild(o);
  }
}

function post(message: Record<string, unknown>): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

$("analyze").onclick = () => post({ type: "analyze" });

$("generate").onclick = () => {
  const snippetById: Record<string, string> = {};
  $("regions").querySelectorAll<HTMLSelectElement>("select[data-variant]").forEach((sel) => {
    snippetById[sel.dataset.variant as string] = sel.value;
  });
  post({ type: "generate", snippetById });
};

// 소스는 보통 웹스퀘어에서 열어 보므로 기본 숨김 — '소스 보기'로 토글한다.
function setSourceVisible(visible: boolean): void {
  $("xml").style.display = visible ? "block" : "none";
  ($("toggleSource") as HTMLButtonElement).textContent = visible ? "소스 숨기기" : "소스 보기";
}
$("toggleSource").onclick = () => setSourceVisible($("xml").style.display === "none");

// JSON 추출: 선택 프레임을 JSON으로 덤프하고 결과를 바로 보여준다(원클릭).
$("dump").onclick = () => {
  post({ type: "dump" });
  setSourceVisible(true);
};

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

    const initCat = categoryOf(r.snippetId) ?? CATALOG[0];

    const catSel = document.createElement("select");
    catSel.dataset.cat = r.id;
    for (const c of CATALOG) {
      const o = document.createElement("option");
      o.value = c.category;
      o.textContent = c.categoryLabel;
      if (initCat && c.category === initCat.category) o.selected = true;
      catSel.appendChild(o);
    }

    const varSel = document.createElement("select");
    varSel.dataset.variant = r.id;
    if (initCat) fillVariants(varSel, initCat, r.snippetId);

    catSel.onchange = () => {
      const cat = CATALOG.find((c) => c.category === catSel.value);
      if (cat) fillVariants(varSel, cat);
    };

    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(catSel);
    row.appendChild(varSel);
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
    CATALOG = (msg.catalog ?? []) as CatalogCategory[];
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
