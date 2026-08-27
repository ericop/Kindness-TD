// Builds the js13kGames submission package.
//
//   source files  ->  minified single-file index.html  ->  dist/kindness-td.zip
//
// The competition limit is 13,312 bytes (13 * 1024) for the whole archive, and
// the archive must contain index.html at its top level with no external
// resources. This script enforces both and fails the build if we go over.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { minify as minifyJs } from "terser";
import { minify as minifyHtml } from "html-minifier-terser";
import { createZip } from "./zip.mjs";

const BUDGET = 13 * 1024;
const DIST = "dist";
const ZIP_NAME = "kindness-td.zip";

// Order matters: kindness-core.js defines canvas/ctx/grid/state that the game
// file relies on at load time.
const SOURCES = ["kindness-core.js", "kindness-td.js"];

function kb(bytes) {
  return (bytes / 1024).toFixed(2) + " KB";
}

async function buildJs() {
  const combined = SOURCES.map(file => readFileSync(file, "utf8")).join("\n");

  const result = await minifyJs(combined, {
    ecma: 2020,
    module: false,
    // The concatenated sources are one script that only talks to the DOM, so
    // every top-level name is safe to mangle.
    toplevel: true,
    compress: {
      ecma: 2020,
      passes: 4,
      unsafe: true,
      unsafe_arrows: true,
      unsafe_math: true,
      unsafe_methods: true,
      booleans_as_integers: true,
      drop_console: true,
      pure_getters: true,
      hoist_funs: true
    },
    mangle: { toplevel: true },
    format: { comments: false }
  });

  if (result.error) throw result.error;
  return result.code;
}

async function buildHtml(js) {
  const html = readFileSync("index.html", "utf8");

  // Replace the two external <script> tags with the inlined bundle. Keeping
  // everything in index.html means the zip has exactly one entry, which saves
  // both the second file's zip overhead and an HTTP request.
  const inlined = html
    .replace(/\s*<script[^>]*src="\.\/kindness-core\.js"[^>]*><\/script>/, "")
    .replace(
      /\s*<script[^>]*src="\.\/kindness-td\.js"[^>]*><\/script>/,
      "\n  <script>__GAME__</script>"
    );

  if (inlined.includes("kindness-core.js") || inlined.includes("kindness-td.js")) {
    throw new Error("Failed to inline scripts: index.html script tags did not match");
  }

  const minified = await minifyHtml(inlined, {
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeComments: true,
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    removeOptionalTags: true,
    collapseBooleanAttributes: true,
    useShortDoctype: true,
    minifyCSS: { level: { 1: { specialComments: 0 }, 2: { all: true } } },
    minifyJS: false
  });

  // Substitute after HTML minification so the placeholder can't be mangled and
  // so the JS is never re-parsed by the HTML minifier.
  return minified.replace("__GAME__", () => js);
}

function assertNoExternalResources(html) {
  // Rule 2: all assets, data and code must live inside the zip.
  const offenders = [...html.matchAll(/(?:src|href)\s*=\s*["']?([^"'\s>]+)/gi)]
    .map(m => m[1])
    .filter(url => /^(?:https?:)?\/\//i.test(url));

  if (offenders.length) {
    throw new Error("External resources are not allowed: " + offenders.join(", "));
  }
}

// advzip (advancecomp) recompresses the deflate streams harder than zlib can.
// It is optional: if it is not installed we just keep our own archive.
function tryAdvzip(path, before) {
  try {
    execFileSync("advzip", ["-z", "-4", "-i", "500", path], { stdio: "ignore" });
    const after = readFileSync(path).length;
    if (after < before) {
      console.log(`  advzip      ${kb(before)} -> ${kb(after)}`);
      return after;
    }
  } catch {
    console.log("  advzip      not installed (optional, squeezes out a few hundred bytes)");
  }
  return before;
}

// Confirm a standard archiver can read what we produced, and that index.html
// sits in the top level directory as the rules require.
function validateZip(path) {
  let listing;
  try {
    listing = execFileSync("unzip", ["-l", path], { encoding: "utf8" });
  } catch (error) {
    throw new Error("Produced archive is not readable by unzip: " + error.message);
  }

  execFileSync("unzip", ["-t", path], { stdio: "ignore" });

  if (!/^\s*\d+\s+\S+\s+\S+\s+index\.html\s*$/m.test(listing)) {
    throw new Error("index.html must be at the top level of the archive:\n" + listing);
  }
}

async function main() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  const rawJs = SOURCES.reduce((n, f) => n + readFileSync(f).length, 0);
  const js = await buildJs();
  const html = await buildHtml(js);

  assertNoExternalResources(html);

  const htmlBuf = Buffer.from(html, "utf8");
  writeFileSync(`${DIST}/index.html`, htmlBuf);

  const zipPath = `${DIST}/${ZIP_NAME}`;
  const zip = createZip([{ name: "index.html", data: htmlBuf }]);
  writeFileSync(zipPath, zip);

  console.log("Kindness TD - js13kGames 2026 build\n");
  console.log(`  js source   ${kb(rawJs)}`);
  console.log(`  js minified ${kb(Buffer.byteLength(js))}`);
  console.log(`  index.html  ${kb(htmlBuf.length)}`);

  const finalSize = tryAdvzip(zipPath, zip.length);
  validateZip(zipPath);
  const pct = ((finalSize / BUDGET) * 100).toFixed(1);
  const remaining = BUDGET - finalSize;

  console.log(`\n  ${ZIP_NAME}  ${finalSize} bytes  (${pct}% of ${BUDGET})`);

  if (remaining < 0) {
    console.error(`\nFAIL over budget by ${-remaining} bytes`);
    process.exit(1);
  }

  console.log(`  OK ${remaining} bytes to spare\n`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
