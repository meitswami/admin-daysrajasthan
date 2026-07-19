/** Open a print-ready HTML table (browser “Save as PDF”). */
export function printReportPdf(
  title: string,
  headers: string[],
  rows: string[][],
  subtitle?: string
) {
  const escape = (v: string) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const thead = headers.map((h) => `<th>${escape(h)}</th>`).join("");
  const tbody =
    rows.length === 0
      ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:24px;color:#78716c">No records</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`
          )
          .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escape(title)}</title>
  <style>
    @page { margin: 16mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #1c1917; margin: 0; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #92400e; }
    p.sub { margin: 0 0 16px; color: #78716c; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #e7e5e4; color: #78716c; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
    td { padding: 8px 10px; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
    tr:nth-child(even) td { background: #fafaf9; }
    .meta { margin-top: 16px; font-size: 11px; color: #a8a29e; }
  </style>
</head>
<body>
  <h1>${escape(title)}</h1>
  ${subtitle ? `<p class="sub">${escape(subtitle)}</p>` : ""}
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <p class="meta">Generated ${new Date().toLocaleString("en-IN")} · ${rows.length} row(s)</p>
  <script>window.onload = function () { window.focus(); window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
