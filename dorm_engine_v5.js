(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pct(cur, max) {
    const m = Math.max(1, Number(max) || 100);
    const c = Math.max(0, Number(cur) || 0);
    return Math.min(100, Math.round((c / m) * 100));
  }

  function toArr(v) {
    if (Array.isArray(v)) return v;
    if (v == null || v === "") return [];
    return [v];
  }

  function toObj(v, fallback) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.assign({}, fallback, v);
    }
    return Object.assign({}, fallback);
  }

  function parseNum(v, fb) {
    const m = String(v == null ? "" : v).match(/-?\d+/);
    return m ? parseInt(m[0], 10) : (fb || 0);
  }

  function extractRoomId(str) {
    const m = String(str || "").match(/\b(\d{3})\b/);
    return m ? m[1] : "";
  }

  function buildHubRooms(rawHub, user) {
    const defaultTiers = [
      "ĐH Hạng Ba", "ĐH Hạng Ba", "ĐH Thường", "ĐH Thường", "ĐH 211", "ĐH 985"
    ];
    const map = {};
    const order = [];
    for (let f = 1; f <= 5; f++) {
      for (let r = 1; r <= 6; r++) {
        const id = String(f * 100 + r);
        const tier = defaultTiers[(f + r) % defaultTiers.length];
        map[id] = {
          id: id,
          floor: f,
          count: 4,
          max: 4,
          score: 0,
          school: tier,
          note: "Chưa có tin đồn nổi bật từ phòng này.",
          isUser: false
        };
        order.push(id);
      }
    }

    const userRoomId = extractRoomId(user && user.dorm);

    toArr(rawHub).forEach(function (entry) {
      let item = null;
      if (typeof entry === "string") {
        const parts = entry.split("|").map(function (x) { return x.trim(); });
        const rid = extractRoomId(parts[0]) || parts[0];
        if (!rid) return;
        item = {
          id: rid,
          count: parts[1] !== undefined && parts[1] !== "" ? parseNum(parts[1], 4) : 4,
          score: parts[2] !== undefined && parts[2] !== "" ? parseNum(parts[2], 0) : 0,
          school: parts[3] || "",
          note: parts[4] || ""
        };
      } else if (entry && typeof entry === "object") {
        const rid = extractRoomId(entry.id || entry.room || entry.name) || String(entry.id || entry.room || "");
        if (!rid) return;
        item = {
          id: rid,
          floor: entry.floor ? parseNum(entry.floor, 1) : undefined,
          count: entry.count != null ? parseNum(entry.count, 4) : (entry.alive != null ? parseNum(entry.alive, 4) : 4),
          max: entry.max != null ? parseNum(entry.max, 4) : 4,
          score: entry.score != null ? parseNum(entry.score, 0) : (entry.totalScore != null ? parseNum(entry.totalScore, 0) : 0),
          school: entry.school || entry.tier || "",
          note: entry.note || entry.status || "",
          isUser: Boolean(entry.isUser)
        };
      }
      if (!item || !item.id) return;

      if (map[item.id]) {
        const base = map[item.id];
        base.count = Math.max(0, Math.min(4, item.count));
        base.score = Math.max(0, item.score);
        if (item.school) base.school = item.school;
        if (item.note) base.note = item.note;
        if (item.isUser) base.isUser = true;
      } else {
        const fl = item.floor || Math.min(5, Math.max(1, parseInt(item.id.charAt(0), 10) || 1));
        const replaceId = String(fl * 100 + 6);
        const idx = order.indexOf(replaceId);
        if (idx !== -1 && replaceId !== userRoomId) {
          delete map[replaceId];
          order[idx] = item.id;
        } else {
          order.push(item.id);
        }
        map[item.id] = {
          id: item.id,
          floor: fl,
          count: Math.max(0, Math.min(4, item.count)),
          max: item.max || 4,
          score: Math.max(0, item.score),
          school: item.school || "ĐH Thường",
          note: item.note || "Phòng thuộc Khu Nội Trú Liên Hợp.",
          isUser: Boolean(item.isUser)
        };
      }
    });

    if (userRoomId) {
      if (!map[userRoomId]) {
        const fl = Math.min(5, Math.max(1, parseInt(userRoomId.charAt(0), 10) || 4));
        const replaceId = String(fl * 100 + 4);
        const idx = order.indexOf(replaceId);
        if (idx !== -1) {
          delete map[replaceId];
          order[idx] = userRoomId;
        } else {
          order.push(userRoomId);
        }
        map[userRoomId] = {
          id: userRoomId,
          floor: fl,
          count: 4,
          max: 4,
          score: 0,
          school: (user && user.school) || "ĐH Hạng Ba",
          note: "Phòng KTX hiện tại của bạn.",
          isUser: true
        };
      } else {
        map[userRoomId].isUser = true;
        if (user && user.school && !map[userRoomId].school) {
          map[userRoomId].school = user.school;
        }
      }
    }

    const list = order.map(function (id) { return map[id]; }).filter(Boolean);

    // Sort for ranking: alive rooms (count > 0) sorted by score desc, then count desc, then id asc
    const ranked = list.slice().sort(function (a, b) {
      const aAlive = a.count > 0 ? 1 : 0;
      const bAlive = b.count > 0 ? 1 : 0;
      if (aAlive !== bAlive) return bAlive - aAlive;
      if (b.score !== a.score) return b.score - a.score;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.id).localeCompare(String(b.id));
    });

    let rankNum = 1;
    ranked.forEach(function (rm) {
      if (rm.count > 0) {
        rm.rank = rankNum++;
      } else {
        rm.rank = null;
      }
    });

    return { list: list, ranked: ranked, byId: map, userRoomId: userRoomId };
  }

  function injectStyles() {
    if (document.getElementById("dorm-engine-style")) return;
    const style = document.createElement("style");
    style.id = "dorm-engine-style";
    style.textContent = `
      :root {
        --bg: #0b0b0d; --panel: #131317; --panel-2: #1a1a20; --border: #2c2c34;
        --text: #ececf0; --muted: #8d8d9b; --accent: #e5e5e5; --accent-soft: rgba(229,229,229,0.1);
        --danger: #d9383a; --safe: #2fbf71; --warn: #e6a23c;
        --mono: "JetBrains Mono", "Fira Code", Consolas, monospace;
        --sans: "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      .mode-official {
        --bg: #090607; --panel: #120b0d; --panel-2: #1b1013; --border: #421b22;
        --text: #f5ecee; --muted: #a6858c; --accent: #e0313d; --accent-soft: rgba(224,49,61,0.16);
      }
      .mode-pre {
        --bg: #070708; --panel: #101012; --panel-2: #17171a; --border: #333338;
        --accent: #d9383a; --accent-soft: rgba(217,56,58,0.15);
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        background: transparent;
        font-family: var(--sans);
        font-size: 13px;
        line-height: 1.45;
        padding: 4px;
      }

      /* === VIEW 1: COMPACT PUSH NOTIFICATION === */
      .d-notify-card {
        width: 100%; color: var(--text); border: 1px solid var(--border); border-left: 4px solid var(--accent);
        border-radius: 12px; overflow: hidden;
        background: radial-gradient(circle at top right, var(--accent-soft), transparent 55%), var(--panel);
        box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      }
      .d-n-head {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
        padding: 8px 13px; background: var(--bg); border-bottom: 1px solid var(--border);
      }
      .d-n-brand { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; font-weight: 700; font-size: 12px; letter-spacing: 0.4px; }
      .d-n-tag {
        font-size: 10px; font-family: var(--mono); padding: 2px 7px; border-radius: 99px;
        border: 1px solid var(--accent); color: var(--accent); background: var(--accent-soft); text-transform: uppercase;
      }
      .d-n-body { padding: 11px 14px; display: flex; flex-direction: column; gap: 8px; }
      .d-n-title { font-size: 14px; font-weight: 700; color: #fff; }
      .d-n-line { font-size: 12.5px; color: var(--text); padding: 6px 9px; background: var(--panel-2); border-radius: 6px; border-left: 2px solid var(--accent); }
      .d-n-foot {
        padding: 6px 13px; background: var(--bg); border-top: 1px solid var(--border);
        display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px;
        font-size: 11px; color: var(--muted); font-family: var(--mono);
      }

      /* === VIEW 2: FULL SMARTPHONE === */
      .dorm-wrap {
        display: flex; flex-direction: column; min-height: 540px; width: 100%;
        color: var(--text); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
        background: radial-gradient(circle at top right, var(--accent-soft), transparent 45%), var(--bg);
      }
      .d-top {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 8px 14px;
        background: var(--panel); border-bottom: 1px solid var(--border); gap: 8px; flex-shrink: 0;
      }
      .d-brand { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.4px; }
      .d-badge {
        font-size: 10px; font-family: var(--mono); padding: 2px 7px; border-radius: 99px;
        border: 1px solid var(--accent); color: var(--accent); background: var(--accent-soft); text-transform: uppercase;
      }
      .d-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-family: var(--mono); font-size: 11.5px; color: var(--muted); }
      .d-cd { color: var(--accent); font-weight: 700; padding: 2px 8px; border-radius: 6px; background: var(--accent-soft); border: 1px solid var(--border); }
      .d-alert {
        background: rgba(217,56,58,0.14); border-bottom: 1px solid rgba(217,56,58,0.35);
        color: #ff9497; padding: 6px 14px; font-size: 12px; display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      }
      .d-grid { display: grid; grid-template-columns: 235px 1fr; flex: 1; min-height: 0; }
      .d-side {
        background: var(--panel); border-right: 1px solid var(--border); padding: 12px;
        display: flex; flex-direction: column; gap: 10px; overflow-y: auto;
      }
      .d-id { background: var(--panel-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 11px; }
      .d-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
      .d-sub { font-size: 11.5px; color: var(--muted); margin-bottom: 8px; }
      .d-curr-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .d-curr { background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 6px 8px; }
      .d-curr-l { font-size: 10px; color: var(--muted); text-transform: uppercase; }
      .d-curr-v { font-family: var(--mono); font-size: 14px; font-weight: 700; }
      .d-curr-v.acc { color: var(--accent); }
      .d-dots-box { background: var(--panel-2); border: 1px solid var(--border); border-radius: 9px; padding: 8px 10px; }
      .d-mini-t { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px; display: flex; justify-content: space-between; gap: 6px; }
      .d-dots { display: flex; justify-content: space-around; align-items: center; padding: 3px 0; flex-wrap: wrap; gap: 6px; }
      .d-dot-i { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; color: var(--muted); text-align: center; }
      .d-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #555; background: #08080a; }
      .d-dot.in { background: #f4f4f6; border-color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.6); }
      .d-dot.dead { background: #2b0b0c; border-color: var(--danger); position: relative; }
      .d-dot.dead::after { content: "×"; color: var(--danger); font-weight: 700; font-size: 13px; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
      .d-nav { display: flex; flex-direction: column; gap: 4px; }
      .d-nav-btn {
        width: 100%; text-align: left; background: transparent; color: var(--text); border: 1px solid transparent;
        border-radius: 8px; padding: 7.5px 10px; cursor: pointer; font-size: 12.2px;
        display: flex; align-items: center; justify-content: space-between; transition: 0.15s;
      }
      .d-nav-btn:hover { background: var(--panel-2); border-color: var(--border); }
      .d-nav-btn.active { background: var(--accent-soft); border-color: var(--accent); color: #fff; font-weight: 600; }
      .d-nav-btn.locked { opacity: 0.36; cursor: not-allowed; }
      .d-nav-tag { font-size: 10px; font-family: var(--mono); color: var(--muted); }
      .d-main { padding: 14px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
      .d-pane { display: none; flex-direction: column; gap: 12px; }
      .d-pane.active { display: flex; }
      .d-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
      .d-ctitle {
        font-size: 12px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
        color: var(--accent); margin-bottom: 10px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px;
      }
      .d-bp {
        display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 56px 56px;
        gap: 7px; background: #0a0a0d; padding: 9px; border-radius: 8px; border: 1px dashed var(--border);
      }
      .d-zone {
        border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column;
        justify-content: space-between; cursor: pointer; border: 1px solid; font-size: 11.5px;
      }
      .d-zone.z-g { background: rgba(47,191,113,0.12); border-color: rgba(47,191,113,0.5); color: #8af0b8; }
      .d-zone.z-y { background: rgba(230,162,60,0.14); border-color: rgba(230,162,60,0.6); color: #ffd28a; }
      .d-zone.z-r { background: rgba(217,56,58,0.18); border-color: rgba(217,56,58,0.75); color: #ff9c9e; }
      .d-zone.span2 { grid-column: span 2; }
      .d-zst { font-size: 10px; font-family: var(--mono); opacity: 0.9; }
      .d-cap { margin-top: 8px; font-size: 12px; color: var(--muted); padding: 6px 9px; background: var(--panel-2); border-radius: 6px; border-left: 3px solid var(--safe); }
      .d-cap.warn { border-left-color: var(--warn); color: #ffd28a; }
      .d-cap.danger { border-left-color: var(--danger); color: #ff9c9e; }
      .d-mlist { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .d-mcard { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 5px; }
      .d-mcard.dead { opacity: 0.48; border-color: var(--danger); }
      .d-mhead { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 12.5px; gap: 4px; }
      .d-call { font-size: 11px; padding: 2px 6px; border-radius: 5px; background: var(--bg); border: 1px solid var(--border); color: var(--safe); cursor: pointer; }
      .d-call.off { color: var(--muted); opacity: 0.45; cursor: default; }
      .d-bar { width: 100%; height: 7px; background: #1c1c22; border-radius: 99px; overflow: hidden; }
      .d-fill { height: 100%; background: linear-gradient(90deg, #27ae60, #4be08a); border-radius: 99px; }
      .d-fill.mid { background: linear-gradient(90deg, #d68910, #f5b041); }
      .d-fill.low { background: linear-gradient(90deg, #c0392b, #e74c3c); }
      .d-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .d-stile { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px; text-align: center; }
      .d-snum { font-family: var(--mono); font-size: 18px; font-weight: 700; }
      .d-slbl { font-size: 11px; color: var(--muted); margin-top: 2px; }
      .d-mis { padding: 8px 10px; background: var(--panel-2); border-left: 3px solid var(--accent); border-radius: 0 7px 7px 0; font-size: 12.5px; margin-bottom: 6px; display: flex; justify-content: space-between; gap: 8px; }
      .d-mis.done { border-left-color: var(--safe); opacity: 0.78; }
      .d-mis.fail { border-left-color: var(--danger); color: #ff9c9e; }
      .d-mtag { font-size: 10px; font-family: var(--mono); padding: 1px 6px; border-radius: 4px; background: var(--bg); color: var(--muted); white-space: nowrap; align-self: flex-start; }
      .d-choice { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px; cursor: pointer; margin-bottom: 7px; }
      .d-choice:hover { border-color: var(--accent); }
      .d-ch-t { font-weight: 700; display: flex; justify-content: space-between; gap: 8px; }
      .d-ch-d { display: none; margin-top: 7px; padding-top: 7px; border-top: 1px dashed var(--border); font-size: 12px; color: var(--muted); }
      .d-choice.open .d-ch-d { display: block; }
      .d-ch-n { color: #ff9c9e; margin-top: 4px; font-style: italic; }
      .d-eval { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
      .d-ecell { background: var(--panel-2); border: 1px solid var(--border); border-radius: 7px; padding: 7px 9px; }
      .d-ecell.full { grid-column: 1 / -1; }
      .d-ek { font-size: 10.5px; color: var(--muted); }
      .d-ev { font-family: var(--mono); font-weight: 700; font-size: 12.5px; margin-top: 2px; }
      .d-sitem { display: flex; justify-content: space-between; align-items: center; background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 11px; margin-bottom: 7px; gap: 10px; }
      .d-price { font-family: var(--mono); font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
      .d-price.ok { background: rgba(47,191,113,0.16); color: #7ef2b1; border: 1px solid rgba(47,191,113,0.45); }
      .d-price.no { background: rgba(217,56,58,0.14); color: #ff8e91; border: 1px solid rgba(217,56,58,0.4); }
      .d-empty { font-size: 12px; color: var(--muted); font-style: italic; padding: 4px 0; }
      details.d-acc { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 11px; margin-bottom: 7px; }
      details.d-acc summary { cursor: pointer; font-weight: 600; }
      details.d-acc p { margin-top: 6px; color: var(--muted); font-size: 12px; }
      .d-csbtn { width: 100%; padding: 9px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent-soft); color: #fff; font-weight: 600; cursor: pointer; margin-top: 4px; }

      /* === TAB 07: 30-ROOM ARCHITECTURAL HUB MAP & LEADERBOARD === */
      .h-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
      .h-ktile { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 7px 9px; text-align: center; }
      .h-knum { font-family: var(--mono); font-size: 15px; font-weight: 700; color: #fff; }
      .h-knum.warn { color: var(--warn); }
      .h-knum.acc { color: var(--accent); }
      .h-klbl { font-size: 10px; color: var(--muted); text-transform: uppercase; margin-top: 2px; }
      .h-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 7px; }
      .h-pills { display: flex; flex-wrap: wrap; gap: 5px; }
      .h-pill {
        background: var(--panel-2); border: 1px solid var(--border); color: var(--muted);
        border-radius: 6px; padding: 4px 9px; font-size: 11.5px; cursor: pointer; font-family: var(--mono);
      }
      .h-pill:hover { border-color: var(--accent); color: var(--text); }
      .h-pill.active { background: var(--accent-soft); border-color: var(--accent); color: #fff; font-weight: 700; }
      .h-detail {
        background: #0d080a; border: 1px solid var(--border); border-left: 3px solid var(--accent);
        border-radius: 8px; padding: 9px 11px; display: flex; flex-direction: column; gap: 4px; font-size: 12px;
      }
      .h-dhead { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px; font-weight: 700; color: #fff; }
      .h-dmeta { display: flex; flex-wrap: wrap; gap: 10px; font-family: var(--mono); font-size: 11px; color: var(--muted); }
      .h-floor-wrap { display: flex; flex-direction: column; gap: 10px; }
      .h-floor {
        background: #0a0708; border: 1px solid var(--border); border-radius: 9px; padding: 9px;
        background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
        background-size: 16px 16px;
      }
      .h-fl-head {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px;
        font-family: var(--mono); font-size: 10.5px; color: var(--muted); letter-spacing: 0.6px; text-transform: uppercase;
      }
      .h-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .h-corridor {
        margin: 6px 0; padding: 3px 8px; border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border);
        background: rgba(255,255,255,0.025); font-family: var(--mono); font-size: 9.5px; color: var(--muted);
        display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.8px;
      }
      .h-room {
        position: relative; background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px;
        padding: 6px 7px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; transition: 0.14s;
      }
      .h-room:hover { border-color: var(--accent); transform: translateY(-1px); }
      .h-room.sel { box-shadow: 0 0 0 1px #fff; border-color: #fff; }
      .h-room.st-safe { border-left: 3px solid var(--safe); }
      .h-room.st-warn { border-left: 3px solid var(--warn); background: rgba(230,162,60,0.09); border-color: rgba(230,162,60,0.45); }
      .h-room.st-crit { border-left: 3px solid var(--danger); background: rgba(217,56,58,0.12); border-color: rgba(217,56,58,0.55); }
      .h-room.st-dead { opacity: 0.42; background: #0c0a0b; border-style: dashed; border-color: #3a2326; }
      .h-room.is-user { border: 1.5px solid var(--accent); box-shadow: 0 0 10px rgba(224,49,61,0.32); background: rgba(224,49,61,0.14); }
      .h-rtop { display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-weight: 700; font-size: 12px; }
      .h-rk { font-size: 9.5px; padding: 1px 4px; border-radius: 4px; background: var(--bg); color: var(--muted); }
      .h-rk.top3 { color: #ffd666; border: 1px solid rgba(255,214,102,0.45); }
      .h-rmid { display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 10.5px; }
      .h-pips { letter-spacing: 1px; font-size: 10px; }
      .h-pips.safe { color: #7ef2b1; }
      .h-pips.warn { color: #ffd28a; }
      .h-pips.crit { color: #ff8e91; }
      .h-pips.dead { color: var(--danger); }
      .h-sc { font-weight: 700; color: var(--text); }
      .h-rbot { display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; gap: 4px; }
      .h-badge-sm { font-family: var(--mono); font-size: 9px; padding: 0px 4px; border-radius: 3px; font-weight: 700; }
      .h-badge-sm.you { background: var(--accent); color: #fff; }
      .h-badge-sm.merge { background: rgba(230,162,60,0.22); color: #ffd28a; border: 1px solid rgba(230,162,60,0.5); }
      .h-legend { display: flex; flex-wrap: wrap; gap: 9px; font-size: 10.5px; color: var(--muted); font-family: var(--mono); padding-top: 2px; }
      .h-table { width: 100%; border-collapse: collapse; font-size: 11.8px; }
      .h-table th { text-align: left; font-size: 10px; text-transform: uppercase; color: var(--muted); font-family: var(--mono); padding: 6px 7px; border-bottom: 1px solid var(--border); }
      .h-table td { padding: 6px 7px; border-bottom: 1px solid rgba(255,255,255,0.04); }
      .h-table tr { cursor: pointer; }
      .h-table tr:hover { background: var(--panel-2); }
      .h-table tr.is-user { background: rgba(224,49,61,0.14); font-weight: 600; }
      .h-table tr.st-dead { opacity: 0.45; text-decoration: line-through; }

      .d-toast { position: fixed; bottom: 12px; right: 14px; background: #1d1013; border: 1px solid var(--accent); color: #fff; padding: 7px 12px; border-radius: 8px; font-size: 12px; display: none; z-index: 99; }
      .d-err { background: #260b0d; color: #ffb3b5; border: 1px solid #e0313d; border-radius: 8px; padding: 10px 12px; font-family: var(--mono); font-size: 12px; }
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      @media (max-width: 680px) {
        .dorm-wrap { height: auto; min-height: 460px; }
        .d-grid { grid-template-columns: 1fr; }
        .d-side { border-right: none; border-bottom: 1px solid var(--border); }
        .d-mlist, .d-stats, .d-eval, .h-kpi { grid-template-columns: 1fr 1fr; }
        .d-bp { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
        .d-zone.span2 { grid-column: span 2; }
        .h-row { grid-template-columns: repeat(2, 1fr); }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function renderChoices(list) {
    const arr = toArr(list).filter(function (ch) { return ch && typeof ch === "object"; });
    if (!arr.length) return "";
    return arr.map(function (ch) {
      return `
        <div class="d-choice">
          <div class="d-ch-t"><span>${esc(ch.code ? ch.code + ": " : "")}${esc(ch.title)}</span><span style="font-size:11px;color:var(--muted);">▾ Chi tiết</span></div>
          <div class="d-ch-d">
            <div>${esc(ch.intro || "")}</div>
            ${ch.note ? `<div class="d-ch-n">[Chú thích: ${esc(ch.note)}]</div>` : ""}
          </div>
        </div>`;
    }).join("");
  }

  function renderEval(ev) {
    if (!ev || typeof ev !== "object") return "";
    return `
      <div class="d-eval">
        <div class="d-ecell"><div class="d-ek">Bài kiểm tra</div><div class="d-ev">${esc(ev.testName)}</div></div>
        <div class="d-ecell"><div class="d-ek">Sát thương</div><div class="d-ev">${esc(ev.dmg)}</div></div>
        <div class="d-ecell"><div class="d-ek">Kháng ST</div><div class="d-ev">${esc(ev.tank)}</div></div>
        <div class="d-ecell"><div class="d-ek">Hỗ trợ</div><div class="d-ev">${esc(ev.sup)}</div></div>
        <div class="d-ecell"><div class="d-ek">Điểm hiệu quả</div><div class="d-ev">${esc(ev.eff)}</div></div>
        <div class="d-ecell"><div class="d-ek">Xếp loại</div><div class="d-ev" style="color:var(--accent);">${esc(ev.grade || "--")}</div></div>
        ${ev.ach ? `<div class="d-ecell full"><div class="d-ek">Thành tựu & Buff</div><div class="d-ev">${esc(ev.ach)}</div></div>` : ""}
        <div class="d-ecell full"><div class="d-ek">Tập thể & Phần thưởng</div><div class="d-ev">${esc(ev.teamScore || "--")}${ev.reward ? " • " + esc(ev.reward) : ""}</div></div>
      </div>`;
  }

  function renderDots(list) {
    if (!list.length) return "";
    return `<div class="d-dots-box"><div class="d-mini-t"><span>Trạng thái thành viên</span><span>⚪ Trong phòng • ⚫ Ngoài</span></div><div class="d-dots">${
      list.map(function (m) {
        const cls = m.alive === false ? "dead" : (m.inRoom ? "in" : "");
        return `<div class="d-dot-i" title="${esc(m.name)}"><div class="d-dot ${cls}"></div><span>${esc(m.bed || "G?")} ${esc(m.name || "")}</span></div>`;
      }).join("")
    }</div></div>`;
  }

  function pipsStr(count) {
    if (count <= 0) return "✕ XÓA";
    let s = "";
    for (let i = 0; i < 4; i++) s += (i < count ? "●" : "○");
    return s;
  }

  function roomStatusClass(rm) {
    if (rm.count <= 0) return "st-dead";
    if (rm.count === 1) return "st-crit";
    if (rm.count === 2) return "st-warn";
    return "st-safe";
  }

  function roomStatusLabel(rm) {
    if (rm.count <= 0) return "💀 Đã xóa sổ";
    if (rm.count <= 2) return "⚠️ Báo động: Bắt buộc ghép phòng trước 08:00";
    if (rm.count === 3) return "🟡 Còn 1 giường trống (có thể tuyển/ghép)";
    return "🟢 Đủ người (4/4)";
  }

  function renderRoomDetailHtml(rm) {
    if (!rm) return `<div class="d-empty">Chạm vào bất kỳ phòng nào trên sơ đồ hoặc BXH để xem thông tin chi tiết.</div>`;
    return `
      <div class="h-dhead">
        <span>🚪 Phòng ${esc(rm.id)} • Tầng ${esc(rm.floor)} ${rm.isUser ? '<span class="h-badge-sm you">PHÒNG BẠN</span>' : ""}</span>
        <span style="font-family:var(--mono);color:var(--accent);">${rm.rank ? "Hạng #" + rm.rank : "ĐÃ XÓA SỔ"}</span>
      </div>
      <div class="h-dmeta">
        <span>🏫 ${esc(rm.school)}</span>
        <span>👥 Nhân số: ${esc(rm.count)}/4</span>
        <span>📊 Tổng điểm phòng: <strong>${esc(rm.score)} đ</strong> (Điểm cá nhân: ẨN)</span>
      </div>
      <div style="font-size:11.5px;color:${rm.count <= 0 ? "#ff8e91" : (rm.count <= 2 ? "#ffd28a" : "#7ef2b1")};">${roomStatusLabel(rm)}</div>
      <div style="font-size:11.5px;color:var(--muted);">📝 ${esc(rm.note || "Không có ghi nhận bất thường.")}</div>
    `;
  }

  function renderDormApp(inputState) {
    injectStyles();
    const root = document.getElementById("dorm-app-root") || document.body;
    if (!root) return;

    try {
      const raw = toObj(inputState || window.DORM_STATE, {});
      const view = String(raw.view || "full").toLowerCase().includes("notify") ? "notify" : "full";
      const rawMode = String(raw.mode || "pre").toLowerCase();
      const mode = rawMode.includes("official") ? "official" : (rawMode.includes("temp") ? "temp" : "pre");
      const isOfficial = mode === "official";

      const user = toObj(raw.user, {
        name: "Chưa định danh",
        dorm: "Phòng ---",
        school: "Đại học hạng ba",
        rank: "Chưa định hạng",
        credits: 0,
        points: 0,
        hp: 100,
        maxHp: 100,
        hpNote: "Ổn định, chưa phát hiện ô nhiễm tinh thần.",
        limbs: "Lành lặn 100%",
        stats: [10, 10, 10, 10],
        talent: { item: "Chưa thức tỉnh", desc: "Chưa có dữ liệu dị năng." },
        items: [],
        buffs: []
      });

      const talent = typeof user.talent === "string"
        ? { item: user.talent, desc: "" }
        : toObj(user.talent, { item: "Chưa thức tỉnh", desc: "Chưa có dữ liệu dị năng." });
      const itemsList = toArr(user.items);
      const buffsList = toArr(user.buffs);
      const statsArr = Array.isArray(user.stats) ? user.stats : [10, 10, 10, 10];

      const clock = toObj(raw.clock, { time: "Ngày 1 • 22:00", countdown: "", status: "" });
      const dormMap = toObj(raw.dormMap, {
        door: "g", beds: "g", desk: "g", bath: "g", balcony: "g",
        note: "Chưa có dữ liệu quét an toàn."
      });

      const team = toArr(raw.team).map(function (m, idx) {
        if (typeof m === "string") return { name: m, bed: "G" + (idx + 1), inRoom: true, alive: true, hp: 100, maxHp: 100 };
        return toObj(m, { name: "Thành viên " + (idx + 1), bed: "G" + (idx + 1), inRoom: true, alive: true, hp: 100, maxHp: 100, role: "Sinh viên" });
      });

      const exam = toObj(raw.exam, {
        title: "Chưa kích hoạt bài kiểm tra",
        missions: [],
        choices: [],
        evaluation: null,
        history: []
      });
      const missionsList = toArr(exam.missions);
      const examChoices = toArr(exam.choices);
      const examHistory = toArr(exam.history);
      const shop = toArr(raw.shop).filter(function (s) { return s && typeof s === "object"; });

      const notifyData = toObj(raw.notify, {
        tag: "THÔNG BÁO ỨNG DỤNG",
        title: "",
        lines: [],
        showDots: false,
        choices: [],
        evaluation: null
      });
      const notifyLines = toArr(notifyData.lines);
      const alertMsg = raw.alert || "";

      // ==========================================================
      // BRANCH 1: AUTO PUSH-NOTIFICATION VIEW (view: "notify")
      // ==========================================================
      if (view === "notify") {
        const linesHtml = notifyLines.map(function (l) {
          return `<div class="d-n-line">${esc(l)}</div>`;
        }).join("");
        const dotsHtml = notifyData.showDots ? renderDots(team) : "";
        const choicesHtml = renderChoices(notifyData.choices);
        const evalHtml = renderEval(notifyData.evaluation);

        root.innerHTML = `
          <div class="d-notify-card mode-${mode}">
            <div class="d-n-head">
              <div class="d-n-brand"><span>📱 THÔNG BÁO ĐIỆN THOẠI</span><span class="d-n-tag">${esc(notifyData.tag)}</span></div>
              <div class="d-meta">
                <span>${esc(clock.time)}</span>
                ${clock.countdown ? `<span class="d-cd">⏳ ${esc(clock.countdown)}</span>` : ""}
              </div>
            </div>
            <div class="d-n-body">
              ${notifyData.title ? `<div class="d-n-title">${esc(notifyData.title)}</div>` : ""}
              ${linesHtml}
              ${dotsHtml}
              ${choicesHtml ? `<div>${choicesHtml}</div>` : ""}
              ${evalHtml}
            </div>
            <div class="d-n-foot">
              <span>${esc(user.dorm)} • ${esc(user.school)}</span>
              <span>Gõ /phone hoặc /map để mở App</span>
            </div>
          </div>
        `;
        root.querySelectorAll(".d-choice").forEach(function (c) {
          c.addEventListener("click", function () { c.classList.toggle("open"); });
        });
        return;
      }

      // ==========================================================
      // BRANCH 2: FULL INTERACTIVE SMARTPHONE (view: "full")
      // ==========================================================
      const modeLabels = { pre: "Tiền trò chơi", temp: "Sinh viên tạm thời", official: "Sinh viên chính thức" };
      const zCodes = { g: "Xanh lá • An toàn", y: "Vàng • Dị thường", r: "Đỏ • Xâm nhập!" };
      const mapZones = [
        { key: "door", name: "🚪 Cửa chính", cls: "" },
        { key: "beds", name: "🛏️ Khu Giường 1–4", cls: "span2" },
        { key: "desk", name: "📚 Bàn học & Tủ", cls: "" },
        { key: "bath", name: "🚰 Bồn rửa & WC", cls: "" },
        { key: "balcony", name: "🪟 Ban công", cls: "" }
      ];

      let worst = "g";
      const mapHtml = mapZones.map(function (z) {
        const c = ["g", "y", "r"].includes(dormMap[z.key]) ? dormMap[z.key] : "g";
        if (c === "r") worst = "r";
        else if (c === "y" && worst !== "r") worst = "y";
        return `<div class="d-zone z-${c} ${z.cls}" data-zmsg="${esc(z.name + ": " + zCodes[c])}"><strong>${z.name}</strong><span class="d-zst">${zCodes[c]}</span></div>`;
      }).join("");

      const safetyMeta = worst === "r"
        ? { txt: "NGUY HIỂM", col: "#ff7679", cap: "danger" }
        : worst === "y"
          ? { txt: "CẢNH BÁO", col: "#ffd28a", cap: "warn" }
          : { txt: "AN TOÀN", col: "#7ef2b1", cap: "" };

      const dotsSideHtml = team.length
        ? team.map(function (m) {
            const cls = m.alive === false ? "dead" : (m.inRoom ? "in" : "");
            return `<div class="d-dot-i" title="${esc(m.name)}"><div class="d-dot ${cls}"></div><span>${esc(m.bed || "G?")}</span></div>`;
          }).join("")
        : `<div class="d-empty">Chưa có dữ liệu</div>`;

      const membersHtml = team.length
        ? team.map(function (m) {
            const alive = m.alive !== false;
            const p = pct(m.hp, m.maxHp || 100);
            const bCls = p <= 30 ? "low" : (p <= 65 ? "mid" : "");
            const callOff = !alive || !isOfficial;
            return `
              <div class="d-mcard ${alive ? "" : "dead"}">
                <div class="d-mhead">
                  <span>${alive ? (m.inRoom ? "⚪" : "⚫") : "💀"} ${esc(m.name)} <small style="color:var(--muted);font-weight:400;">(${esc(m.bed || "")})</small></span>
                  <span class="d-call ${callOff ? "off" : ""}" data-call="${esc(m.name)}">📞</span>
                </div>
                <div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;gap:4px;">
                  <span>Vai trò: ${esc(m.role || "Sinh viên")}</span>
                  <span style="font-family:var(--mono);">${alive ? esc(m.hp + "/" + (m.maxHp || 100)) : "ĐÃ MẤT"}</span>
                </div>
                <div class="d-bar"><div class="d-fill ${bCls}" style="width:${alive ? p : 0}%;"></div></div>
              </div>`;
          }).join("")
        : `<div class="d-empty">Chưa khởi tạo đội phòng ngủ.</div>`;

      const missionsHtml = missionsList.length
        ? missionsList.map(function (ms) {
            const obj = typeof ms === "string" ? { text: ms, status: "active" } : toObj(ms, { text: "", status: "active" });
            const st = obj.status || "active";
            const tag = st === "done" ? "HOÀN THÀNH" : st === "fail" ? "THẤT BẠI" : "ĐANG LÀM";
            return `<div class="d-mis ${st}"><span>▸ ${esc(obj.text)}</span><span class="d-mtag">${tag}</span></div>`;
          }).join("")
        : `<div class="d-empty">Hiện chưa có nhiệm vụ nào được kích hoạt.</div>`;

      const choicesBlock = examChoices.length
        ? `<div class="d-card"><div class="d-ctitle"><span>Đề thi đang mở (Bấm để xem chú thích)</span></div>${renderChoices(examChoices)}</div>`
        : "";

      const evalBlock = exam.evaluation
        ? `<div class="d-card"><div class="d-ctitle"><span>Đánh giá thành tích gần nhất</span><span>${esc(exam.evaluation.grade || "")}</span></div>${renderEval(exam.evaluation)}</div>`
        : "";

      const historyBlock = examHistory.length
        ? `<div class="d-card"><div class="d-ctitle"><span>Lịch sử bài kiểm tra</span></div>${
            examHistory.map(function (h) {
              const ho = typeof h === "string" ? { name: h, score: "", reward: "" } : toObj(h, { name: "", score: "", reward: "" });
              const label = ho.name || ho.title || "Bài kiểm tra";
              const res = ho.score || ho.result || "";
              const rew = ho.reward || "";
              return `<div class="d-mis done"><span>${esc(label)}${res ? " (" + esc(res) + ")" : ""}</span><span class="d-mtag">${esc(rew)}</span></div>`;
            }).join("")
          }</div>`
        : "";

      const itemsHtml = itemsList.length
        ? itemsList.map(function (it) {
            return `<div style="padding:6px 9px;background:var(--panel-2);border:1px solid var(--border);border-radius:7px;margin-bottom:6px;">🎒 ${esc(it)}</div>`;
          }).join("")
        : `<div class="d-empty">Túi đồ trống.</div>`;

      const buffsHtml = buffsList.length
        ? buffsList.map(function (bf) {
            return `<div style="padding:6px 9px;background:var(--accent-soft);border:1px solid var(--border);border-radius:7px;margin-bottom:6px;font-size:12px;">✦ ${esc(bf)}</div>`;
          }).join("")
        : `<div class="d-empty">Chưa có buff thành tựu nào.</div>`;

      const userHpPct = pct(user.hp, user.maxHp);
      const userHpCls = userHpPct <= 30 ? "low" : (userHpPct <= 65 ? "mid" : "");
      const statLabels = ["Thể lực", "Sức mạnh", "Tốc độ", "Tinh thần"];
      const statsHtml = statLabels.map(function (lbl, i) {
        return `<div class="d-stile"><div class="d-snum">${esc(statsArr[i] != null ? statsArr[i] : 10)}</div><div class="d-slbl">${lbl}</div></div>`;
      }).join("");

      const userPts = parseNum(user.points, 0);

      const shopHtml = shop.length
        ? shop.map(function (it) {
            const rawPrice = it.price != null ? it.price : (it.cost != null ? it.cost : (it.points != null ? it.points : it.point));
            const cost = parseNum(rawPrice, 0);
            const ok = userPts >= cost;
            const desc = it.desc || it.description || "";
            return `
              <div class="d-sitem">
                <div>
                  <div style="font-weight:700;font-size:12.5px;">${esc(it.name)} ${it.stock ? `<small style="color:var(--muted);font-weight:400;">(${esc(it.stock)})</small>` : ""}</div>
                  <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${esc(desc)}</div>
                </div>
                <div class="d-price ${ok ? "ok" : "no"}">${cost} điểm</div>
              </div>`;
          }).join("")
        : `<div class="d-empty">Cửa hàng hiện đang đóng hoặc chưa tải danh mục.</div>`;

      // === BUILD 30-ROOM HUB DATA ===
      const hub = buildHubRooms(raw.hubRooms, user);
      const aliveRooms = hub.list.filter(function (r) { return r.count > 0; }).length;
      const totalAliveStudents = hub.list.reduce(function (acc, r) { return acc + r.count; }, 0);
      const mergeAlertRooms = hub.list.filter(function (r) { return r.count === 1 || r.count === 2; }).length;
      const userHubRoom = hub.byId[hub.userRoomId] || hub.ranked[0];
      const userRankText = userHubRoom && userHubRoom.rank ? ("#" + userHubRoom.rank) : (user.rank || "--");
      const userRoomScoreText = userHubRoom ? (userHubRoom.score + " đ") : "--";

      function buildFloorHtml(floorNum) {
        const roomsOnFloor = hub.list.filter(function (r) { return r.floor === floorNum; });
        const topRow = roomsOnFloor.slice(0, 3);
        const botRow = roomsOnFloor.slice(3, 6);
        function cell(rm) {
          const stCls = roomStatusClass(rm);
          const pipCls = rm.count <= 0 ? "dead" : (rm.count === 1 ? "crit" : (rm.count === 2 ? "warn" : "safe"));
          const rkCls = rm.rank && rm.rank <= 3 ? "top3" : "";
          const badge = rm.isUser
            ? `<span class="h-badge-sm you">BẠN</span>`
            : (rm.count === 1 || rm.count === 2 ? `<span class="h-badge-sm merge">GHÉP!</span>` : "");
          return `
            <div class="h-room ${stCls} ${rm.isUser ? "is-user" : ""}" data-rid="${esc(rm.id)}">
              <div class="h-rtop">
                <span>P.${esc(rm.id)}</span>
                <span class="h-rk ${rkCls}">${rm.rank ? "#" + rm.rank : "✕"}</span>
              </div>
              <div class="h-rmid">
                <span class="h-pips ${pipCls}">${pipsStr(rm.count)}</span>
                <span class="h-sc">${rm.count > 0 ? esc(rm.score) + "đ" : "--"}</span>
              </div>
              <div class="h-rbot">
                <span style="overflow:hidden;text-overflow:ellipsis;">${esc(rm.school)}</span>
                ${badge}
              </div>
            </div>`;
        }
        return `
          <div class="h-floor" data-floor="${floorNum}">
            <div class="h-fl-head">
              <span>▓ TẦNG ${floorNum} — KHU NỘI TRÚ LIÊN HỢP</span>
              <span>${roomsOnFloor.filter(function (r) { return r.count > 0; }).length}/${roomsOnFloor.length} phòng còn sống</span>
            </div>
            <div class="h-row">${topRow.map(cell).join("")}</div>
            <div class="h-corridor">
              <span>╠══ HÀNH LANG TẦNG ${floorNum} ══</span>
              <span>CẦU THANG • BẢNG TIN ══╣</span>
            </div>
            <div class="h-row">${botRow.map(cell).join("")}</div>
          </div>`;
      }

      const allFloorsHtml = [5, 4, 3, 2, 1].map(buildFloorHtml).join("");

      function buildRankRows(filterMode) {
        return hub.ranked.filter(function (rm) {
          if (filterMode === "merge") return rm.count === 1 || rm.count === 2;
          if (filterMode === "open") return rm.count === 3;
          return true;
        }).map(function (rm) {
          const stCls = roomStatusClass(rm);
          const statusShort = rm.count <= 0 ? "💀 Xóa sổ" : (rm.count <= 2 ? "⚠️ Cần ghép" : (rm.count === 3 ? "🟡 Thiếu 1" : "🟢 Đủ"));
          return `
            <tr class="${stCls} ${rm.isUser ? "is-user" : ""}" data-rid="${esc(rm.id)}">
              <td style="font-family:var(--mono);font-weight:700;color:${rm.rank && rm.rank <= 3 ? "#ffd666" : "var(--muted)"};">${rm.rank ? "#" + rm.rank : "—"}</td>
              <td style="font-family:var(--mono);font-weight:700;">P.${esc(rm.id)} ${rm.isUser ? '<span class="h-badge-sm you">BẠN</span>' : ""}</td>
              <td>${esc(rm.school)}</td>
              <td style="font-family:var(--mono);">${esc(rm.count)}/4</td>
              <td style="font-family:var(--mono);font-weight:700;color:var(--accent);">${rm.count > 0 ? esc(rm.score) + " đ" : "0 đ"}</td>
              <td style="font-size:11px;">${statusShort}</td>
            </tr>`;
        }).join("") || `<tr><td colspan="6" class="d-empty" style="text-align:center;padding:10px;">Không có phòng nào khớp bộ lọc.</td></tr>`;
      }

      const limbsOk = String(user.limbs || "").toLowerCase().includes("lành");
      const validTabs = isOfficial ? ["dorm", "exam", "skill", "body", "help", "shop", "map"] : ["dorm", "exam", "skill", "body"];
      const reqTab = raw.activeTab === "rank" ? "map" : raw.activeTab;
      const initTab = validTabs.includes(reqTab) ? reqTab : "dorm";
      const initMapSub = raw.activeTab === "rank" ? "rank" : "grid";

      root.innerHTML = `
        <div class="dorm-wrap mode-${mode}">
          <div class="d-top">
            <div class="d-brand"><span>📱 SINH TỒN PHÒNG NGỦ</span><span class="d-badge">${modeLabels[mode]}</span></div>
            <div class="d-meta">
              <span>${esc(clock.time)}</span>
              ${clock.countdown ? `<span class="d-cd">⏳ ${esc(clock.countdown)}</span>` : ""}
            </div>
          </div>
          ${alertMsg ? `<div class="d-alert"><span>🔔</span><span>${esc(alertMsg)}</span></div>` : ""}
          <div class="d-grid">
            <aside class="d-side">
              <div class="d-id">
                <div class="d-name">${esc(user.name)}</div>
                <div class="d-sub">${esc(user.dorm)} • ${esc(user.school)}</div>
                <div class="d-curr-row">
                  <div class="d-curr"><div class="d-curr-l">Học phần</div><div class="d-curr-v">${esc(user.credits)}/100</div></div>
                  <div class="d-curr" style="${isOfficial ? "" : "opacity:0.45;"}"><div class="d-curr-l">Tích lũy</div><div class="d-curr-v acc">${isOfficial ? esc(user.points) + " đ" : "KHÓA"}</div></div>
                </div>
              </div>
              <div class="d-dots-box">
                <div class="d-mini-t"><span>Thành viên phòng</span><span>${esc(isOfficial ? userRankText : user.rank)}</span></div>
                <div class="d-dots">${dotsSideHtml}</div>
              </div>
              <nav class="d-nav">
                <button class="d-nav-btn ${initTab === "dorm" ? "active" : ""}" data-tab="dorm"><span>🏠 Tình hình phòng ngủ</span><span class="d-nav-tag">01</span></button>
                <button class="d-nav-btn ${initTab === "exam" ? "active" : ""}" data-tab="exam"><span>📝 Kiểm tra / Thi đấu</span><span class="d-nav-tag">02</span></button>
                <button class="d-nav-btn ${initTab === "skill" ? "active" : ""}" data-tab="skill"><span>✨ Đạo cụ / Dị năng</span><span class="d-nav-tag">03</span></button>
                <button class="d-nav-btn ${initTab === "body" ? "active" : ""}" data-tab="body"><span>🩺 Thông tin cơ thể</span><span class="d-nav-tag">04</span></button>
                <button class="d-nav-btn ${isOfficial ? (initTab === "help" ? "active" : "") : "locked"}" data-tab="help"><span>📖 Giải đáp thắc mắc</span><span class="d-nav-tag">${isOfficial ? "05" : "🔒"}</span></button>
                <button class="d-nav-btn ${isOfficial ? (initTab === "shop" ? "active" : "") : "locked"}" data-tab="shop"><span>🛒 Cửa hàng sinh viên</span><span class="d-nav-tag">${isOfficial ? "06" : "🔒"}</span></button>
                <button class="d-nav-btn ${isOfficial ? (initTab === "map" ? "active" : "") : "locked"}" data-tab="map"><span>🗺️ Khu 30 Phòng & BXH</span><span class="d-nav-tag">${isOfficial ? "07" : "🔒"}</span></button>
              </nav>
            </aside>
            <main class="d-main">
              <section class="d-pane ${initTab === "dorm" ? "active" : ""}" id="dp-dorm">
                <div class="d-card">
                  <div class="d-ctitle"><span>Bản đồ an toàn phòng ngủ</span><span style="color:${safetyMeta.col};">${safetyMeta.txt}</span></div>
                  <div class="d-bp">${mapHtml}</div>
                  <div class="d-cap ${safetyMeta.cap}">${esc(dormMap.note)}</div>
                </div>
                <div class="d-card">
                  <div class="d-ctitle"><span>Trạng thái các thành viên</span><span style="font-size:10px;color:var(--muted);">⚪ Trong phòng • ⚫ Ngoài phòng</span></div>
                  <div class="d-mlist">${membersHtml}</div>
                </div>
              </section>

              <section class="d-pane ${initTab === "exam" ? "active" : ""}" id="dp-exam">
                <div class="d-card">
                  <div class="d-ctitle"><span>${esc(exam.title)}</span><span style="font-size:10px;color:var(--muted);">${esc(clock.status)}</span></div>
                  ${missionsHtml}
                </div>
                ${choicesBlock}
                ${evalBlock}
                ${historyBlock}
              </section>

              <section class="d-pane ${initTab === "skill" ? "active" : ""}" id="dp-skill">
                <div class="d-card">
                  <div class="d-ctitle"><span>Dị năng thiên phú</span></div>
                  <div style="background:var(--panel-2);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
                    <div style="font-weight:700;color:var(--accent);font-size:14px;margin-bottom:3px;">⚡ ${esc(talent.item || "Chưa thức tỉnh")}</div>
                    <div style="color:var(--muted);font-size:12px;">${esc(talent.desc || "")}</div>
                  </div>
                </div>
                <div class="d-card"><div class="d-ctitle"><span>Kho đạo cụ & Vật phẩm</span></div>${itemsHtml}</div>
                <div class="d-card"><div class="d-ctitle"><span>Buff thành tựu & Đặc quyền</span></div>${buffsHtml}</div>
              </section>

              <section class="d-pane ${initTab === "body" ? "active" : ""}" id="dp-body">
                <div class="d-card">
                  <div class="d-ctitle"><span>Mức độ khỏe mạnh</span><span style="font-family:var(--mono);">${esc(user.hp)}/${esc(user.maxHp)}</span></div>
                  <div class="d-bar" style="height:11px;margin-bottom:8px;"><div class="d-fill ${userHpCls}" style="width:${userHpPct}%;"></div></div>
                  <div style="font-size:12px;color:var(--muted);">${esc(user.hpNote)}</div>
                </div>
                <div class="d-card"><div class="d-ctitle"><span>Bốn chỉ số thể chất</span></div><div class="d-stats">${statsHtml}</div></div>
                <div class="d-card">
                  <div class="d-ctitle"><span>Tình trạng tứ chi & Ngoại thương</span></div>
                  <div style="font-size:13px;font-weight:600;color:${limbsOk ? "var(--safe)" : "#ff7679"};">${esc(user.limbs)}</div>
                </div>
              </section>

              <section class="d-pane ${initTab === "help" ? "active" : ""}" id="dp-help">
                <div class="d-card">
                  <div class="d-ctitle"><span>Sổ tay Sinh viên chính thức</span></div>
                  <details class="d-acc" open>
                    <summary>🛡️ Khu Nội Trú Liên Hợp 30 Phòng & Giờ An Toàn</summary>
                    <p>30 phòng KTX sống sót toàn quốc được hợp nhất vào tòa nhà 5 tầng (101–506). Từ 20:00 đến 08:00 sáng hôm sau (và cả ngày Chủ Nhật) là Giờ An Toàn: được tự do đi lại hành lang, giao lưu, trao đổi và xin chuyển/ghép phòng. Mọi sinh viên bắt buộc thuộc một phòng có tối thiểu 3 người còn sống trước mốc 08:00; phòng tụt xuống 1–2 người buộc phải ghép phòng hoặc bị xóa sổ.</p>
                  </details>
                  <details class="d-acc">
                    <summary>📋 Quy tắc Kiểm tra, Trượt môn & Đặc quyền MVP</summary>
                    <p>Thứ Hai – Thứ Sáu lúc 08:00 mở 2–3 Quyển đề thi (đếm ngược 15 phút). Đạt &lt; 1 bài/tuần bị xóa sổ; đạt &ge; 3 bài/tuần mở Thi đấu ngoại khóa Thứ Bảy. Điểm tập thể &lt; 60 hoặc cá nhân Kém tính trượt môn (trừ 1 Học phần &amp; kích hoạt Phụ Đạo Đêm). Riêng MVP mỗi bài thi nhận thưởng Điểm tích lũy vượt trội, Buff đặc quyền cá nhân và 1 giấy 'Loại trừ rớt tín chỉ' cá nhân.</p>
                  </details>
                  <details class="d-acc">
                    <summary>🏆 BXH Tổng Điểm Phòng & Tốt Nghiệp 100 Học Phần</summary>
                    <p>BXH xếp hạng 30 phòng theo TỔNG ĐIỂM PHÒNG (biến động trực tiếp theo người chuyển đi, chuyển đến hoặc tử vong; điểm từng cá nhân được giữ bí mật). Học phần tính theo cá nhân — ai đạt đủ 100 Học phần sẽ mở riêng Bài thi tốt nghiệp để thoát ly vĩnh viễn.</p>
                  </details>
                  <button class="d-csbtn" id="d-cs-btn">💬 Chăm sóc khách hàng online (Tiêu hao 1 Học phần)</button>
                </div>
              </section>

              <section class="d-pane ${initTab === "shop" ? "active" : ""}" id="dp-shop">
                <div class="d-card">
                  <div class="d-ctitle"><span>Cửa hàng sinh viên</span><span style="font-family:var(--mono);">Số dư: ${esc(user.points)} điểm</span></div>
                  ${shopHtml}
                </div>
              </section>

              <section class="d-pane ${initTab === "map" ? "active" : ""}" id="dp-map">
                <div class="h-kpi">
                  <div class="h-ktile"><div class="h-knum">${aliveRooms}/30</div><div class="h-klbl">Phòng còn sống</div></div>
                  <div class="h-ktile"><div class="h-knum">${totalAliveStudents}/120</div><div class="h-klbl">Tổng sinh viên</div></div>
                  <div class="h-ktile"><div class="h-knum warn">${mergeAlertRooms} phòng</div><div class="h-klbl">Cần ghép (≤2)</div></div>
                  <div class="h-ktile"><div class="h-knum acc">${esc(userRankText)}</div><div class="h-klbl">Hạng (${esc(userRoomScoreText)})</div></div>
                </div>

                <div class="d-card" style="display:flex;flex-direction:column;gap:10px;">
                  <div class="h-toolbar">
                    <div class="h-pills" id="h-mode-pills">
                      <button class="h-pill ${initMapSub === "grid" ? "active" : ""}" data-hview="grid">🗺️ Sơ đồ 5 tầng</button>
                      <button class="h-pill ${initMapSub === "rank" ? "active" : ""}" data-hview="rank">🏆 BXH Tổng điểm</button>
                    </div>
                    <div class="h-pills" id="h-floor-pills" style="${initMapSub === "grid" ? "" : "display:none;"}">
                      <button class="h-pill active" data-fl="all">Tất cả</button>
                      <button class="h-pill" data-fl="5">T5</button>
                      <button class="h-pill" data-fl="4">T4</button>
                      <button class="h-pill" data-fl="3">T3</button>
                      <button class="h-pill" data-fl="2">T2</button>
                      <button class="h-pill" data-fl="1">T1</button>
                    </div>
                    <div class="h-pills" id="h-rank-pills" style="${initMapSub === "rank" ? "" : "display:none;"}">
                      <button class="h-pill active" data-rf="all">30 Phòng</button>
                      <button class="h-pill" data-rf="merge">⚠️ Cần ghép (≤2)</button>
                      <button class="h-pill" data-rf="open">🟡 Còn chỗ (3/4)</button>
                    </div>
                  </div>

                  <div class="h-detail" id="h-room-detail">${renderRoomDetailHtml(userHubRoom)}</div>

                  <div id="h-view-grid" style="${initMapSub === "grid" ? "" : "display:none;"}">
                    <div class="h-floor-wrap">${allFloorsHtml}</div>
                    <div class="h-legend" style="margin-top:8px;">
                      <span>🟢 3–4 người</span>
                      <span>🟠 2 người (Ghép!)</span>
                      <span>🔴 1 người (Nguy cấp)</span>
                      <span>✕ 0 người (Xóa sổ)</span>
                      <span>• Điểm cá nhân: ẨN</span>
                    </div>
                  </div>

                  <div id="h-view-rank" style="${initMapSub === "rank" ? "" : "display:none;"}overflow-x:auto;">
                    <table class="h-table">
                      <thead>
                        <tr><th>Hạng</th><th>Phòng</th><th>Khối trường</th><th>Nhân số</th><th>Tổng điểm</th><th>Trạng thái</th></tr>
                      </thead>
                      <tbody id="h-rank-tbody">${buildRankRows("all")}</tbody>
                    </table>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
        <div class="d-toast" id="d-toast"></div>
      `;

      const toast = root.querySelector("#d-toast");
      let tId;
      function notify(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = "block";
        clearTimeout(tId);
        tId = setTimeout(function () { toast.style.display = "none"; }, 2600);
      }

      root.querySelectorAll(".d-nav-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (btn.classList.contains("locked")) {
            notify("Chưa mở khóa! Cần vượt qua màn Tân thủ để thành Sinh viên chính thức.");
            return;
          }
          root.querySelectorAll(".d-nav-btn").forEach(function (b) { b.classList.remove("active"); });
          root.querySelectorAll(".d-pane").forEach(function (p) { p.classList.remove("active"); });
          btn.classList.add("active");
          const pane = root.querySelector("#dp-" + btn.dataset.tab);
          if (pane) pane.classList.add("active");
        });
      });

      root.querySelectorAll(".d-zone").forEach(function (z) {
        z.addEventListener("click", function () { notify(z.dataset.zmsg); });
      });
      root.querySelectorAll(".d-choice").forEach(function (c) {
        c.addEventListener("click", function () { c.classList.toggle("open"); });
      });
      root.querySelectorAll(".d-call:not(.off)").forEach(function (c) {
        c.addEventListener("click", function () {
          notify("Gõ /call " + c.dataset.call + " trong khung chat để liên lạc.");
        });
      });

      const csBtn = root.querySelector("#d-cs-btn");
      if (csBtn) {
        csBtn.addEventListener("click", function () {
          if ((Number(user.credits) || 0) < 1) notify("Không đủ 1 Học phần để dùng Chăm sóc khách hàng!");
          else notify("Gõ /cs [Câu hỏi] trong khung chat để tiêu hao 1 Học phần.");
        });
      }

      // === TAB 07 INTERACTIVITY ===
      const detailEl = root.querySelector("#h-room-detail");
      function bindRoomSelection() {
        root.querySelectorAll("[data-rid]").forEach(function (el) {
          el.addEventListener("click", function () {
            const rid = el.getAttribute("data-rid");
            const rm = hub.byId[rid];
            if (!rm || !detailEl) return;
            root.querySelectorAll(".h-room.sel").forEach(function (x) { x.classList.remove("sel"); });
            const card = root.querySelector('.h-room[data-rid="' + rid + '"]');
            if (card) card.classList.add("sel");
            detailEl.innerHTML = renderRoomDetailHtml(rm);
          });
        });
      }
      bindRoomSelection();

      const viewGrid = root.querySelector("#h-view-grid");
      const viewRank = root.querySelector("#h-view-rank");
      const floorPills = root.querySelector("#h-floor-pills");
      const rankPills = root.querySelector("#h-rank-pills");
      const rankTbody = root.querySelector("#h-rank-tbody");

      root.querySelectorAll("#h-mode-pills .h-pill").forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll("#h-mode-pills .h-pill").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          const v = btn.dataset.hview;
          if (viewGrid) viewGrid.style.display = v === "grid" ? "" : "none";
          if (floorPills) floorPills.style.display = v === "grid" ? "" : "none";
          if (viewRank) viewRank.style.display = v === "rank" ? "" : "none";
          if (rankPills) rankPills.style.display = v === "rank" ? "" : "none";
        });
      });

      root.querySelectorAll("#h-floor-pills .h-pill").forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll("#h-floor-pills .h-pill").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          const fl = btn.dataset.fl;
          root.querySelectorAll(".h-floor").forEach(function (f) {
            f.style.display = (fl === "all" || f.dataset.floor === fl) ? "" : "none";
          });
        });
      });

      root.querySelectorAll("#h-rank-pills .h-pill").forEach(function (btn) {
        btn.addEventListener("click", function () {
          root.querySelectorAll("#h-rank-pills .h-pill").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          if (rankTbody) {
            rankTbody.innerHTML = buildRankRows(btn.dataset.rf);
            bindRoomSelection();
          }
        });
      });
    } catch (err) {
      root.innerHTML = `<div class="d-err">⚠️ Lỗi hiển thị Dorm App: ${esc(err && err.message ? err.message : err)}</div>`;
    }
  }

  window.initDormApp = renderDormApp;

  function boot() {
    if (window.DORM_STATE) {
      renderDormApp(window.DORM_STATE);
    } else {
      const root = document.getElementById("dorm-app-root") || document.body;
      if (root) {
        root.innerHTML = '<div style="background:#260b0d;color:#ffb3b5;border:1px solid #e0313d;border-radius:8px;padding:10px 12px;font-family:monospace;font-size:12px;">⚠️ Không đọc được dữ liệu window.DORM_STATE (có thể AI viết sai cú pháp JS).</div>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
