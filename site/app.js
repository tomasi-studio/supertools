(() => {
  "use strict";

  // Exact brush swatches from src/pointer/pointer.c3 (lines 36-42)
  const SWATCHES = [
    { name: "black", hex: "#000000" },
    { name: "white", hex: "#ffffff" },
    { name: "red", hex: "#ff3b30" },
    { name: "yellow", hex: "#ffd60a" },
    { name: "cyan", hex: "#32d6ff" },
  ];

  // Inline SVG marks for the 4-column logo preset
  function svgUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  const LOGO_MARKS = {
    grid: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
        <rect x="20" y="20" width="34" height="34" rx="8" fill="#2c313d"/>
        <rect x="66" y="20" width="34" height="34" rx="8" fill="#5ab4ff"/>
        <rect x="20" y="66" width="34" height="34" rx="8" fill="#2c313d"/>
        <rect x="66" y="66" width="34" height="34" rx="8" fill="#2c313d"/>
      </svg>
    `),
    aperture: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="38" stroke="#eceef3" stroke-width="5"/>
        <circle cx="60" cy="60" r="14" fill="#5ab4ff"/>
        <path d="M60 22V40M60 80V98M22 60H40M80 60H98" stroke="#5ab4ff" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `),
    brackets: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
        <path d="M44 26H30C25.58 26 22 29.58 22 34V86C22 90.42 25.58 94 30 94H44" stroke="#eceef3" stroke-width="6" stroke-linecap="round"/>
        <path d="M76 26H90C94.42 26 98 29.58 98 34V86C98 90.42 94.42 94 90 94H76" stroke="#eceef3" stroke-width="6" stroke-linecap="round"/>
        <rect x="47" y="47" width="26" height="26" rx="6" fill="#5ab4ff"/>
      </svg>
    `),
    diamond: svgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
        <polygon points="60,16 104,60 60,104 16,60" stroke="#2c313d" stroke-width="5" fill="#16181f"/>
        <polygon points="60,32 88,60 60,88 32,60" stroke="#5ab4ff" stroke-width="4" fill="rgba(90,180,255,0.16)"/>
        <circle cx="60" cy="60" r="7" fill="#eceef3"/>
      </svg>
    `),
  };

  // Sample artworks (720x720 PNGs in site/assets/)
  const ART = {
    monolith: { src: "assets/art-monolith.png", path: "/tmp/art-monolith.png", w: 720, h: 720 },
    prism: { src: "assets/art-prism.png", path: "/tmp/art-prism.png", w: 720, h: 720 },
    topo: { src: "assets/art-topo.png", path: "/tmp/art-topo.png", w: 720, h: 720 },
  };

  // =========================================================================
  // HERO PRESETS PER TOOL
  // =========================================================================
  const PICK_PRESETS = {
    artwork: {
      label: "Splash Renders",
      pill: "--card",
      prompt: "Which splash render should we bundle?",
      cols: 3,
      none: "Keep current",
      items: [
        { kind: "card", image: ART.monolith.src, cliImage: "build/renders/monolith.png", title: "Obsidian Monolith", desc: "Matte slab with rim-light shader" },
        { kind: "card", image: ART.prism.src, cliImage: "build/renders/prism.png", title: "Refraction Prism", desc: "Raymarched glass and caustics" },
        { kind: "card", image: ART.topo.src, cliImage: "build/renders/topo.png", title: "Topographic Signal", desc: "Heightmap contour pass" },
      ],
    },
    images: {
      label: "Captures",
      pill: "--image",
      prompt: "Pick the frame for the release notes",
      cols: 3,
      none: "Skip image",
      items: [
        { kind: "image", image: ART.monolith.src, cliImage: "/tmp/captures/frame-01.png" },
        { kind: "image", image: ART.prism.src, cliImage: "/tmp/captures/frame-02.png" },
        { kind: "image", image: ART.topo.src, cliImage: "/tmp/captures/frame-03.png" },
      ],
    },
    logos: {
      label: "App Icons",
      pill: "--cols 4",
      prompt: "Choose the app icon variant",
      cols: 4,
      none: "Keep existing icon",
      items: [
        { kind: "image", image: LOGO_MARKS.grid, cliImage: "assets/icons/grid.png", isSvg: true },
        { kind: "image", image: LOGO_MARKS.aperture, cliImage: "assets/icons/aperture.png", isSvg: true },
        { kind: "image", image: LOGO_MARKS.brackets, cliImage: "assets/icons/brackets.png", isSvg: true },
        { kind: "image", image: LOGO_MARKS.diamond, cliImage: "assets/icons/diamond.png", isSvg: true },
      ],
    },
    deploy: {
      label: "Deploy Target",
      pill: "--text",
      prompt: "Select deployment target",
      cols: 2,
      none: "Abort deploy",
      items: [
        { kind: "text", title: "staging-eu-west" },
        { kind: "text", title: "canary-5pct" },
        { kind: "text", title: "production-global" },
        { kind: "text", title: "dry-run-only" },
      ],
    },
  };

  const DRAW_PRESETS = {
    single: {
      label: "Shader Glitch",
      pill: "1 image",
      prompt: "Circle the artifact to fix in the shader",
      color: 2, // red
      points: false,
      panels: [
        { src: ART.prism.src, path: "build/renders/prism.png", w: 720, h: 720, title: "Refraction Prism", desc: "Draw a loop, line, or click to mark coordinates" },
      ],
    },
    compare: {
      label: "Branch Diff",
      pill: "2 images",
      prompt: "Mark differences between main and this branch",
      color: 2,
      points: false,
      panels: [
        { src: ART.monolith.src, path: "/tmp/diff/main.png", w: 720, h: 720, title: "main", desc: "Baseline capture" },
        { src: ART.topo.src, path: "/tmp/diff/branch.png", w: 720, h: 720, title: "feature/contours", desc: "Updated shader pass" },
      ],
    },
    quad: {
      label: "Camera Angles",
      pill: "4 images",
      prompt: "Point out clipping across the four camera angles",
      color: 4, // cyan
      points: false,
      panels: [
        { src: ART.monolith.src, path: "/tmp/angles/front.png", w: 720, h: 720, title: "01 · Front", desc: "" },
        { src: ART.prism.src, path: "/tmp/angles/side.png", w: 720, h: 720, title: "02 · Side", desc: "" },
        { src: ART.topo.src, path: "/tmp/angles/overhead.png", w: 720, h: 720, title: "03 · Overhead", desc: "" },
        { src: ART.prism.src, path: "/tmp/angles/exposure.png", w: 720, h: 720, title: "04 · Exposure +1", desc: "" },
      ],
    },
  };

  const VIEW_PRESETS = {
    pair: {
      label: "Before / After",
      pill: "2 images",
      prompt: "Shader pass before and after tone mapping",
      panels: [
        { src: ART.monolith.src, path: "/tmp/diff/before.png", w: 720, h: 720, title: "Before", desc: "Linear output" },
        { src: ART.prism.src, path: "/tmp/diff/after.png", w: 720, h: 720, title: "After", desc: "ACES tone map" },
      ],
    },
    single: {
      label: "Single Frame",
      pill: "1 image",
      prompt: "Heightmap export — 720×720 PNG",
      panels: [
        { src: ART.topo.src, path: "build/renders/topo.png", w: 720, h: 720, title: "Topographic Signal", desc: "Saved to build/renders/topo.png" },
      ],
    },
    triptych: {
      label: "Render Passes",
      pill: "3 images",
      prompt: "All three shader passes finished",
      panels: [
        { src: ART.monolith.src, path: "build/renders/monolith.png", w: 720, h: 720, title: "Monolith", desc: "Pass 1 · 4.2ms" },
        { src: ART.prism.src, path: "build/renders/prism.png", w: 720, h: 720, title: "Prism", desc: "Pass 2 · 6.1ms" },
        { src: ART.topo.src, path: "build/renders/topo.png", w: 720, h: 720, title: "Topographic", desc: "Pass 3 · 3.8ms" },
      ],
    },
  };

  const TOOL_ORDER = ["pick", "draw", "view"];

  // Agents & editors that support local stdio MCP servers
  const MCP_CLIENTS = [
    {
      id: "claude",
      name: "Claude Code",
      logo: "assets/logos/claude.svg",
      cliLabel: "Claude Code CLI",
      cli: "claude mcp add supertools -- /path/to/supertools --mcp",
      configLabel: ".mcp.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: "/path/to/supertools", args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "antigravity",
      name: "Antigravity",
      logo: "assets/logos/antigravity.svg",
      configLabel: "~/.gemini/config/mcp_config.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: "/path/to/supertools", args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "codex",
      name: "Codex",
      logo: "assets/logos/codex.svg",
      cliLabel: "Codex CLI",
      cli: "codex mcp add supertools -- /path/to/supertools --mcp",
      configLabel: "~/.codex/config.toml",
      config: '[mcp_servers.supertools]\ncommand = "/path/to/supertools"\nargs = ["--mcp"]',
      isJson: false,
    },
    {
      id: "cursor",
      name: "Cursor",
      logo: "assets/logos/cursor.svg",
      configLabel: "~/.cursor/mcp.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: "/path/to/supertools", args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "gemini",
      name: "Gemini CLI",
      logo: "assets/logos/gemini.svg",
      configLabel: "~/.gemini/settings.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: "/path/to/supertools", args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "opencode",
      name: "OpenCode",
      logo: "assets/logos/opencode.svg",
      configLabel: "opencode.json",
      config: JSON.stringify(
        { mcp: { supertools: { type: "local", command: ["/path/to/supertools", "--mcp"], enabled: true } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "zed",
      name: "Zed",
      logo: "assets/logos/zed.svg",
      configLabel: "~/.config/zed/settings.json",
      config: JSON.stringify(
        { context_servers: { supertools: { command: { path: "/path/to/supertools", args: ["--mcp"] } } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "copilot",
      name: "VS Code",
      logo: "assets/logos/copilot.svg",
      configLabel: ".vscode/mcp.json",
      config: JSON.stringify(
        { servers: { supertools: { type: "stdio", command: "/path/to/supertools", args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
  ];

  // Exact MCP JSON-RPC 2.0 traces from src/mcp/
  const MCP_TRACES = {
    init: {
      req: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "claude-code", version: "1.0.0" },
        },
      },
      res: {
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "supertools", version: "1.0.0" },
        },
      },
    },
    list: {
      req: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      res: {
        jsonrpc: "2.0",
        id: 2,
        result: {
          tools: [
            {
              name: "pick",
              title: "Visual picker",
              description: "Show a grid of options and wait for the user to choose one.",
              inputSchema: { type: "object", required: ["items"] },
            },
            {
              name: "draw",
              title: "Draw on images",
              description: "Show 1–4 images to draw on; returns marked-up PNGs plus stroke geometry.",
              inputSchema: { type: "object", required: ["images"] },
            },
            {
              name: "view",
              title: "Show images",
              description: "Show 1–4 captioned images in a background window and return at once.",
              inputSchema: { type: "object", required: ["images"] },
            },
          ],
        },
      },
    },
    calls: {
      pick: {
        req: {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "pick",
            arguments: {
              prompt: "Which splash render should we bundle?",
              columns: 3,
              none: "Keep current",
              items: [
                { image: "build/renders/monolith.png", title: "Obsidian Monolith", description: "Matte slab with rim-light shader" },
                { image: "build/renders/prism.png", title: "Refraction Prism", description: "Raymarched glass and caustics" },
                { image: "build/renders/topo.png", title: "Topographic Signal", description: "Heightmap contour pass" },
              ],
            },
          },
        },
        res: {
          jsonrpc: "2.0",
          id: 3,
          result: {
            content: [{ type: "text", text: "{\"choice\":\"option\",\"index\":1,\"label\":\"Refraction Prism\"}" }],
            structuredContent: { choice: "option", index: 1, label: "Refraction Prism" },
          },
        },
      },
      draw: {
        req: {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "draw",
            arguments: {
              prompt: "Circle the artifact to fix in the shader",
              color: "red",
              images: [{ path: "build/renders/prism.png", title: "Refraction Prism" }],
            },
          },
        },
        res: {
          jsonrpc: "2.0",
          id: 4,
          result: {
            content: [
              { type: "text", text: "{\"images\":[{\"path\":\"/tmp/art-prism.png\",\"width\":720,\"height\":720,\"marked\":\"/tmp/pointer-4182-0.png\"}],\"strokes\":[{\"image\":0,\"color\":\"red\",\"kind\":\"loop\",\"bbox\":[210,195,248,230]}]}" },
              { type: "image", mimeType: "image/png", data: "<base64 marked PNG>" },
            ],
            structuredContent: {
              images: [{ path: "/tmp/art-prism.png", width: 720, height: 720, marked: "/tmp/pointer-4182-0.png" }],
              strokes: [{ image: 0, color: "red", kind: "loop", bbox: [210, 195, 248, 230] }],
            },
          },
        },
      },
      view: {
        req: {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "view",
            arguments: {
              prompt: "Shader pass before and after tone mapping",
              images: [
                { path: "/tmp/diff/before.png", title: "Before", description: "Linear output" },
                { path: "/tmp/diff/after.png", title: "After", description: "ACES tone map" },
              ],
            },
          },
        },
        res: {
          jsonrpc: "2.0",
          id: 5,
          result: {
            content: [{ type: "text", text: "{\"shown\":true}" }],
            structuredContent: { shown: true },
          },
        },
      },
    },
  };

  // =========================================================================
  // HELPERS & STROKE CLASSIFIER (ported from src/pointer/pointer.c3)
  // =========================================================================
  function shellQuote(str) {
    if (str === "") return '""';
    if (/^[A-Za-z0-9_./:-]+$/.test(str)) return str;
    return "'" + String(str).replace(/'/g, "'\\''") + "'";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightJson(obj) {
    const raw = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    const escaped = escapeHtml(raw);
    return escaped.replace(
      /(&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\&]|&(?!quot;))*&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        if (match.startsWith("&quot;")) {
          if (match.endsWith(":")) return `<span class="tok-key">${match}</span>`;
          return `<span class="tok-str">${match}</span>`;
        }
        if (/true|false|null/.test(match)) return `<span class="tok-bool">${match}</span>`;
        return `<span class="tok-num">${match}</span>`;
      }
    );
  }

  // Matches Model.describe() in src/pointer/pointer.c3 (lines 252-297)
  function classifyStroke(stroke, panel, displayW, includePoints) {
    const CLICK_PT = 8.0;
    const orig = (pt) => [Math.round(pt.x * panel.w), Math.round(pt.y * panel.h)];
    const first = orig(stroke.points[0]);
    const last = orig(stroke.points[stroke.points.length - 1]);
    let x0 = first[0], y0 = first[1], x1 = x0, y1 = y0;
    let len = 0;
    let prev = first;
    for (const pt of stroke.points) {
      const o = orig(pt);
      if (o[0] < x0) x0 = o[0];
      if (o[1] < y0) y0 = o[1];
      if (o[0] > x1) x1 = o[0];
      if (o[1] > y1) y1 = o[1];
      len += Math.hypot(o[0] - prev[0], o[1] - prev[1]);
      prev = o;
    }
    const perPt = panel.w / Math.max(displayW || 320, 1);
    const extent = Math.max(x1 - x0, y1 - y0);
    const gap = Math.hypot(last[0] - first[0], last[1] - first[1]);
    let kind = "line";
    if (extent < CLICK_PT * perPt) {
      kind = "click";
    } else if (gap < 0.4 * extent && len > 1.5 * extent) {
      kind = "loop";
    } else if (len > 1.3 * gap) {
      kind = "curve";
    }
    const out = {
      image: stroke.panel,
      color: SWATCHES[stroke.color].name,
      kind,
    };
    if (kind === "click") {
      out.at = [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)];
    } else if (kind === "line" || kind === "curve") {
      out.from = first;
      out.to = last;
    }
    out.bbox = [x0, y0, x1 - x0, y1 - y0];
    if (includePoints) {
      out.points = stroke.points.map(orig);
    }
    return out;
  }

  function buildDrawSummary(panels, strokes, displayWidths, includePoints) {
    const images = panels.map((p, i) => {
      const entry = { path: p.path, width: p.w, height: p.h };
      if (strokes.some((s) => s.panel === i)) {
        entry.marked = `/tmp/pointer-4182-${i}.png`;
      }
      return entry;
    });
    const strokeList = strokes.map((s) => classifyStroke(s, panels[s.panel], displayWidths[s.panel], includePoints));
    return { images, strokes: strokeList };
  }

  function buildPickCli(cfg, multiline = false) {
    const flags = [];
    if (cfg.prompt) flags.push(["--prompt", shellQuote(cfg.prompt)]);
    if (cfg.cols && cfg.cols !== 3) flags.push(["--cols", String(cfg.cols)]);
    if (cfg.width && cfg.width !== 100) flags.push(["--width", String(cfg.width)]);
    if (cfg.none) flags.push(["--none", shellQuote(cfg.none)]);
    for (const it of cfg.items) {
      if (it.kind === "text") {
        flags.push(["--text", shellQuote(it.title || "")]);
      } else if (it.kind === "image") {
        flags.push(["--image", shellQuote(it.cliImage || it.image || "")]);
      } else {
        flags.push(["--card", shellQuote(it.cliImage || it.image || ""), shellQuote(it.title || ""), shellQuote(it.desc || "")]);
      }
    }
    if (!multiline) return ["supertools", "picker", ...flags.flat()].join(" ");
    return "supertools picker \\\n" + flags.map((f) => "  " + f.join(" ")).join(" \\\n");
  }

  function buildPointerCli(subcmd, cfg, multiline = false) {
    const flags = [];
    if (cfg.prompt) flags.push(["--prompt", shellQuote(cfg.prompt)]);
    if (subcmd === "pointer") {
      if (cfg.color !== undefined && cfg.color !== 2) flags.push(["--color", SWATCHES[cfg.color].name]);
      if (cfg.points) flags.push(["--points"]);
    }
    for (const p of cfg.panels) {
      const line = [shellQuote(p.path || "/tmp/image.png")];
      if (p.title) line.push("--label", shellQuote(p.title));
      if (p.desc) line.push("--desc", shellQuote(p.desc));
      flags.push(line);
    }
    if (!multiline) return ["supertools", subcmd, ...flags.flat()].join(" ");
    return `supertools ${subcmd} \\\n` + flags.map((f) => "  " + f.join(" ")).join(" \\\n");
  }

  function buildPickMcpArgs(cfg) {
    const args = {};
    if (cfg.prompt) args.prompt = cfg.prompt;
    if (cfg.cols && cfg.cols !== 3) args.columns = cfg.cols;
    if (cfg.none) args.none = cfg.none;
    args.items = cfg.items.map((it) => {
      if (it.kind === "text") return { title: it.title || "" };
      if (it.kind === "image") return { image: it.cliImage || it.image || "" };
      const obj = {};
      const img = it.cliImage || it.image || "";
      if (img) obj.image = img;
      if (it.title) obj.title = it.title;
      if (it.desc) obj.description = it.desc;
      return obj;
    });
    return args;
  }

  function buildPointerMcpArgs(isDraw, cfg) {
    const args = {};
    if (cfg.prompt) args.prompt = cfg.prompt;
    if (isDraw) {
      if (cfg.color !== undefined && cfg.color !== 2) args.color = SWATCHES[cfg.color].name;
      if (cfg.points) args.points = true;
    }
    args.images = cfg.panels.map((p) => {
      if (!p.title && !p.desc) return p.path;
      const obj = { path: p.path };
      if (p.title) obj.title = p.title;
      if (p.desc) obj.description = p.desc;
      return obj;
    });
    return args;
  }

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (!btn) return;
    const orig = btn.dataset.origText || btn.textContent;
    btn.dataset.origText = orig;
    btn.textContent = "Copied";
    btn.classList.add("is-copied");
    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove("is-copied");
    }, 1400);
  }

  function renderTileNode(item, index, isSelected, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pk-tile" + (isSelected ? " is-selected" : "");
    btn.dataset.index = String(index);

    const idxTag = document.createElement("span");
    idxTag.className = "pk-tile-idx";
    idxTag.textContent = `#${index}`;
    btn.appendChild(idxTag);

    if (item.kind === "image" || (item.kind === "card" && item.image)) {
      const thumb = document.createElement("div");
      thumb.className = "pk-tile-thumb" + (item.isSvg ? " is-svg-mark" : "");
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.title || item.cliImage || `Option ${index}`;
      img.draggable = false;
      thumb.appendChild(img);
      btn.appendChild(thumb);
    }

    if (item.kind === "text") {
      const title = document.createElement("div");
      title.className = "pk-tile-title";
      title.textContent = item.title || "(untitled)";
      btn.appendChild(title);
    } else if (item.kind === "card") {
      const cap = document.createElement("div");
      cap.className = "pk-tile-caption" + (item.image ? "" : " no-image");
      const title = document.createElement("div");
      title.className = "pk-tile-title";
      title.textContent = item.title || "(untitled)";
      cap.appendChild(title);
      if (item.desc) {
        const desc = document.createElement("div");
        desc.className = "pk-tile-desc";
        desc.textContent = item.desc;
        cap.appendChild(desc);
      }
      btn.appendChild(cap);
    }

    btn.addEventListener("click", () => onClick(index));
    return btn;
  }

  // Paint all strokes for a panel onto its overlay canvas
  function paintOverlayCanvas(canvas, strokes, panelIdx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const s of strokes) {
      if (s.panel !== panelIdx || !s.points.length) continue;
      ctx.strokeStyle = SWATCHES[s.color].hex;
      ctx.fillStyle = SWATCHES[s.color].hex;
      ctx.lineWidth = 6 * dpr;
      if (s.points.length === 1) {
        ctx.beginPath();
        ctx.arc(s.points[0].x * w, s.points[0].y * h, 3 * dpr, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
        }
        ctx.stroke();
      }
    }
  }

  // Composite base image + overlay canvas into a thumbnail data URL for the Done preview
  function compositeMarkedThumb(imgEl, canvasEl) {
    try {
      const size = 180;
      const out = document.createElement("canvas");
      out.width = size;
      out.height = size;
      const ctx = out.getContext("2d");
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        ctx.drawImage(imgEl, 0, 0, size, size);
      } else {
        ctx.fillStyle = "#16181f";
        ctx.fillRect(0, 0, size, size);
      }
      ctx.drawImage(canvasEl, 0, 0, size, size);
      return out.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  // Build drawable or view-only panel grid
  function renderPointerGrid(container, panels, options) {
    const { drawable, strokes, getColor, onStrokesChange } = options;
    container.className = `ptr-canvas-grid layout-${Math.min(Math.max(panels.length, 1), 4)}`;
    container.innerHTML = "";
    const refs = [];

    panels.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "ptr-panel";

      const stage = document.createElement("div");
      stage.className = "ptr-stage";

      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.title || p.path;
      img.draggable = false;
      stage.appendChild(img);

      let canvas = null;
      let hint = null;
      if (drawable) {
        canvas = document.createElement("canvas");
        stage.appendChild(canvas);

        if (idx === 0) {
          hint = document.createElement("div");
          hint.className = "ptr-draw-hint" + (strokes.length ? " is-gone" : "");
          hint.textContent = "Drag to draw or click to mark";
          stage.appendChild(hint);
        }

        let activeStroke = null;
        const pointFromEvent = (e) => {
          const r = canvas.getBoundingClientRect();
          return {
            x: Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(r.width, 1))),
            y: Math.max(0, Math.min(1, (e.clientY - r.top) / Math.max(r.height, 1))),
          };
        };

        canvas.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          canvas.setPointerCapture(e.pointerId);
          activeStroke = { panel: idx, color: getColor(), points: [pointFromEvent(e)] };
          strokes.push(activeStroke);
          container.querySelectorAll(".ptr-draw-hint").forEach((h) => h.classList.add("is-gone"));
          paintOverlayCanvas(canvas, strokes, idx);
          onStrokesChange();
        });

        canvas.addEventListener("pointermove", (e) => {
          if (!activeStroke) return;
          const pt = pointFromEvent(e);
          const last = activeStroke.points[activeStroke.points.length - 1];
          const r = canvas.getBoundingClientRect();
          const dx = (pt.x - last.x) * r.width;
          const dy = (pt.y - last.y) * r.height;
          if (dx * dx + dy * dy < 4) return; // STEP = 2px
          activeStroke.points.push(pt);
          paintOverlayCanvas(canvas, strokes, idx);
        });

        const endStroke = () => {
          if (!activeStroke) return;
          activeStroke = null;
          onStrokesChange();
        };
        canvas.addEventListener("pointerup", endStroke);
        canvas.addEventListener("pointercancel", endStroke);
      }

      card.appendChild(stage);

      if (p.title || p.desc) {
        const cap = document.createElement("div");
        cap.className = "ptr-caption";
        if (p.title) {
          const t = document.createElement("div");
          t.className = "ptr-caption-title";
          t.textContent = p.title;
          cap.appendChild(t);
        }
        if (p.desc) {
          const d = document.createElement("div");
          d.className = "ptr-caption-desc";
          d.textContent = p.desc;
          cap.appendChild(d);
        }
        card.appendChild(cap);
      }

      container.appendChild(card);
      refs.push({ img, canvas });
    });

    if (drawable) {
      requestAnimationFrame(() => {
        refs.forEach((r, idx) => {
          if (r.canvas) paintOverlayCanvas(r.canvas, strokes, idx);
        });
      });
    }
    return refs;
  }

  function renderSwatches(container, activeIdx, onSelect) {
    container.innerHTML = "";
    SWATCHES.forEach((sw, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ptr-swatch" + (i === activeIdx ? " is-active" : "");
      btn.style.background = sw.hex;
      btn.title = `${sw.name} (${i + 1})`;
      btn.setAttribute("aria-label", `${sw.name} colour`);
      btn.addEventListener("click", () => onSelect(i));
      container.appendChild(btn);
    });
  }

  // =========================================================================
  // 1. HERO 3-TOOL LIVE STAGE
  // =========================================================================
  const hero = {
    tool: "pick", // "pick" | "draw" | "view"
    pickPreset: "artwork",
    drawPreset: "single",
    viewPreset: "pair",
    sel: 0,
    drawColor: 2,
    drawStrokes: [],
    drawRefs: [],
    exited: null,
    view: "cli",
    dragX: 0,
    dragY: 0,
  };

  const els = {
    canvas: document.getElementById("desktop-canvas"),
    termBackdrop: document.getElementById("term-backdrop"),
    termTitle: document.getElementById("term-title"),
    termBody: document.getElementById("term-body"),
    termInputStatus: document.getElementById("term-input-status"),
    presetTabs: document.getElementById("hero-preset-tabs"),
    recenterBtn: document.getElementById("recenter-btn"),
    pickWin: document.getElementById("hero-pick-window"),
    drawWin: document.getElementById("hero-draw-window"),
    viewWin: document.getElementById("hero-view-window"),
    pkPrompt: document.getElementById("hero-pk-prompt"),
    pkNone: document.getElementById("hero-pk-none"),
    pkGrid: document.getElementById("hero-pk-grid"),
    drawPrompt: document.getElementById("hero-draw-prompt"),
    drawGrid: document.getElementById("hero-draw-grid"),
    drawSwatches: document.getElementById("hero-draw-swatches"),
    drawUndo: document.getElementById("hero-draw-undo"),
    drawClear: document.getElementById("hero-draw-clear"),
    drawDone: document.getElementById("hero-draw-done"),
    viewPrompt: document.getElementById("hero-view-prompt"),
    viewGrid: document.getElementById("hero-view-grid"),
    viewClose: document.getElementById("hero-view-close"),
    exited: document.getElementById("hero-pk-exited"),
    exitedBadge: document.getElementById("exited-code-badge"),
    exitedTitle: document.getElementById("exited-title"),
    exitedThumbs: document.getElementById("exited-thumbs"),
    exitedStdout: document.getElementById("exited-stdout"),
    exitedAgent: document.getElementById("exited-agent"),
    replayBtn: document.getElementById("hero-replay-btn"),
    nextToolBtn: document.getElementById("hero-next-tool-btn"),
    liveCliCmd: document.getElementById("live-cli-cmd"),
    liveCliOut: document.getElementById("live-cli-out"),
    liveExitPill: document.getElementById("live-exit-pill"),
    liveMcpReqLabel: document.getElementById("live-mcp-req-label"),
    liveMcpResLabel: document.getElementById("live-mcp-res-label"),
    liveMcpReq: document.getElementById("live-mcp-req"),
    liveMcpRes: document.getElementById("live-mcp-res"),
    statusDot: document.querySelector("#inspector-status .status-dot"),
    statusText: document.getElementById("inspector-status-text"),
    copyLiveCli: document.getElementById("copy-live-cli"),
  };

  function activeHeroWindow() {
    if (hero.tool === "pick") return els.pickWin;
    if (hero.tool === "draw") return els.drawWin;
    return els.viewWin;
  }

  function applyWindowTransform() {
    const t = `translate3d(${hero.dragX}px, ${hero.dragY}px, 0)`;
    els.pickWin.style.transform = t;
    els.drawWin.style.transform = t;
    els.viewWin.style.transform = t;
    els.recenterBtn.hidden = hero.dragX === 0 && hero.dragY === 0;
  }

  function renderPresetBar() {
    const map = hero.tool === "pick" ? PICK_PRESETS : hero.tool === "draw" ? DRAW_PRESETS : VIEW_PRESETS;
    const currentKey = hero.tool === "pick" ? hero.pickPreset : hero.tool === "draw" ? hero.drawPreset : hero.viewPreset;

    els.presetTabs.innerHTML = "";
    Object.entries(map).forEach(([key, preset]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-tab" + (key === currentKey ? " is-active" : "");
      btn.role = "tab";
      btn.setAttribute("aria-selected", String(key === currentKey));
      btn.innerHTML = `${escapeHtml(preset.label)} <span class="flag-pill">${escapeHtml(preset.pill)}</span>`;
      btn.addEventListener("click", () => {
        if (hero.tool === "pick") {
          hero.pickPreset = key;
          hero.sel = 0;
        } else if (hero.tool === "draw") {
          hero.drawPreset = key;
          hero.drawColor = DRAW_PRESETS[key].color;
          hero.drawStrokes = [];
        } else {
          hero.viewPreset = key;
        }
        hero.exited = null;
        renderHero();
      });
      els.presetTabs.appendChild(btn);
    });
  }

  function currentHeroCli() {
    if (hero.tool === "pick") return buildPickCli(PICK_PRESETS[hero.pickPreset], false);
    if (hero.tool === "draw") {
      const p = DRAW_PRESETS[hero.drawPreset];
      return buildPointerCli("pointer", { ...p, color: hero.drawColor }, false);
    }
    return buildPointerCli("view", VIEW_PRESETS[hero.viewPreset], false);
  }

  function renderTerminalBackdrop() {
    const lines = [];
    const addUser = (txt) => lines.push(`<div class="term-line term-line-user"><span class="t-sym">❯</span><span>${escapeHtml(txt)}</span></div>`);
    const addTool = (fn, arg) => lines.push(`<div class="term-line term-line-tool"><span class="t-sym">●</span><span class="t-fn">${escapeHtml(fn)}</span><span>${escapeHtml(arg)}</span></div>`);
    const addSub = (txt, cls = "") => lines.push(`<div class="term-line term-line-sub ${cls}"><span>└─ ${escapeHtml(txt)}</span></div>`);
    const addAgent = (txt) => lines.push(`<div class="term-line term-line-agent"><span class="t-sym">✦</span><span>${escapeHtml(txt)}</span></div>`);

    if (hero.tool === "pick") {
      const preset = PICK_PRESETS[hero.pickPreset];
      els.termTitle.textContent = hero.pickPreset === "deploy" ? "~/infra/deploy — claude" : "~/projects/renderer — claude";
      if (hero.pickPreset === "deploy") {
        addUser("Prepare the release and ask me which environment to deploy to");
        addTool("Read", "deploy/targets.yaml (4 targets)");
        addSub("staging-eu-west, canary-5pct, production-global, dry-run-only");
      } else if (hero.pickPreset === "logos") {
        addUser("Export the four app icon variants so I can pick one");
        addTool("Bash", "scripts/export-icons.sh");
        addSub("exported grid.png, aperture.png, brackets.png, diamond.png");
      } else if (hero.pickPreset === "images") {
        addUser("List the captures in /tmp/captures and let me pick one for the changelog");
        addTool("Glob", "/tmp/captures/frame-*.png (3 files)");
        addSub("frame-01.png, frame-02.png, frame-03.png");
      } else {
        addUser("Render all three splash shaders and let me pick which one to bundle");
        addTool("Bash", "cargo run --bin render-splash -- --all");
        addSub("wrote build/renders/monolith.png, prism.png, topo.png");
      }
      addTool("supertools · pick", `(prompt: "${preset.prompt}", items: ${preset.items.length})`);
      if (!hero.exited) {
        addSub("desktop window open — blocking until selection…", "is-wait");
        els.termInputStatus.textContent = "blocked on supertools · pick…";
      } else if (hero.exited.kind === "cancelled") {
        addSub('{"choice":"cancelled"}', "is-warn");
        addAgent("Cancelled. Leaving files untouched.");
        els.termInputStatus.textContent = "Ask a follow-up…";
      } else if (hero.exited.kind === "pick-none") {
        addSub(`{"choice":"none","label":"${hero.exited.label}"}`, "is-ok");
        addAgent(`Selected "${hero.exited.label}". Keeping current config.`);
        els.termInputStatus.textContent = "Ask a follow-up…";
      } else {
        addSub(`{"choice":"option","index":${hero.exited.index},"label":"${hero.exited.label}"}`, "is-ok");
        addAgent(`Selected #${hero.exited.index} (${hero.exited.label}). Updating build manifest…`);
        els.termInputStatus.textContent = "Ask a follow-up…";
      }
    } else if (hero.tool === "draw") {
      const preset = DRAW_PRESETS[hero.drawPreset];
      els.termTitle.textContent = "~/projects/renderer — codex";
      addUser("Open the shader captures so I can circle the artifact to fix");
      addTool("supertools · draw", `(prompt: "${preset.prompt}", images: ${preset.panels.length}, color: "${SWATCHES[hero.drawColor].name}")`);
      if (!hero.exited) {
        const n = hero.drawStrokes.length;
        addSub(
          n ? `${n} stroke${n === 1 ? "" : "s"} in progress — waiting for Done…` : "desktop window open — waiting for pointer annotations…",
          "is-wait"
        );
        els.termInputStatus.textContent = "blocked on supertools · draw…";
      } else if (hero.exited.kind === "cancelled") {
        addSub('{"cancelled":true}', "is-warn");
        addAgent("Annotation cancelled. No edits queued.");
        els.termInputStatus.textContent = "Ask a follow-up…";
      } else {
        const n = hero.exited.summary.strokes.length;
        const first = hero.exited.summary.strokes[0];
        const detail = first ? `first: ${first.color} ${first.kind} bbox [${first.bbox.join(", ")}]` : "0 strokes";
        addSub(`returned ${n} stroke${n === 1 ? "" : "s"} (${detail}) + marked PNG`, "is-ok");
        addAgent(n ? "Got the marked region and PNG overlay. Adjusting specular clamp in prism.frag…" : "No regions marked. Keeping current shader.");
        els.termInputStatus.textContent = "Ask a follow-up…";
      }
    } else {
      const preset = VIEW_PRESETS[hero.viewPreset];
      els.termTitle.textContent = "~/projects/renderer — agy";
      addUser("Run the tone-mapping pass and pop up the output when done");
      addTool("Bash", "cargo run --bin render-diff");
      addSub(`wrote ${preset.panels.length} frame${preset.panels.length === 1 ? "" : "s"} in 1.4s`);
      addTool("supertools · view", `(prompt: "${preset.prompt}", images: ${preset.panels.length})`);
      addSub('{"shown":true}  (returned immediately — background window)', "is-ok");
      addAgent(
        hero.exited
          ? "Window closed. Ready for the next adjustment."
          : "Opened the preview window in the background. Tell me what you want to tweak."
      );
      els.termInputStatus.textContent = "Ask a follow-up…";
    }

    els.termBody.innerHTML = lines.join("");
    els.termBackdrop.classList.toggle("is-awake", Boolean(hero.exited));
  }

  function renderHeroInspector() {
    renderTerminalBackdrop();
    els.liveCliCmd.textContent = currentHeroCli();
    els.liveMcpReqLabel.textContent = `tools/call → ${hero.tool}`;

    if (hero.tool === "pick") {
      els.liveMcpReq.innerHTML = highlightJson(buildPickMcpArgs(PICK_PRESETS[hero.pickPreset]));
    } else if (hero.tool === "draw") {
      const p = DRAW_PRESETS[hero.drawPreset];
      els.liveMcpReq.innerHTML = highlightJson(buildPointerMcpArgs(true, { ...p, color: hero.drawColor }));
    } else {
      els.liveMcpReq.innerHTML = highlightJson(buildPointerMcpArgs(false, VIEW_PRESETS[hero.viewPreset]));
    }

    const win = activeHeroWindow();
    if (!hero.exited) {
      win.classList.remove("is-hidden-exited");
      els.exited.hidden = true;

      if (hero.tool === "view") {
        els.statusDot.className = "status-dot is-ok";
        els.statusText.textContent = "returned immediately · window stays open";
        els.liveExitPill.className = "exit-pill is-ok";
        els.liveExitPill.textContent = "non-blocking";
        els.liveCliOut.innerHTML = '<span class="dim"># prints nothing; closes on Esc, Enter, or Space</span>';
        els.liveMcpResLabel.textContent = "structuredContent (immediate)";
        els.liveMcpRes.innerHTML = highlightJson({ shown: true });
      } else if (hero.tool === "draw") {
        const count = hero.drawStrokes.length;
        els.statusDot.className = "status-dot is-waiting";
        els.statusText.textContent = count
          ? `blocked · ${count} stroke${count === 1 ? "" : "s"} drawn · press Done`
          : "blocked · draw on an image or press Done";
        els.liveExitPill.className = "exit-pill is-waiting";
        els.liveExitPill.textContent = "running";
        els.liveCliOut.innerHTML = count
          ? `<span class="dim"># ${count} stroke${count === 1 ? "" : "s"} ready — click Done or press Enter</span>`
          : '<span class="dim"># draw with mouse/touch, then click Done or press Enter...</span>';
        els.liveMcpResLabel.textContent = "structuredContent + image/png";
        els.liveMcpRes.innerHTML = '<span class="dim">// tool call pending until Done or Esc</span>';
      } else {
        els.statusDot.className = "status-dot is-waiting";
        els.statusText.textContent = "blocked · waiting for input";
        els.liveExitPill.className = "exit-pill is-waiting";
        els.liveExitPill.textContent = "running";
        els.liveCliOut.innerHTML = '<span class="dim"># waiting for click, Enter, or Esc...</span>';
        els.liveMcpResLabel.textContent = "structuredContent";
        els.liveMcpRes.innerHTML = '<span class="dim">// tool call pending until window closes</span>';
      }
      return;
    }

    // Exited state
    win.classList.add("is-hidden-exited");
    els.exited.hidden = false;
    const res = hero.exited;
    els.exitedThumbs.hidden = true;
    els.exitedThumbs.innerHTML = "";

    if (res.kind === "view-closed") {
      els.exitedBadge.className = "exit-badge is-ok";
      els.exitedBadge.textContent = "exit 0";
      els.exitedTitle.textContent = "Window closed";
      els.exitedStdout.textContent = "(prints nothing)";
      els.exitedAgent.textContent = 'MCP already returned {"shown":true} when the window opened—the agent never blocked.';
      els.statusDot.className = "status-dot is-ok";
      els.statusText.textContent = "closed · exit 0";
      els.liveExitPill.className = "exit-pill is-ok";
      els.liveExitPill.textContent = "exit 0";
      els.liveCliOut.innerHTML = '<span class="dim">(empty)</span>';
      els.liveMcpRes.innerHTML = highlightJson({ shown: true });
      return;
    }

    if (res.kind === "draw-done") {
      const jsonLine = JSON.stringify(res.summary);
      els.exitedBadge.className = "exit-badge is-ok";
      els.exitedBadge.textContent = "exit 0";
      const n = res.summary.strokes.length;
      els.exitedTitle.textContent = n ? `${n} stroke${n === 1 ? "" : "s"} captured` : "Finished (no strokes)";
      els.exitedStdout.textContent = JSON.stringify(res.summary, null, 2);
      els.exitedAgent.textContent = res.thumbs.length
        ? `Attached ${res.thumbs.length} marked PNG${res.thumbs.length === 1 ? "" : "s"} plus pixel-space stroke JSON to the tool result.`
        : "No strokes drawn—returned image dimensions and an empty strokes array.";

      if (res.thumbs.length) {
        els.exitedThumbs.hidden = false;
        res.thumbs.forEach((url) => {
          const im = document.createElement("img");
          im.src = url;
          im.className = "exited-thumb";
          im.alt = "Marked-up PNG preview";
          els.exitedThumbs.appendChild(im);
        });
      }

      els.statusDot.className = "status-dot is-ok";
      els.statusText.textContent = `exited 0 · ${n} stroke${n === 1 ? "" : "s"}`;
      els.liveExitPill.className = "exit-pill is-ok";
      els.liveExitPill.textContent = "exit 0";
      els.liveCliOut.innerHTML = `<span class="out-hl">${escapeHtml(jsonLine)}</span>`;
      els.liveMcpResLabel.textContent = res.thumbs.length ? "structuredContent (+ marked PNG attached)" : "structuredContent";
      els.liveMcpRes.innerHTML = highlightJson(res.summary);
      return;
    }

    if (res.kind === "cancelled") {
      els.exitedBadge.className = "exit-badge is-cancel";
      els.exitedBadge.textContent = "exit 1";
      els.exitedTitle.textContent = "Cancelled";
      els.exitedStdout.textContent = "(no output on stdout)";
      const mcpCancel = hero.tool === "draw" ? { cancelled: true } : { choice: "cancelled" };
      els.exitedAgent.textContent = `The agent receives ${JSON.stringify(mcpCancel)} and stops without changing anything.`;
      els.statusDot.className = "status-dot is-cancel";
      els.statusText.textContent = "exited 1 · cancelled";
      els.liveExitPill.className = "exit-pill is-cancel";
      els.liveExitPill.textContent = "exit 1";
      els.liveCliOut.innerHTML = '<span class="dim">(empty)</span>';
      els.liveMcpRes.innerHTML = highlightJson(mcpCancel);
      return;
    }

    if (res.kind === "pick-none") {
      const stdoutLine = `-1\t${res.label}`;
      els.exitedBadge.className = "exit-badge is-ok";
      els.exitedBadge.textContent = "exit 0";
      els.exitedTitle.textContent = "None button clicked";
      els.exitedStdout.textContent = stdoutLine;
      els.exitedAgent.textContent = `The agent receives choice "none" ("${res.label}") and keeps the current setup.`;
      els.statusDot.className = "status-dot is-ok";
      els.statusText.textContent = "exited 0 · none selected";
      els.liveExitPill.className = "exit-pill is-ok";
      els.liveExitPill.textContent = "exit 0";
      els.liveCliOut.innerHTML = `<span class="out-hl">${escapeHtml(stdoutLine)}</span>`;
      els.liveMcpRes.innerHTML = highlightJson({ choice: "none", label: res.label });
      return;
    }

    // pick-option
    const stdoutLine = `${res.index}\t${res.label}`;
    els.exitedBadge.className = "exit-badge is-ok";
    els.exitedBadge.textContent = "exit 0";
    els.exitedTitle.textContent = `Selected item #${res.index}`;
    els.exitedStdout.textContent = stdoutLine;
    els.exitedAgent.textContent = `The agent resumes with index ${res.index} ("${res.label}").`;
    els.statusDot.className = "status-dot is-ok";
    els.statusText.textContent = `exited 0 · option #${res.index}`;
    els.liveExitPill.className = "exit-pill is-ok";
    els.liveExitPill.textContent = "exit 0";
    els.liveCliOut.innerHTML = `<span class="out-hl">${escapeHtml(stdoutLine)}</span>`;
    els.liveMcpRes.innerHTML = highlightJson({ choice: "option", index: res.index, label: res.label });
  }

  function selectHeroDrawColor(c) {
    hero.drawColor = c;
    renderSwatches(els.drawSwatches, hero.drawColor, selectHeroDrawColor);
    renderHeroInspector();
  }

  function renderHero() {
    document.querySelectorAll(".tool-tab").forEach((tab) => {
      const active = tab.dataset.tool === hero.tool;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    renderPresetBar();

    els.pickWin.hidden = hero.tool !== "pick";
    els.drawWin.hidden = hero.tool !== "draw";
    els.viewWin.hidden = hero.tool !== "view";

    if (hero.tool === "pick") {
      const preset = PICK_PRESETS[hero.pickPreset];
      els.pkPrompt.textContent = preset.prompt || "";
      els.pkNone.hidden = !preset.none;
      if (preset.none) els.pkNone.textContent = preset.none;

      const cols = window.innerWidth < 600 ? Math.min(preset.cols, 2) : preset.cols;
      els.pkGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      els.pkGrid.innerHTML = "";
      preset.items.forEach((item, idx) => {
        const tile = renderTileNode(item, idx, idx === hero.sel, (chosenIdx) => {
          hero.sel = chosenIdx;
          const label = item.kind === "image" ? item.cliImage : item.title;
          hero.exited = { kind: "pick-option", index: chosenIdx, label };
          renderHero();
        });
        els.pkGrid.appendChild(tile);
      });
    } else if (hero.tool === "draw") {
      const preset = DRAW_PRESETS[hero.drawPreset];
      els.drawPrompt.textContent = preset.prompt;
      renderSwatches(els.drawSwatches, hero.drawColor, selectHeroDrawColor);
      hero.drawRefs = renderPointerGrid(els.drawGrid, preset.panels, {
        drawable: true,
        strokes: hero.drawStrokes,
        getColor: () => hero.drawColor,
        onStrokesChange: () => renderHeroInspector(),
      });
    } else {
      const preset = VIEW_PRESETS[hero.viewPreset];
      els.viewPrompt.textContent = preset.prompt;
      renderPointerGrid(els.viewGrid, preset.panels, { drawable: false, strokes: [] });
    }

    renderHeroInspector();
  }

  function finishHeroDraw() {
    const preset = DRAW_PRESETS[hero.drawPreset];
    const widths = hero.drawRefs.map((r) => (r.canvas ? r.canvas.getBoundingClientRect().width : 320));
    const summary = buildDrawSummary(preset.panels, hero.drawStrokes, widths, false);
    const thumbs = [];
    preset.panels.forEach((_, i) => {
      if (hero.drawStrokes.some((s) => s.panel === i) && hero.drawRefs[i]?.canvas) {
        const url = compositeMarkedThumb(hero.drawRefs[i].img, hero.drawRefs[i].canvas);
        if (url) thumbs.push(url);
      }
    });
    hero.exited = { kind: "draw-done", summary, thumbs };
    renderHeroInspector();
  }

  function repaintHeroDraw() {
    hero.drawRefs.forEach((r, idx) => {
      if (r.canvas) paintOverlayCanvas(r.canvas, hero.drawStrokes, idx);
    });
    renderHeroInspector();
  }

  function selectHeroTool(tool) {
    hero.tool = tool;
    hero.exited = null;
    if (tool === "draw") hero.drawColor = DRAW_PRESETS[hero.drawPreset].color;
    renderHero();
  }

  document.querySelectorAll(".tool-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectHeroTool(tab.dataset.tool));
  });

  els.pkNone.addEventListener("click", (e) => {
    e.stopPropagation();
    const preset = PICK_PRESETS[hero.pickPreset];
    hero.exited = { kind: "pick-none", label: preset.none };
    renderHeroInspector();
  });

  els.drawUndo.addEventListener("click", () => {
    if (!hero.drawStrokes.length) return;
    hero.drawStrokes.pop();
    repaintHeroDraw();
  });

  els.drawClear.addEventListener("click", () => {
    hero.drawStrokes = [];
    repaintHeroDraw();
  });

  els.drawDone.addEventListener("click", finishHeroDraw);

  els.viewClose.addEventListener("click", () => {
    hero.exited = { kind: "view-closed" };
    renderHeroInspector();
  });

  els.replayBtn.addEventListener("click", () => {
    hero.exited = null;
    if (hero.tool === "draw") hero.drawStrokes = [];
    renderHero();
    els.canvas.focus({ preventScroll: true });
  });

  els.nextToolBtn.addEventListener("click", () => {
    const next = TOOL_ORDER[(TOOL_ORDER.indexOf(hero.tool) + 1) % TOOL_ORDER.length];
    selectHeroTool(next);
  });

  els.copyLiveCli.addEventListener("click", () => copyText(currentHeroCli(), els.copyLiveCli));

  document.querySelectorAll(".inspector .inspector-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.view;
      hero.view = view;
      document.querySelectorAll(".inspector .inspector-tab").forEach((t) => {
        const active = t.dataset.view === view;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });
      document.getElementById("inspector-cli-pane").hidden = view !== "cli";
      document.getElementById("inspector-mcp-pane").hidden = view !== "mcp";
    });
  });

  document.getElementById("focus-demo-btn").addEventListener("click", () => {
    els.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => els.canvas.focus({ preventScroll: true }), 260);
  });

  // Keyboard shortcuts matching src/picker/picker.c3 & src/pointer/pointer.c3
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const rect = els.canvas.getBoundingClientRect();
    const inView = rect.bottom > 80 && rect.top < window.innerHeight - 80;
    if (!inView && document.activeElement !== els.canvas) return;

    if (hero.exited) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        hero.exited = null;
        if (hero.tool === "draw") hero.drawStrokes = [];
        renderHero();
      }
      return;
    }

    if (hero.tool === "view") {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.key === "q") {
        e.preventDefault();
        hero.exited = { kind: "view-closed" };
        renderHeroInspector();
      }
      return;
    }

    if (hero.tool === "draw") {
      if (e.key >= "1" && e.key <= "5") {
        selectHeroDrawColor(Number(e.key) - 1);
      } else if (e.key === "u" || e.key === "Backspace" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        if (hero.drawStrokes.length) {
          hero.drawStrokes.pop();
          repaintHeroDraw();
        }
      } else if (e.key === "c") {
        hero.drawStrokes = [];
        repaintHeroDraw();
      } else if (e.key === "Enter" && (document.activeElement === els.canvas || document.activeElement === document.body)) {
        e.preventDefault();
        finishHeroDraw();
      } else if (e.key === "Escape" || e.key === "q") {
        e.preventDefault();
        hero.exited = { kind: "cancelled" };
        renderHeroInspector();
      }
      return;
    }

    // pick tool navigation
    const preset = PICK_PRESETS[hero.pickPreset];
    const n = preset.items.length;
    const perRow = window.innerWidth < 600 ? Math.min(preset.cols, 2) : preset.cols;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        els.canvas.focus({ preventScroll: true });
        if (hero.sel > 0) hero.sel--;
        renderHero();
        break;
      case "ArrowRight":
        e.preventDefault();
        els.canvas.focus({ preventScroll: true });
        if (hero.sel < n - 1) hero.sel++;
        renderHero();
        break;
      case "ArrowUp":
        e.preventDefault();
        els.canvas.focus({ preventScroll: true });
        if (hero.sel >= perRow) hero.sel -= perRow;
        renderHero();
        break;
      case "ArrowDown":
        e.preventDefault();
        els.canvas.focus({ preventScroll: true });
        if (hero.sel + perRow < n) hero.sel += perRow;
        renderHero();
        break;
      case "Enter":
        if (document.activeElement === els.canvas || document.activeElement === document.body) {
          e.preventDefault();
          const item = preset.items[hero.sel];
          if (item) {
            hero.exited = { kind: "pick-option", index: hero.sel, label: item.kind === "image" ? item.cliImage : item.title };
            renderHero();
          }
        }
        break;
      case "Escape":
      case "q":
        e.preventDefault();
        hero.exited = { kind: "cancelled" };
        renderHeroInspector();
        break;
    }
  });

  // Header drag across all 3 hero windows
  let dragStart = null;
  document.querySelectorAll("[data-drag-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      dragStart = { startX: e.clientX, startY: e.clientY, origX: hero.dragX, origY: hero.dragY };
      activeHeroWindow().classList.add("is-dragging");
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragStart) return;
      hero.dragX = Math.max(-140, Math.min(140, dragStart.origX + (e.clientX - dragStart.startX)));
      hero.dragY = Math.max(-60, Math.min(60, dragStart.origY + (e.clientY - dragStart.startY)));
      applyWindowTransform();
    });
    const endDrag = () => {
      if (!dragStart) return;
      dragStart = null;
      els.pickWin.classList.remove("is-dragging");
      els.drawWin.classList.remove("is-dragging");
      els.viewWin.classList.remove("is-dragging");
    };
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    handle.addEventListener("dblclick", () => {
      hero.dragX = 0;
      hero.dragY = 0;
      applyWindowTransform();
    });
  });

  els.recenterBtn.addEventListener("click", () => {
    hero.dragX = 0;
    hero.dragY = 0;
    applyWindowTransform();
  });

  // =========================================================================
  // 2. 3-TOOL INTERACTIVE PLAYGROUND
  // =========================================================================
  const SAMPLE_IMAGES = [ART.monolith, ART.prism, ART.topo];

  const pg = {
    tool: "pick", // "pick" | "draw" | "view"
    tab: "cli",
    pick: {
      prompt: "Which splash render should we bundle?",
      cols: 3,
      width: 100,
      noneEnabled: true,
      none: "Keep current",
      sel: 0,
      items: [
        { kind: "card", image: ART.monolith.src, cliImage: "build/renders/monolith.png", title: "Monolith", desc: "Rim-light shader" },
        { kind: "card", image: ART.prism.src, cliImage: "build/renders/prism.png", title: "Prism", desc: "Raymarched glass" },
        { kind: "card", image: ART.topo.src, cliImage: "build/renders/topo.png", title: "Topographic", desc: "Heightmap contours" },
      ],
    },
    draw: {
      prompt: "Circle what needs fixing",
      color: 2,
      points: false,
      strokes: [],
      refs: [],
      panels: [
        { src: ART.prism.src, path: ART.prism.path, w: 720, h: 720, title: "Refraction Prism", desc: "Main lighting pass" },
        { src: ART.topo.src, path: ART.topo.path, w: 720, h: 720, title: "Terrain", desc: "Contour detail" },
      ],
    },
    view: {
      prompt: "Latest render pass",
      panels: [
        { src: ART.monolith.src, path: ART.monolith.path, w: 720, h: 720, title: "Before", desc: "Ambient mist" },
        { src: ART.prism.src, path: ART.prism.path, w: 720, h: 720, title: "After", desc: "Caustic beam" },
      ],
    },
  };

  const pgEls = {
    prompt: document.getElementById("pg-prompt"),
    pickOnly: document.getElementById("pg-pick-only"),
    drawOnly: document.getElementById("pg-draw-only"),
    cols: document.getElementById("pg-cols"),
    width: document.getElementById("pg-width"),
    noneEnabled: document.getElementById("pg-none-enabled"),
    none: document.getElementById("pg-none"),
    colorSwatches: document.getElementById("pg-color-swatches"),
    points: document.getElementById("pg-points"),
    itemsHeading: document.getElementById("pg-items-heading"),
    addPickGroup: document.getElementById("pg-add-pick-group"),
    addPanelGroup: document.getElementById("pg-add-panel-group"),
    addText: document.getElementById("pg-add-text"),
    addImage: document.getElementById("pg-add-image"),
    addCard: document.getElementById("pg-add-card"),
    addPanel: document.getElementById("pg-add-panel"),
    itemsList: document.getElementById("pg-items-list"),
    pkPrompt: document.getElementById("pg-pk-prompt"),
    pkSub: document.getElementById("pg-pk-sub"),
    pkNone: document.getElementById("pg-pk-none"),
    pkGrid: document.getElementById("pg-pk-grid"),
    ptrFooter: document.getElementById("pg-ptr-footer"),
    previewSwatches: document.getElementById("pg-preview-swatches"),
    previewClear: document.getElementById("pg-preview-clear"),
    previewDone: document.getElementById("pg-preview-done"),
    toast: document.getElementById("pg-toast"),
    codeOut: document.getElementById("pg-code-output"),
    copyBtn: document.getElementById("pg-copy-btn"),
  };

  function renderPgCode() {
    if (pg.tool === "pick") {
      const cfg = {
        prompt: pg.pick.prompt.trim(),
        cols: pg.pick.cols,
        width: Math.max(30, parseInt(pg.pick.width, 10) || 100),
        none: pg.pick.noneEnabled ? pg.pick.none.trim() : "",
        items: pg.pick.items,
      };
      if (pg.tab === "cli") {
        pgEls.codeOut.textContent = buildPickCli(cfg, true);
      } else {
        pgEls.codeOut.innerHTML = highlightJson(buildPickMcpArgs(cfg));
      }
    } else if (pg.tool === "draw") {
      const cfg = { prompt: pg.draw.prompt.trim(), color: pg.draw.color, points: pg.draw.points, panels: pg.draw.panels };
      if (pg.tab === "cli") {
        pgEls.codeOut.textContent = buildPointerCli("pointer", cfg, true);
      } else {
        pgEls.codeOut.innerHTML = highlightJson(buildPointerMcpArgs(true, cfg));
      }
    } else {
      const cfg = { prompt: pg.view.prompt.trim(), panels: pg.view.panels };
      if (pg.tab === "cli") {
        pgEls.codeOut.textContent = buildPointerCli("view", cfg, true);
      } else {
        pgEls.codeOut.innerHTML = highlightJson(buildPointerMcpArgs(false, cfg));
      }
    }
  }

  function selectPgDrawColor(c) {
    pg.draw.color = c;
    renderSwatches(pgEls.colorSwatches, pg.draw.color, selectPgDrawColor);
    renderSwatches(pgEls.previewSwatches, pg.draw.color, selectPgDrawColor);
    renderPgCode();
  }

  function renderPgEditor() {
    pgEls.pickOnly.hidden = pg.tool !== "pick";
    pgEls.drawOnly.hidden = pg.tool !== "draw";
    pgEls.addPickGroup.hidden = pg.tool !== "pick";
    pgEls.addPanelGroup.hidden = pg.tool === "pick";
    pgEls.itemsList.innerHTML = "";

    if (pg.tool === "pick") {
      pgEls.prompt.value = pg.pick.prompt;
      pgEls.itemsHeading.innerHTML = `Items (<span id="pg-item-count">${pg.pick.items.length}</span>)`;

      pg.pick.items.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "pg-item-row";

        const head = document.createElement("div");
        head.className = "pg-item-head";
        const kind = document.createElement("span");
        kind.className = "pg-item-kind";
        kind.textContent = `#${idx} · --${item.kind}`;
        head.appendChild(kind);

        if (pg.pick.items.length > 1) {
          const del = document.createElement("button");
          del.type = "button";
          del.className = "pg-item-del";
          del.textContent = "Remove";
          del.addEventListener("click", () => {
            pg.pick.items.splice(idx, 1);
            if (pg.pick.sel >= pg.pick.items.length) pg.pick.sel = Math.max(0, pg.pick.items.length - 1);
            renderPlayground();
          });
          head.appendChild(del);
        }
        row.appendChild(head);

        if (item.kind === "image") {
          const pathIn = document.createElement("input");
          pathIn.type = "text";
          pathIn.value = item.cliImage || "";
          pathIn.placeholder = "/path/to/image.png";
          pathIn.addEventListener("input", () => {
            item.cliImage = pathIn.value;
            renderPgPreview();
            renderPgCode();
          });
          row.appendChild(pathIn);
        } else {
          const titleIn = document.createElement("input");
          titleIn.type = "text";
          titleIn.value = item.title || "";
          titleIn.placeholder = "Title / label";
          titleIn.addEventListener("input", () => {
            item.title = titleIn.value;
            renderPgPreview();
            renderPgCode();
          });
          row.appendChild(titleIn);
        }

        if (item.kind === "card") {
          const descIn = document.createElement("input");
          descIn.type = "text";
          descIn.value = item.desc || "";
          descIn.placeholder = "Description (optional)";
          descIn.addEventListener("input", () => {
            item.desc = descIn.value;
            renderPgPreview();
            renderPgCode();
          });
          row.appendChild(descIn);
        }

        pgEls.itemsList.appendChild(row);
      });
      return;
    }

    // draw or view panels editor (1–4 images)
    const state = pg.tool === "draw" ? pg.draw : pg.view;
    pgEls.prompt.value = state.prompt;
    pgEls.itemsHeading.innerHTML = `Images (<span id="pg-item-count">${state.panels.length}/4</span>)`;
    pgEls.addPanel.disabled = state.panels.length >= 4;

    if (pg.tool === "draw") {
      pgEls.points.checked = pg.draw.points;
      renderSwatches(pgEls.colorSwatches, pg.draw.color, selectPgDrawColor);
    }

    state.panels.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "pg-item-row";

      const head = document.createElement("div");
      head.className = "pg-item-head";
      const kind = document.createElement("span");
      kind.className = "pg-item-kind";
      kind.textContent = `image #${idx}`;
      head.appendChild(kind);

      if (state.panels.length > 1) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "pg-item-del";
        del.textContent = "Remove";
        del.addEventListener("click", () => {
          state.panels.splice(idx, 1);
          if (pg.tool === "draw") pg.draw.strokes = [];
          renderPlayground();
        });
        head.appendChild(del);
      }
      row.appendChild(head);

      const pathIn = document.createElement("input");
      pathIn.type = "text";
      pathIn.value = p.path;
      pathIn.placeholder = "/path/to/image.png";
      pathIn.addEventListener("input", () => {
        p.path = pathIn.value;
        renderPgCode();
      });
      row.appendChild(pathIn);

      const titleIn = document.createElement("input");
      titleIn.type = "text";
      titleIn.value = p.title;
      titleIn.placeholder = "--label (optional caption title)";
      titleIn.addEventListener("input", () => {
        p.title = titleIn.value;
        renderPgPreview();
        renderPgCode();
      });
      row.appendChild(titleIn);

      const descIn = document.createElement("input");
      descIn.type = "text";
      descIn.value = p.desc;
      descIn.placeholder = "--desc (optional caption text)";
      descIn.addEventListener("input", () => {
        p.desc = descIn.value;
        renderPgPreview();
        renderPgCode();
      });
      row.appendChild(descIn);

      pgEls.itemsList.appendChild(row);
    });
  }

  function renderPgPreview() {
    if (pg.tool === "pick") {
      pgEls.pkPrompt.textContent = pg.pick.prompt.trim();
      pgEls.pkSub.textContent = "Click to choose  ·  arrows + enter  ·  esc to cancel";
      const noneLbl = pg.pick.noneEnabled ? pg.pick.none.trim() : "";
      pgEls.pkNone.hidden = !noneLbl;
      if (noneLbl) pgEls.pkNone.textContent = noneLbl;
      pgEls.ptrFooter.hidden = true;

      const cols = window.innerWidth < 600 ? Math.min(pg.pick.cols, 2) : pg.pick.cols;
      pgEls.pkGrid.className = "pk-grid";
      pgEls.pkGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      pgEls.pkGrid.innerHTML = "";
      pg.pick.items.forEach((item, idx) => {
        const tile = renderTileNode(item, idx, idx === pg.pick.sel, (clickedIdx) => {
          pg.pick.sel = clickedIdx;
          const label = item.kind === "image" ? (item.cliImage || item.image) : (item.title || "");
          pgEls.toast.innerHTML = `stdout → <strong>${clickedIdx}\\t${escapeHtml(label)}</strong> (exit 0)`;
          renderPgPreview();
        });
        pgEls.pkGrid.appendChild(tile);
      });
      return;
    }

    if (pg.tool === "draw") {
      pgEls.pkPrompt.textContent = pg.draw.prompt.trim();
      pgEls.pkSub.textContent = "Draw on the images  ·  1-5 colour  ·  u undo  ·  c clear  ·  enter done  ·  esc cancel";
      pgEls.pkNone.hidden = true;
      pgEls.ptrFooter.hidden = false;
      pgEls.pkGrid.style.gridTemplateColumns = "";

      renderSwatches(pgEls.previewSwatches, pg.draw.color, selectPgDrawColor);

      pg.draw.refs = renderPointerGrid(pgEls.pkGrid, pg.draw.panels, {
        drawable: true,
        strokes: pg.draw.strokes,
        getColor: () => pg.draw.color,
        onStrokesChange: () => {
          const n = pg.draw.strokes.length;
          pgEls.toast.innerHTML = n
            ? `<strong>${n} stroke${n === 1 ? "" : "s"}</strong> drawn — click Done to inspect JSON output.`
            : "Draw directly on the preview images, then click Done.";
        },
      });
      return;
    }

    // view
    pgEls.pkPrompt.textContent = pg.view.prompt.trim();
    pgEls.pkSub.textContent = "esc, enter or space to close";
    pgEls.pkNone.hidden = true;
    pgEls.ptrFooter.hidden = true;
    pgEls.pkGrid.style.gridTemplateColumns = "";
    renderPointerGrid(pgEls.pkGrid, pg.view.panels, { drawable: false, strokes: [] });
    pgEls.toast.innerHTML = 'MCP returns <strong>{"shown":true}</strong> immediately; CLI prints nothing.';
  }

  function renderPlayground() {
    document.querySelectorAll("[data-pg-tool]").forEach((btn) => {
      const active = btn.dataset.pgTool === pg.tool;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    renderPgEditor();
    renderPgPreview();
    renderPgCode();
  }

  document.querySelectorAll("[data-pg-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pg.tool = btn.dataset.pgTool;
      if (pg.tool === "pick") pgEls.toast.textContent = "Click any tile in the preview to see its output.";
      if (pg.tool === "draw") pgEls.toast.textContent = "Draw directly on the preview images, then click Done.";
      renderPlayground();
    });
  });

  pgEls.prompt.addEventListener("input", () => {
    pg[pg.tool].prompt = pgEls.prompt.value;
    pgEls.pkPrompt.textContent = pgEls.prompt.value.trim();
    renderPgCode();
  });

  pgEls.width.addEventListener("input", () => {
    pg.pick.width = parseInt(pgEls.width.value, 10) || 100;
    renderPgCode();
  });

  pgEls.noneEnabled.addEventListener("change", () => {
    pg.pick.noneEnabled = pgEls.noneEnabled.checked;
    pgEls.none.disabled = !pg.pick.noneEnabled;
    renderPgPreview();
    renderPgCode();
  });

  pgEls.none.addEventListener("input", () => {
    pg.pick.none = pgEls.none.value;
    renderPgPreview();
    renderPgCode();
  });

  pgEls.points.addEventListener("change", () => {
    pg.draw.points = pgEls.points.checked;
    renderPgCode();
  });

  pgEls.cols.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      pg.pick.cols = parseInt(btn.dataset.cols, 10);
      pgEls.cols.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderPgPreview();
      renderPgCode();
    });
  });

  pgEls.pkNone.addEventListener("click", () => {
    pgEls.toast.innerHTML = `stdout → <strong>-1\\t${escapeHtml(pg.pick.none.trim())}</strong> (exit 0)`;
  });

  pgEls.previewClear.addEventListener("click", () => {
    pg.draw.strokes = [];
    pg.draw.refs.forEach((r, idx) => {
      if (r.canvas) paintOverlayCanvas(r.canvas, pg.draw.strokes, idx);
    });
    pgEls.toast.textContent = "Cleared strokes.";
  });

  pgEls.previewDone.addEventListener("click", () => {
    const widths = pg.draw.refs.map((r) => (r.canvas ? r.canvas.getBoundingClientRect().width : 280));
    const summary = buildDrawSummary(pg.draw.panels, pg.draw.strokes, widths, pg.draw.points);
    pgEls.toast.innerHTML = `stdout → <strong>${escapeHtml(JSON.stringify(summary))}</strong>`;
  });

  pgEls.addText.addEventListener("click", () => {
    if (pg.pick.items.length >= 9) return;
    pg.pick.items.push({ kind: "text", title: `Option ${pg.pick.items.length + 1}` });
    renderPlayground();
  });

  pgEls.addImage.addEventListener("click", () => {
    if (pg.pick.items.length >= 9) return;
    const s = SAMPLE_IMAGES[pg.pick.items.length % SAMPLE_IMAGES.length];
    pg.pick.items.push({ kind: "image", image: s.src, cliImage: s.path });
    renderPlayground();
  });

  pgEls.addCard.addEventListener("click", () => {
    if (pg.pick.items.length >= 9) return;
    const s = SAMPLE_IMAGES[pg.pick.items.length % SAMPLE_IMAGES.length];
    pg.pick.items.push({ kind: "card", image: s.src, cliImage: s.path, title: `Variant ${pg.pick.items.length + 1}`, desc: "Custom card option" });
    renderPlayground();
  });

  pgEls.addPanel.addEventListener("click", () => {
    const state = pg.tool === "draw" ? pg.draw : pg.view;
    if (state.panels.length >= 4) return;
    const s = SAMPLE_IMAGES[state.panels.length % SAMPLE_IMAGES.length];
    state.panels.push({ src: s.src, path: s.path, w: s.w, h: s.h, title: `Image ${state.panels.length + 1}`, desc: "" });
    renderPlayground();
  });

  document.querySelectorAll("[data-pg-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      pg.tab = tab.dataset.pgTab;
      document.querySelectorAll("[data-pg-tab]").forEach((t) => t.classList.toggle("is-active", t === tab));
      renderPgCode();
    });
  });

  pgEls.copyBtn.addEventListener("click", () => {
    let text;
    if (pg.tool === "pick") {
      const cfg = {
        prompt: pg.pick.prompt.trim(),
        cols: pg.pick.cols,
        width: Math.max(30, parseInt(pg.pick.width, 10) || 100),
        none: pg.pick.noneEnabled ? pg.pick.none.trim() : "",
        items: pg.pick.items,
      };
      text = pg.tab === "cli" ? buildPickCli(cfg, false) : JSON.stringify(buildPickMcpArgs(cfg), null, 2);
    } else if (pg.tool === "draw") {
      const cfg = { prompt: pg.draw.prompt.trim(), color: pg.draw.color, points: pg.draw.points, panels: pg.draw.panels };
      text = pg.tab === "cli" ? buildPointerCli("pointer", cfg, false) : JSON.stringify(buildPointerMcpArgs(true, cfg), null, 2);
    } else {
      const cfg = { prompt: pg.view.prompt.trim(), panels: pg.view.panels };
      text = pg.tab === "cli" ? buildPointerCli("view", cfg, false) : JSON.stringify(buildPointerMcpArgs(false, cfg), null, 2);
    }
    copyText(text, pgEls.copyBtn);
  });

  // =========================================================================
  // 3. MCP PROTOCOL TRACE STEPPER
  // =========================================================================
  const traceReqEl = document.getElementById("trace-req");
  const traceResEl = document.getElementById("trace-res");
  const traceCallSwitcher = document.getElementById("trace-call-switcher");
  let traceStep = "init";
  let traceCallTool = "pick";

  function renderTrace() {
    const isCall = traceStep === "call";
    traceCallSwitcher.hidden = !isCall;
    const data = isCall ? MCP_TRACES.calls[traceCallTool] : MCP_TRACES[traceStep];
    traceReqEl.innerHTML = highlightJson(data.req);
    traceResEl.innerHTML = highlightJson(data.res);

    document.querySelectorAll(".trace-step").forEach((btn) => {
      const active = btn.dataset.trace === traceStep;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-trace-tool]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.traceTool === traceCallTool);
    });
  }

  document.querySelectorAll(".trace-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      traceStep = btn.dataset.trace;
      renderTrace();
    });
  });

  document.querySelectorAll("[data-trace-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      traceCallTool = btn.dataset.traceTool;
      renderTrace();
    });
  });

  // =========================================================================
  // 4. SUPPORTED CLIENTS ("WORKS IN" + MCP SWITCHER)
  // =========================================================================
  const worksInList = document.getElementById("works-in-list");
  const mcpSwitcher = document.getElementById("mcp-client-switcher");
  const mcpCliCard = document.getElementById("mcp-cli-card");
  const mcpCliLabel = document.getElementById("mcp-cli-label");
  const mcpCliCode = document.getElementById("mcp-cli-code");
  const mcpConfigLabel = document.getElementById("mcp-config-label");
  const mcpConfigCode = document.getElementById("mcp-config-code");
  const copyMcpCliBtn = document.getElementById("copy-mcp-cli");
  const copyMcpJsonBtn = document.getElementById("copy-mcp-json");

  let activeClient = MCP_CLIENTS[0];

  function selectMcpClient(clientId) {
    const found = MCP_CLIENTS.find((c) => c.id === clientId) || MCP_CLIENTS[0];
    activeClient = found;

    mcpSwitcher.querySelectorAll(".client-tab").forEach((btn) => {
      const active = btn.dataset.client === found.id;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    if (found.cli) {
      mcpCliCard.hidden = false;
      mcpCliLabel.textContent = found.cliLabel;
      mcpCliCode.textContent = found.cli;
    } else {
      mcpCliCard.hidden = true;
    }

    mcpConfigLabel.textContent = found.configLabel;
    if (found.isJson) {
      mcpConfigCode.innerHTML = highlightJson(found.config);
    } else {
      mcpConfigCode.textContent = found.config;
    }
  }

  MCP_CLIENTS.forEach((client) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "client-pill";
    pill.title = `Show ${client.name} MCP config`;
    pill.innerHTML = `<img src="${client.logo}" alt="" aria-hidden="true" /><span>${client.name}</span>`;
    pill.addEventListener("click", () => {
      selectMcpClient(client.id);
      document.getElementById("mcp").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    worksInList.appendChild(pill);

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "client-tab";
    tab.role = "tab";
    tab.dataset.client = client.id;
    tab.innerHTML = `<img src="${client.logo}" alt="" aria-hidden="true" /><span>${client.name}</span>`;
    tab.addEventListener("click", () => selectMcpClient(client.id));
    mcpSwitcher.appendChild(tab);
  });

  copyMcpCliBtn.addEventListener("click", () => {
    if (activeClient.cli) copyText(activeClient.cli, copyMcpCliBtn);
  });

  copyMcpJsonBtn.addEventListener("click", () => {
    copyText(activeClient.config, copyMcpJsonBtn);
  });

  // Re-layout & repaint canvases cleanly on viewport resize
  window.addEventListener("resize", () => {
    if (hero.tool === "pick") renderHero();
    if (hero.tool === "draw") repaintHeroDraw();
    if (pg.tool === "pick") renderPgPreview();
    if (pg.tool === "draw") {
      pg.draw.refs.forEach((r, idx) => {
        if (r.canvas) paintOverlayCanvas(r.canvas, pg.draw.strokes, idx);
      });
    }
  });

  // Initial render
  renderHero();
  renderPlayground();
  renderTrace();
  selectMcpClient("claude");
})();
