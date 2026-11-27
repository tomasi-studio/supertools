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

  const IS_MAC =
    (navigator.userAgentData && navigator.userAgentData.platform
      ? /mac/i.test(navigator.userAgentData.platform)
      : /mac/i.test(navigator.platform || navigator.userAgent || "")) &&
    !/iphone|ipad|ipod/i.test(navigator.userAgent || "");

  const SUPERTOOLS_BIN = IS_MAC ? "/opt/homebrew/bin/supertools" : "/path/to/supertools";

  // Agents & editors that support local stdio MCP servers
  const MCP_CLIENTS = [
    {
      id: "claude",
      name: "Claude Code",
      logo: "assets/logos/claude.svg",
      cliLabel: "Claude Code CLI",
      cli: `claude mcp add supertools -- ${SUPERTOOLS_BIN} --mcp`,
      configLabel: ".mcp.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
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
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
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
      cli: `codex mcp add supertools -- ${SUPERTOOLS_BIN} --mcp`,
      configLabel: "~/.codex/config.toml",
      config: `[mcp_servers.supertools]\ncommand = "${SUPERTOOLS_BIN}"\nargs = ["--mcp"]`,
      isJson: false,
    },
    {
      id: "pi",
      name: "Pi",
      logo: "assets/logos/pi.svg",
      cliLabel: "Pi MCP adapter",
      cli: "pi install npm:pi-mcp-adapter",
      configLabel: "~/.pi/agent/mcp.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "cursor",
      name: "Cursor",
      logo: "assets/logos/cursor.svg",
      configLabel: "~/.cursor/mcp.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
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
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
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
        { mcp: { supertools: { type: "local", command: [SUPERTOOLS_BIN, "--mcp"], enabled: true } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "amp",
      name: "Amp",
      logo: "assets/logos/amp.svg",
      cliLabel: "Amp CLI",
      cli: `amp mcp add supertools -- ${SUPERTOOLS_BIN} --mcp`,
      configLabel: "~/.config/amp/settings.json",
      config: JSON.stringify(
        { "amp.mcpServers": { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "windsurf",
      name: "Windsurf",
      logo: "assets/logos/windsurf.svg",
      configLabel: "~/.codeium/windsurf/mcp_config.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
    {
      id: "cline",
      name: "Cline",
      logo: "assets/logos/cline.svg",
      configLabel: "cline_mcp_settings.json",
      config: JSON.stringify(
        { mcpServers: { supertools: { command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
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
        { context_servers: { supertools: { command: { path: SUPERTOOLS_BIN, args: ["--mcp"] } } } },
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
        { servers: { supertools: { type: "stdio", command: SUPERTOOLS_BIN, args: ["--mcp"] } } },
        null,
        2
      ),
      isJson: true,
    },
  ];

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

  function highlightShell(cmd) {
    return cmd
      .split("\n")
      .map((line) => {
        if (/^\s*#/.test(line)) return `<span class="dim">${escapeHtml(line)}</span>`;
        const trimmed = line.trimStart();
        const isContinuation = trimmed.startsWith("-") || line.startsWith("  ");
        let tokenIdx = 0;
        return line.replace(
          /("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\\$|--?[a-zA-Z0-9-]+|\S+)/g,
          (tok) => {
            const esc = escapeHtml(tok);
            const idx = tokenIdx++;
            if (tok === "\\" || tok === "--") return `<span class="dim">${esc}</span>`;
            if (!isContinuation && idx === 0) return `<span class="tok-key">${esc}</span>`;
            if (!isContinuation && idx === 1 && !tok.startsWith("-")) return `<span class="tok-bool">${esc}</span>`;
            if (tok.startsWith("-")) return `<span class="tok-key">${esc}</span>`;
            if (tok.startsWith('"') || tok.startsWith("'")) return `<span class="tok-str">${esc}</span>`;
            if (/^\d+$/.test(tok)) return `<span class="tok-num">${esc}</span>`;
            return `<span class="tok-str">${esc}</span>`;
          }
        );
      })
      .join("\n");
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
  // 1. 3-TOOL INTERACTIVE EXAMPLES
  // =========================================================================
  const pg = {
    tool: "pick", // "pick" | "draw" | "view"
    tab: "cli",
    pickPreset: "artwork",
    drawPreset: "single",
    viewPreset: "pair",
    sel: 0,
    drawColor: 2,
    drawStrokes: [],
    drawRefs: [],
  };

  const pgEls = {
    presetTabs: document.getElementById("pg-preset-tabs"),
    pkPrompt: document.getElementById("pg-pk-prompt"),
    pkSub: document.getElementById("pg-pk-sub"),
    pkNone: document.getElementById("pg-pk-none"),
    pkGrid: document.getElementById("pg-pk-grid"),
    ptrFooter: document.getElementById("pg-ptr-footer"),
    previewSwatches: document.getElementById("pg-preview-swatches"),
    previewUndo: document.getElementById("pg-preview-undo"),
    previewClear: document.getElementById("pg-preview-clear"),
    previewDone: document.getElementById("pg-preview-done"),
    toast: document.getElementById("pg-toast"),
    codeOut: document.getElementById("pg-code-output"),
    copyBtn: document.getElementById("pg-copy-btn"),
  };

  function currentPgConfig() {
    if (pg.tool === "pick") return PICK_PRESETS[pg.pickPreset];
    if (pg.tool === "draw") return { ...DRAW_PRESETS[pg.drawPreset], color: pg.drawColor };
    return VIEW_PRESETS[pg.viewPreset];
  }

  function resetPgToast() {
    if (pg.tool === "pick") {
      pgEls.toast.textContent = "Click any tile in the preview to see its output.";
    } else if (pg.tool === "draw") {
      pgEls.toast.textContent = "Draw directly on the preview images, then click Done.";
    } else {
      pgEls.toast.innerHTML = 'MCP returns <strong>{"shown":true}</strong> immediately; CLI prints nothing.';
    }
  }

  function renderPgPresets() {
    const map = pg.tool === "pick" ? PICK_PRESETS : pg.tool === "draw" ? DRAW_PRESETS : VIEW_PRESETS;
    const currentKey = pg.tool === "pick" ? pg.pickPreset : pg.tool === "draw" ? pg.drawPreset : pg.viewPreset;

    pgEls.presetTabs.innerHTML = "";
    Object.entries(map).forEach(([key, preset]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-tab" + (key === currentKey ? " is-active" : "");
      btn.role = "tab";
      btn.setAttribute("aria-selected", String(key === currentKey));
      btn.innerHTML = `${escapeHtml(preset.label)} <span class="flag-pill">${escapeHtml(preset.pill)}</span>`;
      btn.addEventListener("click", () => {
        if (pg.tool === "pick") {
          pg.pickPreset = key;
          pg.sel = 0;
        } else if (pg.tool === "draw") {
          pg.drawPreset = key;
          pg.drawColor = DRAW_PRESETS[key].color;
          pg.drawStrokes = [];
        } else {
          pg.viewPreset = key;
        }
        resetPgToast();
        renderPlayground();
      });
      pgEls.presetTabs.appendChild(btn);
    });
  }

  function renderPgCode() {
    const cfg = currentPgConfig();
    if (pg.tool === "pick") {
      if (pg.tab === "cli") {
        pgEls.codeOut.innerHTML = highlightShell(buildPickCli(cfg, true));
      } else {
        pgEls.codeOut.innerHTML = highlightJson(buildPickMcpArgs(cfg));
      }
    } else if (pg.tool === "draw") {
      if (pg.tab === "cli") {
        pgEls.codeOut.innerHTML = highlightShell(buildPointerCli("pointer", cfg, true));
      } else {
        pgEls.codeOut.innerHTML = highlightJson(buildPointerMcpArgs(true, cfg));
      }
    } else {
      if (pg.tab === "cli") {
        pgEls.codeOut.innerHTML = highlightShell(buildPointerCli("view", cfg, true));
      } else {
        pgEls.codeOut.innerHTML = highlightJson(buildPointerMcpArgs(false, cfg));
      }
    }
  }

  function selectPgDrawColor(c) {
    pg.drawColor = c;
    renderSwatches(pgEls.previewSwatches, pg.drawColor, selectPgDrawColor);
    renderPgCode();
  }

  function repaintPgDraw() {
    pg.drawRefs.forEach((r, idx) => {
      if (r.canvas) paintOverlayCanvas(r.canvas, pg.drawStrokes, idx);
    });
    const n = pg.drawStrokes.length;
    pgEls.toast.innerHTML = n
      ? `<strong>${n} stroke${n === 1 ? "" : "s"}</strong> drawn — click Done to inspect JSON output.`
      : "Draw directly on the preview images, then click Done.";
  }

  function renderPgPreview() {
    const cfg = currentPgConfig();

    if (pg.tool === "pick") {
      pgEls.pkPrompt.textContent = cfg.prompt || "";
      pgEls.pkSub.textContent = "Click to choose  ·  arrows + enter  ·  esc to cancel";
      pgEls.pkNone.hidden = !cfg.none;
      if (cfg.none) pgEls.pkNone.textContent = cfg.none;
      pgEls.ptrFooter.hidden = true;

      const cols = window.innerWidth < 600 ? Math.min(cfg.cols, 2) : cfg.cols;
      pgEls.pkGrid.className = "pk-grid";
      pgEls.pkGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      pgEls.pkGrid.innerHTML = "";
      cfg.items.forEach((item, idx) => {
        const tile = renderTileNode(item, idx, idx === pg.sel, (clickedIdx) => {
          pg.sel = clickedIdx;
          const label = item.kind === "image" ? (item.cliImage || item.image) : (item.title || "");
          pgEls.toast.innerHTML = `stdout → <strong>${clickedIdx} ${escapeHtml(label)}</strong>`;
          renderPgPreview();
        });
        pgEls.pkGrid.appendChild(tile);
      });
      return;
    }

    if (pg.tool === "draw") {
      pgEls.pkPrompt.textContent = cfg.prompt;
      pgEls.pkSub.textContent = "Draw on the images  ·  1-5 colour  ·  u undo  ·  c clear  ·  enter done  ·  esc cancel";
      pgEls.pkNone.hidden = true;
      pgEls.ptrFooter.hidden = false;
      pgEls.pkGrid.style.gridTemplateColumns = "";

      renderSwatches(pgEls.previewSwatches, pg.drawColor, selectPgDrawColor);

      pg.drawRefs = renderPointerGrid(pgEls.pkGrid, cfg.panels, {
        drawable: true,
        strokes: pg.drawStrokes,
        getColor: () => pg.drawColor,
        onStrokesChange: () => {
          const n = pg.drawStrokes.length;
          pgEls.toast.innerHTML = n
            ? `<strong>${n} stroke${n === 1 ? "" : "s"}</strong> drawn — click Done to inspect JSON output.`
            : "Draw directly on the preview images, then click Done.";
        },
      });
      return;
    }

    // view
    pgEls.pkPrompt.textContent = cfg.prompt;
    pgEls.pkSub.textContent = "esc, enter or space to close";
    pgEls.pkNone.hidden = false;
    pgEls.pkNone.textContent = "Close";
    pgEls.ptrFooter.hidden = true;
    pgEls.pkGrid.style.gridTemplateColumns = "";
    renderPointerGrid(pgEls.pkGrid, cfg.panels, { drawable: false, strokes: [] });
  }

  function renderPlayground() {
    document.querySelectorAll("[data-pg-tool]").forEach((btn) => {
      const active = btn.dataset.pgTool === pg.tool;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    renderPgPresets();
    renderPgPreview();
    renderPgCode();
  }

  document.querySelectorAll("[data-pg-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pg.tool = btn.dataset.pgTool;
      if (pg.tool === "pick") pg.sel = 0;
      if (pg.tool === "draw") {
        pg.drawColor = DRAW_PRESETS[pg.drawPreset].color;
        pg.drawStrokes = [];
      }
      resetPgToast();
      renderPlayground();
    });
  });

  pgEls.pkNone.addEventListener("click", () => {
    if (pg.tool === "pick") {
      const cfg = PICK_PRESETS[pg.pickPreset];
      pgEls.toast.innerHTML = `stdout → <strong>-1 ${escapeHtml(cfg.none)}</strong>`;
    } else if (pg.tool === "view") {
      pgEls.toast.innerHTML = 'Window closed — MCP already returned <strong>{"shown":true}</strong>.';
    }
  });

  pgEls.previewUndo.addEventListener("click", () => {
    if (!pg.drawStrokes.length) return;
    pg.drawStrokes.pop();
    repaintPgDraw();
  });

  pgEls.previewClear.addEventListener("click", () => {
    pg.drawStrokes = [];
    repaintPgDraw();
    pgEls.toast.textContent = "Cleared strokes.";
  });

  pgEls.previewDone.addEventListener("click", () => {
    const cfg = DRAW_PRESETS[pg.drawPreset];
    const widths = pg.drawRefs.map((r) => (r.canvas ? r.canvas.getBoundingClientRect().width : 280));
    const summary = buildDrawSummary(cfg.panels, pg.drawStrokes, widths, false);
    pgEls.toast.innerHTML = `stdout → <strong>${escapeHtml(JSON.stringify(summary))}</strong>`;
  });

  document.querySelectorAll("[data-pg-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      pg.tab = tab.dataset.pgTab;
      document.querySelectorAll("[data-pg-tab]").forEach((t) => t.classList.toggle("is-active", t === tab));
      renderPgCode();
    });
  });

  pgEls.copyBtn.addEventListener("click", () => {
    const cfg = currentPgConfig();
    let text;
    if (pg.tool === "pick") {
      text = pg.tab === "cli" ? buildPickCli(cfg, false) : JSON.stringify(buildPickMcpArgs(cfg), null, 2);
    } else if (pg.tool === "draw") {
      text = pg.tab === "cli" ? buildPointerCli("pointer", cfg, false) : JSON.stringify(buildPointerMcpArgs(true, cfg), null, 2);
    } else {
      text = pg.tab === "cli" ? buildPointerCli("view", cfg, false) : JSON.stringify(buildPointerMcpArgs(false, cfg), null, 2);
    }
    copyText(text, pgEls.copyBtn);
  });

  // =========================================================================
  // 2. SUPPORTED CLIENTS ("WORKS IN" + MCP SWITCHER)
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
      mcpCliCode.innerHTML = highlightShell(found.cli);
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

  const INSTALL_SNIPPET = [
    "brew install tomasi-studio/apps/supertools",
    "",
    "# install mcp server for Claude Code",
    "claude mcp add supertools -- /opt/homebrew/bin/supertools --mcp",
  ].join("\n");

  const copyInstallCmdBtn = document.getElementById("copy-install-cmd");
  const installCmdCode = document.getElementById("install-cmd-code");
  if (installCmdCode) {
    installCmdCode.innerHTML = highlightShell(INSTALL_SNIPPET);
  }
  if (copyInstallCmdBtn) {
    copyInstallCmdBtn.addEventListener("click", () => {
      copyText(INSTALL_SNIPPET, copyInstallCmdBtn);
    });
  }

  copyMcpCliBtn.addEventListener("click", () => {
    if (activeClient.cli) copyText(activeClient.cli, copyMcpCliBtn);
  });

  copyMcpJsonBtn.addEventListener("click", () => {
    copyText(activeClient.config, copyMcpJsonBtn);
  });

  // Re-layout & repaint canvases cleanly on viewport resize
  window.addEventListener("resize", () => {
    if (pg.tool === "pick") renderPgPreview();
    if (pg.tool === "draw") {
      pg.drawRefs.forEach((r, idx) => {
        if (r.canvas) paintOverlayCanvas(r.canvas, pg.drawStrokes, idx);
      });
    }
  });

  // Initial render
  renderPlayground();
  selectMcpClient("claude");
})();
