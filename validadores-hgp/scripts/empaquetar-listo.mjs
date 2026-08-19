import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist-listo");
const out = path.join(root, "archivos");

execFileSync("npx", ["vite", "build", "--config", "vite.listo.config.ts"], {
  cwd: root,
  stdio: "inherit",
});

let html = await readFile(path.join(dist, "index.html"), "utf8");
const scriptOpen = html.match(/<script type="module"[^>]*>/);
if (!scriptOpen) throw new Error("No se encontró el script empaquetado.");
const stylePos = html.indexOf("<style");
const scriptClose = html.lastIndexOf("</script>", stylePos);
const code = html.slice(scriptOpen.index + scriptOpen[0].length, scriptClose);
html = `${html.slice(0, scriptOpen.index)}${html.slice(scriptClose + "</script>".length)}`.replace(
  "</body>",
  `<script>\n${code}\n</script>\n  </body>`,
);

await mkdir(out, { recursive: true });
await writeFile(path.join(dist, "ABRIR-Validadores-HGP.html"), html);
await writeFile(path.join(out, "ABRIR-Validadores-HGP.html"), html);
await copyFile(path.join(dist, "ABRIR-Validadores-HGP.html"), path.join(out, "ABRIR-Validadores-HGP.html"));
console.log("Listo:", path.join(out, "ABRIR-Validadores-HGP.html"));
