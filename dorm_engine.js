(function () {
  const root = document.getElementById("dorm-app-root") || document.body;
  const raw = window.DORM_STATE || {};

  // Neutral fallbacks — tuyệt đối không chứa tên nhân vật hay cốt truyện cứng
  const mode = ["pre", "temp", "official"].includes((raw.mode || "").toLowerCase())
    ? raw.mode.toLowerCase()
    : "pre";

  const user = Object.assign(
    {
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
    },
    raw.user || {}
  );

  const clock = Object.assign(
    { time: "Ngày 1 • 20:00", countdown: "--:--", status: "" },
    raw.clock || {}
  );

  const dormMap = Object.assign(
    { door: "g", beds: "g", desk: "g", bath: "g", balcony: "g", note: "Chưa có dữ liệu quét an toàn." },
    raw.dormMap || {}
  );

  const team = Array.isArray(raw.team) ? raw.team : [];
  const exam = Object.assign(
    { title: "Chưa kích hoạt bài kiểm tra", missions: [], choices: [], evaluation: null, history: [] },
    raw.exam || {}
  );
  const shop = Array.isArray(raw.shop) ? raw.shop : [];
  const alertMsg = raw.alert || "";

  // Inject CSS once
  if (!document.getElementById("dorm-engine-style")) {
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
      .dorm-wrap.mode-official {
        --bg: #090607; --panel: #120b0d; --panel-2: #1b1013; --border: #421b22;
        --text: #f5ecee; --muted: #a6858c; --accent: #e0313d; --accent-soft: rgba(224,49,61,0.16);
      }
      .dorm-wrap.mode-pre {
        --bg: #070708; --panel: #101012; --panel-2: #17171a; --border: #333338;
        --accent: #d9383a; --accent-soft: rgba(217,56,58,0.15);
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: #070708; font-family: var(--sans); font-size: 13px; line-height: 1.45; }
      .dorm-wrap {
        display: flex; flex-direction: column; height: 100vh; min-height: 520px; width: 100%;
        color: var(--text); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
        background: radial-gradient(circle at top right, var(--accent-soft), transparent 45%), var(--bg);
      }
      .d-top {
        display: flex; align-items: center; justify-content: space-between; padding: 8px 14px;
        background: var(--panel); border-bottom: 1px solid var(--border); gap: 10px; flex-shrink: 0;
      }
      .d-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.4px; }
      .d-badge {
        font-size: 10px; font-family: var(--mono); padding: 2px 7px; border-radius: 99px;
        border: 1px solid var(--accent); color: var(--accent); background: var(--accent-soft); text-transform: uppercase;
      }
      .d-meta { display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 11.5px; color: var(--muted); }
      .d-cd { color: var(--accent); font-weight: 700; padding: 2px 8px; border-radius: 6px; background: var(--accent-soft); border: 1px solid var(--border); }
      .d-alert {
        background: rgba(217,56,58,0.14); border-bottom: 1px solid rgba(217,56,58,0.35);
        color: #ff9497; padding: 5px 14px; font-size: 12px; display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      }
      .d-grid { display: grid; grid-template-columns: 240px 1fr; flex: 1; min-height: 0; }
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
      .d-mini-t { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 6px; display: flex; justify-content: space-between; }
      .d-dots { display: flex; justify-content: space-around; align-items: center; padding: 3px 0; }
      .d-dot-i { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; color: var(--muted); }
      .d-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #555; background: #08080a; }
      .d-dot.in { background: #f4f4f6; border-color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.6); }
      .d-dot.dead { background: #2b0b0c; border-color: var(--danger); position: relative; }
      .d-dot.dead::after { content: "×"; color: var(--danger); font-weight: 700; font-size: 13px; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
      .d-nav { display: flex; flex-direction: column; gap: 5px; }
      .d-nav-btn {
        width: 100%; text-align: left; background: transparent; color: var(--text); border: 1px solid transparent;
        border-radius: 8px; padding: 8px 10px; cursor: pointer; font-size: 12.5px;
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
        color: var(--accent); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;
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
      .d-mhead { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 12.5px; }
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
      .d-toast { position: fixed; bottom: 12px; right: 14px; background: #1d1013; border: 1px solid var(--accent); color: #fff; padding: 7px 12px; border-radius: 8px; font-size: 12px; display: none; z-index: 99; }
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      @media (max-width: 680px) {
        .d-grid { grid-template-columns: 1fr; overflow-y: auto; }
        .d-side { border-right: none; border-bottom: 1px solid var(--border); }
        .d-mlist, .d-stats, .d-eval { grid-template-columns: 1fr 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function pct(cur, max) {
    const m = Math.max(1, Number(max) || 100);
    const c = Math.max(0, Number(cur) || 0);
    return Math.min(100, Math.round((c / m) * 100));
  }

  const modeLabels = { pre: "Tiền trò chơi", temp: "Học sinh tạm thời", official: "Học sinh chính thức" };
  const isOfficial = mode === "official";
  const zCodes = { g: "Xanh lá • An toàn", y: "Vàng • Dị thường", r: "Đỏ • Xâm nhập!" };
  const mapZones = [
    { key: "door", name: "🚪 Cửa chính", cls: "" },
    { key: "beds", name: "🛏️ Khu Giường 1–4", cls: "span2" },
    { key: "desk", name: "📚 Bàn học & Tủ", cls: "" },
    { key: "bath", name: "🚰 Bồn rửa & WC", cls: "" },
    { key: "balcony", name: "🪟 Ban công", cls: "" }
  ];

  let worst = "g";
  const mapHtml = mapZones.map(z => {
    const c = ["g", "y", "r"].includes(dormMap[z.key]) ? dormMap[z.key] : "g";
    if (c === "r") worst = "r";
    else if (c === "y" && worst !== "r") worst = "y";
    return `<div class="d-zone z-${c} ${z.cls}" data-zmsg="${esc(z.name + ': ' + zCodes[c])}"><strong>${z.name}</strong><span class="d-zst">${zCodes[c]}</span></div>`;
  }).join("");

  const safetyMeta = worst === "r"
    ? { txt: "NGUY HIỂM", col: "#ff7679", cap: "danger" }
    : worst === "y"
      ? { txt: "CẢNH BÁO", col: "#ffd28a", cap: "warn" }
      : { txt: "AN TOÀN", col: "#7ef2b1", cap: "" };

  const dotsHtml = team.length
    ? team.map(m => {
        const cls = m.alive === false ? "dead" : (m.inRoom ? "in" : "");
        return `<div class="d-dot-i" title="${esc(m.name)}"><div class="d-dot ${cls}"></div><span>${esc(m.bed || "G?")}</span></div>`;
      }).join("")
    : `<div class="d-empty">Chưa có dữ liệu thành viên</div>`;

  const membersHtml = team.length
    ? team.map(m => {
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
            <div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;">
              <span>Vai trò: ${esc(m.role || "Học sinh")}</span>
              <span style="font-family:var(--mono);">${alive ? esc(m.hp + "/" + (m.maxHp || 100)) : "ĐÃ MẤT"}</span>
            </div>
            <div class="d-bar"><div class="d-fill ${bCls}" style="width:${alive ? p : 0}%;"></div></div>
          </div>`;
      }).join("")
    : `<div class="d-empty">Chưa khởi tạo đội phòng ngủ.</div>`;

  const missionsHtml = exam.missions.length
    ? exam.missions.map(ms => {
        const obj = typeof ms === "string" ? { text: ms, status: "active" } : ms;
        const st = obj.status || "active";
        const tag = st === "done" ? "HOÀN THÀNH" : st === "fail" ? "THẤT BẠI" : "ĐANG LÀM";
        return `<div class="d-mis ${st}"><span>▸ ${esc(obj.text)}</span><span class="d-mtag">${tag}</span></div>`;
      }).join("")
    : `<div class="d-empty">Hiện chưa có nhiệm vụ nào được kích hoạt.</div>`;

  const choicesHtml = exam.choices && exam.choices.length
    ? `<div class="d-card">
         <div class="d-ctitle"><span>Đề thi đang mở (Bấm từng quyển để xem chú thích)</span></div>
         ${exam.choices.map(ch => `
           <div class="d-choice">
             <div class="d-ch-t"><span>${esc(ch.code ? ch.code + ": " : "")}${esc(ch.title)}</span><span style="font-size:11px;color:var(--muted);">▾ Xem</span></div>
             <div class="d-ch-d">
               <div>${esc(ch.intro || "")}</div>
               ${ch.note ? `<div class="d-ch-n">[Chú thích: ${esc(ch.note)}]</div>` : ""}
             </div>
           </div>`).join("")}
       </div>`
    : "";

  const evalHtml = exam.evaluation
    ? `<div class="d-card">
         <div class="d-ctitle"><span>Đánh giá thành tích gần nhất</span><span>${esc(exam.evaluation.grade || "")}</span></div>
         <div class="d-eval">
           <div class="d-ecell"><div class="d-ek">Bài kiểm tra</div><div class="d-ev">${esc(exam.evaluation.testName)}</div></div>
           <div class="d-ecell"><div class="d-ek">Sát thương</div><div class="d-ev">${esc(exam.evaluation.dmg)}</div></div>
           <div class="d-ecell"><div class="d-ek">Kháng ST</div><div class="d-ev">${esc(exam.evaluation.tank)}</div></div>
           <div class="d-ecell"><div class="d-ek">Hỗ trợ</div><div class="d-ev">${esc(exam.evaluation.sup)}</div></div>
           <div class="d-ecell"><div class="d-ek">Điểm hiệu quả</div><div class="d-ev">${esc(exam.evaluation.eff)}</div></div>
           <div class="d-ecell"><div class="d-ek">Thành tựu</div><div class="d-ev">${esc(exam.evaluation.ach)}</div></div>
           <div class="d-ecell" style="grid-column:span 3;"><div class="d-ek">Thành tích tập thể phòng ngủ</div><div class="d-ev">${esc(exam.evaluation.teamScore || "--")} ${exam.evaluation.teamGrade ? "• " + esc(exam.evaluation.teamGrade) : ""}</div></div>
         </div>
       </div>`
    : "";

  const historyHtml = exam.history && exam.history.length
    ? `<div class="d-card"><div class="d-ctitle"><span>Lịch sử bài kiểm tra</span></div>${
        exam.history.map(h => `<div class="d-mis done"><span>${esc(h.name)} (${esc(h.score)})</span><span class="d-mtag">${esc(h.reward)}</span></div>`).join("")
      }</div>`
    : "";

  const itemsHtml = user.items.length
    ? user.items.map(it => `<div style="padding:6px 9px;background:var(--panel-2);border:1px solid var(--border);border-radius:7px;margin-bottom:6px;">🎒 ${esc(it)}</div>`).join("")
    : `<div class="d-empty">Túi đồ trống.</div>`;

  const buffsHtml = user.buffs.length
    ? user.buffs.map(bf => `<div style="padding:6px 9px;background:var(--accent-soft);border:1px solid var(--border);border-radius:7px;margin-bottom:6px;font-size:12px;">✦ ${esc(bf)}</div>`).join("")
    : `<div class="d-empty">Chưa có buff thành tựu nào.</div>`;

  const userHpPct = pct(user.hp, user.maxHp);
  const userHpCls = userHpPct <= 30 ? "low" : (userHpPct <= 65 ? "mid" : "");
  const statLabels = ["Thể lực", "Sức mạnh", "Tốc độ", "Tinh thần"];
  const statsHtml = statLabels.map((lbl, i) =>
    `<div class="d-stile"><div class="d-snum">${esc((user.stats && user.stats[i] != null) ? user.stats[i] : 10)}</div><div class="d-slbl">${lbl}</div></div>`
  ).join("");

  const shopHtml = shop.length
    ? shop.map(it => {
        const cost = Number(it.price) || 0;
        const ok = (Number(user.points) || 0) >= cost;
        return `
          <div class="d-sitem">
            <div>
              <div style="font-weight:700;font-size:12.5px;">${esc(it.name)} ${it.stock ? `<small style="color:var(--muted);font-weight:400;">(${esc(it.stock)})</small>` : ""}</div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${esc(it.desc || "")}</div>
            </div>
            <div class="d-price ${ok ? "ok" : "no"}">${cost} điểm</div>
          </div>`;
      }).join("")
    : `<div class="d-empty">Cửa hàng hiện đang đóng hoặc chưa tải danh mục.</div>`;

  const limbsOk = String(user.limbs || "").toLowerCase().includes("lành");

  root.innerHTML = `
    <div class="dorm-wrap mode-${mode}">
      <div class="d-top">
        <div class="d-brand">
          <span>📱 SINH TỒN PHÒNG NGỦ</span>
          <span class="d-badge">${modeLabels[mode]}</span>
        </div>
        <div class="d-meta">
          <span>${esc(clock.time)}</span>
          <span class="d-cd">⏳ ${esc(clock.countdown)}</span>
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
            <div class="d-mini-t"><span>4 thành viên</span><span>${esc(user.rank)}</span></div>
            <div class="d-dots">${dotsHtml}</div>
          </div>
          <nav class="d-nav">
            <button class="d-nav-btn active" data-tab="dorm"><span>🏠 Tình hình phòng ngủ</span><span class="d-nav-tag">01</span></button>
            <button class="d-nav-btn" data-tab="exam"><span>📝 Kiểm tra / Thi đấu</span><span class="d-nav-tag">02</span></button>
            <button class="d-nav-btn" data-tab="skill"><span>✨ Đạo cụ / Dị năng</span><span class="d-nav-tag">03</span></button>
            <button class="d-nav-btn" data-tab="body"><span>🩺 Thông tin cơ thể</span><span class="d-nav-tag">04</span></button>
            <button class="d-nav-btn ${isOfficial ? "" : "locked"}" data-tab="help"><span>📖 Giải đáp thắc mắc</span><span class="d-nav-tag">${isOfficial ? "05" : "🔒"}</span></button>
            <button class="d-nav-btn ${isOfficial ? "" : "locked"}" data-tab="shop"><span>🛒 Cửa hàng học sinh</span><span class="d-nav-tag">${isOfficial ? "06" : "🔒"}</span></button>
          </nav>
        </aside>
        <main class="d-main">
          <section class="d-pane active" id="dp-dorm">
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

          <section class="d-pane" id="dp-exam">
            <div class="d-card">
              <div class="d-ctitle"><span>${esc(exam.title)}</span><span style="font-size:10px;color:var(--muted);">${esc(clock.status)}</span></div>
              ${missionsHtml}
            </div>
            ${choicesHtml}
            ${evalHtml}
            ${historyHtml}
          </section>

          <section class="d-pane" id="dp-skill">
            <div class="d-card">
              <div class="d-ctitle"><span>Dị năng thiên phú</span></div>
              <div style="background:var(--panel-2);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
                <div style="font-weight:700;color:var(--accent);font-size:14px;margin-bottom:3px;">⚡ ${esc(user.talent.item || "Chưa thức tỉnh")}</div>
                <div style="color:var(--muted);font-size:12px;">${esc(user.talent.desc || "")}</div>
              </div>
            </div>
            <div class="d-card"><div class="d-ctitle"><span>Kho đạo cụ & Vật phẩm</span></div>${itemsHtml}</div>
            <div class="d-card"><div class="d-ctitle"><span>Buff thành tựu</span></div>${buffsHtml}</div>
          </section>

          <section class="d-pane" id="dp-body">
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

          <section class="d-pane" id="dp-help">
            <div class="d-card">
              <div class="d-ctitle"><span>Sổ tay Học sinh chính thức</span></div>
              <details class="d-acc" open>
                <summary>🛡️ Hướng dẫn an toàn trong phòng ngủ</summary>
                <p>Sau khi hoàn thành bài kiểm tra ngày, từ 20:00 đến 08:00 sáng hôm sau (và ngày Chủ Nhật) là thời gian an toàn tuyệt đối để nghỉ ngơi và hồi phục ô nhiễm tinh thần nhẹ.</p>
              </details>
              <details class="d-acc">
                <summary>📋 Quy tắc kiểm tra & Thi đấu</summary>
                <p>Thứ Hai – Thứ Sáu là thời gian học tập (08:00 làm mới 3 Quyển đề thi, đếm ngược 15 phút). Đạt &lt; 1 bài/tuần: loại bỏ cả phòng ngủ. Đạt &gt; 3 bài/tuần: cuối tuần được báo danh Thi đấu ngoại khóa. Chủ Nhật làm mới Bảng xếp hạng 985/211 toàn cầu.</p>
              </details>
              <details class="d-acc">
                <summary>🎓 Chế độ học phần (Tốt nghiệp)</summary>
                <p>Toàn bộ thành viên còn sống trong phòng ngủ đạt từ 100 Học phần trở lên sẽ mở Bài thi tốt nghiệp để trở về thế giới thực.</p>
              </details>
              <button class="d-csbtn" id="d-cs-btn">💬 Chăm sóc khách hàng online (Tiêu hao 1 Học phần)</button>
            </div>
          </section>

          <section class="d-pane" id="dp-shop">
            <div class="d-card">
              <div class="d-ctitle"><span>Cửa hàng học sinh</span><span style="font-family:var(--mono);">Số dư: ${esc(user.points)} điểm</span></div>
              ${shopHtml}
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
    toast.textContent = msg;
    toast.style.display = "block";
    clearTimeout(tId);
    tId = setTimeout(() => (toast.style.display = "none"), 2500);
  }

  root.querySelectorAll(".d-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("locked")) {
        notify("Chưa mở khóa! Cần vượt qua màn Tân thủ để thành Học sinh chính thức.");
        return;
      }
      root.querySelectorAll(".d-nav-btn").forEach(b => b.classList.remove("active"));
      root.querySelectorAll(".d-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      root.querySelector("#dp-" + btn.dataset.tab).classList.add("active");
    });
  });

  root.querySelectorAll(".d-zone").forEach(z => {
    z.addEventListener("click", () => notify(z.dataset.zmsg));
  });

  root.querySelectorAll(".d-choice").forEach(c => {
    c.addEventListener("click", () => c.classList.toggle("open"));
  });

  root.querySelectorAll(".d-call:not(.off)").forEach(c => {
    c.addEventListener("click", () => notify(`Gõ /call ${c.dataset.call} trong khung chat để liên lạc.`));
  });

  const csBtn = root.querySelector("#d-cs-btn");
  if (csBtn) {
    csBtn.addEventListener("click", () => {
      if ((Number(user.credits) || 0) < 1) notify("Không đủ 1 Học phần để dùng Chăm sóc khách hàng!");
      else notify("Gõ `/cs [Câu hỏi]` trong khung chat để tiêu hao 1 Học phần.");
    });
  }
})();
