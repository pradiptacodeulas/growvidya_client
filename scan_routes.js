
const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src/App.jsx");
const appContent = fs.readFileSync(appPath, "utf8");

const routeRegex = /<Route\s+[^>]*path=["']([^"']+)["']/g;
const registeredRoutes = new Set();
let match;
while ((match = routeRegex.exec(appContent)) !== null) {
  registeredRoutes.add(match[1]);
}
console.log("Total registered routes in App.jsx:", registeredRoutes.size);

function scanDir(dir, links = new Set()) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== "node_modules" && item.name !== "dist") {
      scanDir(full, links);
    } else if (item.isFile() && item.name.endsWith(".jsx")) {
      const c = fs.readFileSync(full, "utf8");
      const toRegex = /(?:to=|navigate\(|href=)["']([^"'`${}]+)["']/g;
      let m;
      while ((m = toRegex.exec(c)) !== null) {
        const p = m[1];
        if (p.startsWith("/") && !p.startsWith("/api") && !p.startsWith("/http") && !p.startsWith("/vidya_assets") && !p.startsWith("/upload") && !p.startsWith("/assets")) {
          links.add(p);
        }
      }
    }
  }
  return links;
}

const allLinks = scanDir(path.join(__dirname, "src"));
console.log("Total unique static links in frontend:", allLinks.size);

const missing = [];
for (const link of allLinks) {
  const normalized = link.replace(/^\/admin\//, "");
  let found = false;
  for (const r of registeredRoutes) {
    if (r === link || r === normalized || "/admin/" + r === link || "/" + r === link) {
      found = true;
      break;
    }
    const rPattern = "^" + r.replace(/:[a-zA-Z0-9_]+/g, "[^/]+") + "$";
    const rRegex = new RegExp(rPattern);
    if (rRegex.test(link) || rRegex.test(normalized) || rRegex.test(link.replace(/^\//, ""))) {
      found = true;
      break;
    }
  }
  if (!found) {
    missing.push(link);
  }
}
console.log("Missing / Potential 404 links count:", missing.length);
console.log("Missing links:", missing.sort());
