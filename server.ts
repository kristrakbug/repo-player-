import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
    if ("OPTIONS" === req.method) {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Proxy route to bypass CORS
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    
    if (!targetUrl) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    try {
      const lowerUrl = targetUrl.toLowerCase();
      const isManifest = lowerUrl.includes('.m3u8') || lowerUrl.includes('.m3u') || lowerUrl.includes('manifest');
      const isPotentialVideo = lowerUrl.includes('.ts') || lowerUrl.includes('.mp4') || lowerUrl.includes('.mkv') || lowerUrl.includes('.m4s');

      if (isManifest && !isPotentialVideo) {
        const response = await axios.get(targetUrl, {
          responseType: "arraybuffer",
          timeout: 40000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          validateStatus: () => true
        });

        if (response.status >= 400) {
          return res.status(response.status).json({ error: `Remote server returned ${response.status}` });
        }

        const contentType = (response.headers["content-type"] as string || "").toLowerCase();
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", contentType || "application/vnd.apple.mpegurl");

        const content = Buffer.from(response.data).toString('utf-8');
        const lines = content.split('\n');
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed.length === 0) return line;
          if (trimmed.startsWith('#')) {
            return line.replace(/URI="(.*?)"/g, (match, p1) => {
              try {
                const fullUrl = new URL(p1, targetUrl).href;
                return `URI="/api/proxy?url=${encodeURIComponent(fullUrl)}"`;
              } catch (e) {
                return match;
              }
            });
          }
          try {
            const fullUrl = new URL(trimmed, targetUrl).href;
            return `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
          } catch (e) {
            return line;
          }
        });
        res.send(rewrittenLines.join('\n'));
      } else {
        const response = await axios.get(targetUrl, {
          responseType: "stream",
          timeout: 60000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          validateStatus: () => true
        });

        if (response.status >= 400) {
          return res.status(response.status).json({ error: `Remote server returned ${response.status}` });
        }

        const contentType = (response.headers["content-type"] as string || "").toLowerCase();
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", contentType || "application/octet-stream");
        
        response.data.pipe(res);
        req.on('close', () => { if (response.data?.destroy) response.data.destroy(); });
      }
    } catch (error: any) {
      console.error("Proxy error for URL:", targetUrl);
      console.error("Proxy error details:", error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to fetch remote content" });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
