// Build the same lab as a self-contained HTML artifact for inline review.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const out = process.env.MOTION_ARTIFACT_DIR ?? "/tmp/coffyyy-motion";
await mkdir(out, { recursive: true });
await build({
	stdin: {
		contents:
			'import React from "react"; import {createRoot} from "react-dom/client"; import CtaLab from "./src/pages/CtaLab"; createRoot(document.getElementById("root")).render(<CtaLab standalone />);',
		resolveDir: root,
		loader: "tsx",
	},
	bundle: true,
	outfile: path.join(out, "study.js"),
	minify: true,
	jsx: "automatic",
	tsconfigRaw: {
		compilerOptions: { baseUrl: root, paths: { "@/*": ["./src/*"] } },
	},
});
const font = async (name, file, style) =>
	`@font-face{font-family:${name};src:url(data:font/woff2;base64,${(await readFile(path.join(root, "node_modules/@fontsource-variable", file))).toString("base64")});font-style:${style};font-weight:100 900;}`;
const fonts =
	(await font(
		"CoffyyyDisplay",
		"fraunces/files/fraunces-latin-opsz-italic.woff2",
		"italic",
	)) +
	(await font(
		"CoffyyyDisplay",
		"fraunces/files/fraunces-latin-wght-normal.woff2",
		"normal",
	)) +
	(await font(
		"CoffyyyUI",
		"instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
		"normal",
	)) +
	(await font(
		"CoffyyyData",
		"spline-sans-mono/files/spline-sans-mono-latin-wght-normal.woff2",
		"normal",
	));
const css = await readFile(path.join(out, "study.css"), "utf8");
const js = await readFile(path.join(out, "study.js"), "utf8");
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}*{box-sizing:border-box}body{margin:0}button,input{font:inherit}button{border-radius:0}#root{--font-display:CoffyyyDisplay,Georgia,serif;--font-sans:CoffyyyUI,Arial,sans-serif;--font-data:CoffyyyData,var(--font-mono,monospace);--paper:var(--background);--paper-raised:var(--card);--paper-sunken:var(--secondary);--ink:var(--foreground);--ink-soft:var(--muted-foreground);--ink-faint:var(--muted-foreground);--line:var(--border);--line-strong:var(--border);--accent:var(--chart-3);--ease-soft:cubic-bezier(.22,.72,.12,1)}${css}.motion-lab-heading{justify-content:flex-end;margin-bottom:12px}.motion-lab-heading>div,.motion-context,.motion-shelf,.motion-disclaimer{display:none}.motion-tabs{margin-bottom:16px}.motion-description{border-bottom:0}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await writeFile(path.join(out, "studies.html"), html);
console.log(
	`Motion artifact: ${path.join(out, "studies.html")} (${Buffer.byteLength(html)} bytes)`,
);
