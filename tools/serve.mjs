// Local dev/verify server. Serves the repo root on :8013 so both versions of
// the game can be checked the way a browser actually loads them (file:// hides
// some issues):
//
//   http://localhost:8013/                    the readable source
//   http://localhost:8013/dist/index.html     the built single-file package
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(".");
const PORT = 8013;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".zip": "application/zip"
};

createServer(async (req, res) => {
  const requested = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const path = join(ROOT, normalize(requested === "/" ? "/index.html" : requested));

  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(path);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} on http://localhost:${PORT}`);
  console.log(`  source: http://localhost:${PORT}/`);
  console.log(`  built:  http://localhost:${PORT}/dist/index.html`);
});
