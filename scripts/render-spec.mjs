import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function renderLines(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    if (lines[i].startsWith("|")) {
      const cells = (line) =>
        line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((cell) => escape(cell.trim()));
      const headers = cells(lines[i++]);
      if (i < lines.length && /^\|[\s:|\-]+\|$/.test(lines[i])) i++;
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(
          `<tr>${cells(lines[i++])
            .map((cell) => `<td>${cell}</td>`)
            .join("")}</tr>`,
        );
      }
      blocks.push(
        `<div class="table-scroll"><table><thead><tr>${headers.map((cell) => `<th scope="col">${cell}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`,
      );
    } else if (lines[i].startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- "))
        items.push(`<li>${escape(lines[i++].slice(2))}</li>`);
      blocks.push(`<ul>${items.join("")}</ul>`);
    } else blocks.push(`<p>${escape(lines[i++])}</p>`);
  }
  return blocks.join("");
}

export function renderSpecification(markdown) {
  let title = "動作仕様",
    lead = [],
    sections = [],
    section = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("# ")) title = line.slice(2);
    else if (line.startsWith("## ")) {
      section = { title: line.slice(3), lines: [] };
      sections.push(section);
    } else if (line.trim()) (section ? section.lines : lead).push(line);
  }
  const cards = sections
    .map(
      (s) =>
        `<article class="card" data-search="${escape((s.title + " " + s.lines.join(" ")).toLowerCase())}"><h2>${escape(s.title)}</h2>${renderLines(s.lines)}</article>`,
    )
    .join("\n");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>:root{font-family:system-ui,"Yu Gothic",sans-serif;line-height:1.8;color:#18333f;background:#f4f7fa}*{box-sizing:border-box}body{margin:0}main{max-width:1100px;margin:auto;padding:32px 22px 60px}h1{font-size:30px}h2{font-size:20px;margin:0 0 12px}.card{background:white;border:1px solid #d7e4ec;border-radius:12px;padding:22px;margin:18px 0;break-inside:avoid}.table-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px}th,td{text-align:left;vertical-align:top;padding:12px;border:1px solid #d7e4ec;overflow-wrap:anywhere}th{background:#edf4f8}th:nth-child(1){width:30%}th:nth-child(2){width:30%}th:nth-child(3){width:40%}tbody tr:nth-child(even){background:#fafcfd}ul{padding-left:22px;font-size:14px}li{margin:7px 0;overflow-wrap:anywhere}input{width:100%;font:inherit;border:1px solid #b8cbd7;border-radius:8px;padding:12px}label{font-size:13px}p{font-size:14px;color:#49616e}[hidden]{display:none}@media(max-width:600px){main{padding:20px 12px}.card{padding:16px}table{min-width:650px}th,td{padding:9px}}@media print{.search{display:none}body{background:white}main{padding:0}}</style></head><body><main><h1>${escape(title)}</h1>${lead.map((p) => `<p>${escape(p)}</p>`).join("")}<div class="search"><label for="search">動作・境界値・対応テストを検索</label><input id="search" type="search"><p id="count" aria-live="polite"></p></div>${cards}</main><script>const input=document.querySelector('#search');const cards=[...document.querySelectorAll('.card')];function filter(){const q=input.value.trim().toLowerCase();let n=0;for(const c of cards){c.hidden=!c.dataset.search.includes(q);if(!c.hidden)n++}document.querySelector('#count').textContent=n+' / '+cards.length+' 項目';}input.addEventListener('input',filter);filter();</script></body></html>`;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const html = renderSpecification(
    fs.readFileSync("docs/behavior-spec.md", "utf8"),
  );
  fs.writeFileSync("docs/behavior-spec.html", html);
  // Keep the already-open plan URL useful after implementation.
  fs.writeFileSync("docs/test-plan.html", html);
  console.log("動作仕様HTMLを更新しました。");
}
