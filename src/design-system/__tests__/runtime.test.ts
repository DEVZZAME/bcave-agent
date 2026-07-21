import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleDesignArtifact, lintDesignArtifact } from "../runtime.js";

function writeArtifact(source: string): { dir: string; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bcave-design-"));
  const file = path.join(dir, "dashboard.html");
  fs.writeFileSync(file, assembleDesignArtifact("bcave", source, file), "utf8");
  return { dir, file };
}

describe("BCAVE design pipeline", () => {
  it("assembles the two-block contract with marked assets and passes lint", () => {
    const { dir, file } = writeArtifact([
      "```html:body",
      '<div class="topbar"><div class="topbar-inner"><div class="logo"><!--BCAVE_SYMBOL_SVG--> B.CAVE</div></div></div>',
      '<div class="page"><div class="kpi-grid"><div class="kpi dark"><div class="lb">총매출</div><div class="val num" id="sales"></div></div></div></div>',
      "```",
      "```js:app",
      "document.getElementById('sales').textContent = BCAVE.fmt.krw(12000000);",
      "```",
    ].join("\n"));
    const html = fs.readFileSync(file, "utf8");
    expect(html).toContain("BCAVE:ASSET tokens");
    expect(html).toContain("BCAVE:ASSET chart-adapter");
    expect(html).toContain('aria-label="B.CAVE symbol"');
    expect(lintDesignArtifact("bcave", file).pass).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("detects raw Chart.js and inline style violations", () => {
    const { dir, file } = writeArtifact([
      "```html:body",
      '<div class="page" style="color:#ff0000"><canvas id="c"></canvas></div>',
      "```",
      "```js:app",
      "new Chart(document.getElementById('c'), {});",
      "```",
    ].join("\n"));
    const result = lintDesignArtifact("bcave", file);
    expect(result.pass).toBe(false);
    expect(result.violations.map((v) => v.rule)).toEqual(expect.arrayContaining(["R2-no-inline-style", "R3-alien-hex", "R5-no-raw-chart"]));
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
