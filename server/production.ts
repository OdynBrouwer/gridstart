import "./prod-setup";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./app";
import { staticLimiter } from "./middleware/rateLimit";
import type { Context, Next } from "hono";

const port = parseInt(process.env.PORT || "3000", 10);

app.use("/*", async (c: Context, next: Next) => {
  if (!c.req.path.startsWith("/api")) {
    return staticLimiter(c, next);
  }
  await next();
});

// SPA route: /app → app.html
app.get("/app", serveStatic({ path: "./dist/public/app.html" }));

// Alles andere: statische bestanden
app.get("/*", serveStatic({ root: "./dist/public" }));

serve({
  fetch: app.fetch,
  port,
});

console.log(`[gridstart] serving on port ${port}`);