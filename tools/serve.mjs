// Tiny static server for eyeballing the built package the way a browser will
// actually load it (file:// hides some issues). Serves dist/ on :8013.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = "dist";
const PORT = 8013;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
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
});
