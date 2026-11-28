(function () {
  const root = document.getElementById("b1-arcade-root");
  if (!root || !window.ARCADE_B1) return;
  const d = window.ARCADE_B1;

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const isRedSuit = (c) => /[♥♦]/.test(c);
  const parseCard = (raw) => {
    const s = String(raw || "?").trim();
    if (s === "?" || s === "??") return { hidden: true };
    const clean = s.replace(/\uFE0F/g, "");
    const m = clean.match(/^([0-9JQKAa]+)\s*([♠♣♥♦])/);
    if (m) return { hidden: false, rank: m[1].toUpperCase(), suit: m[2], red: isRedSuit(m[2]) };
    return { hidden: false, rank: clean, suit: "", red: isRedSuit(clean) };
  };

  const renderCard = (raw, small) => {
    const c = parseCard(raw);
    if (c.hidden) {
      return `<div class="b1-card b1-card-back${small ? " sm" : ""}"><div class="b1-card-pattern">?</div></div>`;
    }
    return `<div class="b1-card${c.red ? " red" : ""}${small ? " sm" : ""}">
      <span class="b1-c-top">${esc(c.rank)}</span>
      <span class="b1-c-mid">${esc(c.suit || c.rank)}</span>
      <span class="b1-c-bot">${esc(c.rank)}</span>
    </div>`;
  };

  const diePips = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const renderDie = (val, sealed) => {
    if (sealed || val === "?" || !diePips[val]) {
      return `<div class="b1-die sealed">?</div>`;
    }
    const active = diePips[val];
    let cells = "";
    for (let i = 0; i < 9; i++) {
      cells += `<i class="${active.includes(i) ? "on" : ""}${val === 1 || val === 4 ? " crimson" : ""}"></i>`;
    }
    return `<div class="b1-die">${cells}</div>`;
  };

  const css = `
  #b1-arcade-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:680px;margin:14px auto;color:#e8eaef;box-sizing:border-box}
  #b1-arcade-root *{box-sizing:border-box}
  .b1-shell{position:relative;background:radial-gradient(ellipse at top,#141923 0%,#0b0d12 72%);border:1px solid #2b2329;border-radius:14px;overflow:hidden;box-shadow:0 14px 36px rgba(0,0,0,.62),inset 0 0 0 1px rgba(220,38,56,.14)}
  .b1-shell::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);pointer-events:none}
  .b1-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:13px 16px;background:linear-gradient(90deg,rgba(190,24,45,.22),rgba(17,24,39,.75));border-bottom:1px solid rgba(220,38,56,.28)}
  .b1-title{font-size:15px;font-weight:800;letter-spacing:.4px;color:#fff;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .b1-badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:2px 7px;border-radius:4px;background:rgba(220,38,56,.2);border:1px solid rgba(248,113,113,.45);color:#fca5a5}
  .b1-sub{font-size:11.5px;color:#9aa3b2;margin-top:3px}
  .b1-lock{font-size:10.5px;font-weight:700;color:#7dd3fc;background:rgba(14,165,233,.12);border:1px solid rgba(56,189,248,.35);padding:4px 8px;border-radius:6px;white-space:nowrap}
  .b1-escrow-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:9px 16px;background:#10131a;border-bottom:1px solid #1f2430;font-size:12px}
  .b1-escrow-item{display:flex;align-items:center;gap:6px;color:#cbd5e1}
  .b1-escrow-item b{color:#fbbf24}
  .b1-escrow-item.pot b{color:#f87171;font-size:13px}
  .b1-felt{padding:15px 16px;background:radial-gradient(circle at 50% 35%,rgba(16,62,48,.34),rgba(11,15,20,.92) 76%)}
  .b1-comm-wrap{text-align:center;margin-bottom:14px;padding:10px;border-radius:10px;background:rgba(0,0,0,.32);border:1px dashed rgba(148,163,184,.24)}
  .b1-comm-label{font-size:10.5px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:8px}
  .b1-comm-row{display:flex;justify-content:center;gap:7px;flex-wrap:wrap}
  .b1-seats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
  .b1-seat{background:rgba(15,19,28,.86);border:1px solid #262c3a;border-radius:10px;padding:11px 12px;transition:.2s}
  .b1-seat.user{border-color:rgba(56,189,248,.45);background:rgba(14,25,38,.9)}
  .b1-seat.active{border-color:#ef4444;box-shadow:0 0 0 1px rgba(239,68,68,.35),0 0 18px rgba(220,38,56,.18)}
  .b1-seat.folded{opacity:.48;filter:grayscale(.6)}
  .b1-seat-top{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}
  .b1-seat-name{font-size:13px;font-weight:700;color:#f8fafc}
  .b1-seat-tag{font-size:10.5px;color:#94a3b8}
  .b1-score{font-size:11px;font-weight:800;padding:2px 7px;border-radius:99px;background:#1e293b;color:#fde047;border:1px solid rgba(250,204,21,.35)}
  .b1-seat-meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9ca3af;margin-bottom:9px;gap:6px;flex-wrap:wrap}
  .b1-status{font-weight:700;color:#e2e8f0}
  .b1-seat.active .b1-status{color:#f87171}
  .b1-blind{font-size:10px;font-weight:800;padding:1px 6px;border-radius:4px;background:rgba(245,158,11,.18);border:1px solid rgba(251,191,36,.45);color:#fcd34d}
  .b1-cards{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .b1-card{width:46px;height:66px;border-radius:6px;background:linear-gradient(160deg,#ffffff,#e5e7eb);color:#111827;border:1px solid #cbd5e1;box-shadow:0 4px 10px rgba(0,0,0,.45);display:flex;flex-direction:column;justify-content:space-between;padding:4px 5px;font-weight:800;position:relative;user-select:none}
  .b1-card.sm{width:42px;height:60px}
  .b1-card.red{color:#dc2626}
  .b1-c-top{font-size:11px;line-height:1}
  .b1-c-mid{font-size:19px;text-align:center;line-height:1}
  .b1-c-bot{font-size:11px;line-height:1;text-align:right;transform:rotate(180deg)}
  .b1-card-back{background:linear-gradient(135deg,#2b0a12,#14070b);border:1px solid #991b1b;align-items:center;justify-content:center;padding:3px}
  .b1-card-pattern{width:100%;height:100%;border:1px dashed rgba(248,113,113,.55);border-radius:4px;display:flex;align-items:center;justify-content:center;color:#f87171;font-size:18px;font-weight:900}
  .b1-card-empty{width:42px;height:60px;border-radius:6px;border:1px dashed rgba(148,163,184,.28);background:rgba(255,255,255,.02)}
  .b1-bid-banner{text-align:center;padding:10px;border-radius:9px;background:rgba(220,38,56,.12);border:1px solid rgba(248,113,113,.35);margin-bottom:12px}
  .b1-bid-banner .lbl{font-size:10.5px;text-transform:uppercase;color:#fca5a5;letter-spacing:.8px}
  .b1-bid-banner .val{font-size:16px;font-weight:800;color:#fff;margin-top:2px}
  .b1-dice-row{display:flex;gap:7px;flex-wrap:wrap}
  .b1-die{width:34px;height:34px;border-radius:7px;background:#f8fafc;border:1px solid #cbd5e1;padding:4px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:2px;box-shadow:0 3px 8px rgba(0,0,0,.45)}
  .b1-die i{display:block;border-radius:50%;background:transparent}
  .b1-die i.on{background:#111827}
  .b1-die i.on.crimson{background:#dc2626}
  .b1-die.sealed{display:flex;align-items:center;justify-content:center;background:#1f2430;border-color:#475569;color:#94a3b8;font-weight:800;font-size:15px}
  .b1-claw{padding:14px;border-radius:10px;background:rgba(15,23,42,.75);border:1px solid rgba(56,189,248,.35);text-align:center}
  .b1-claw-title{font-size:14px;font-weight:800;color:#7dd3fc}
  .b1-claw-item{margin:10px auto;display:inline-block;padding:8px 14px;border-radius:8px;background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.45);color:#fef08a;font-size:13.5px;font-weight:800}
  .b1-claw-note{font-size:12px;color:#cbd5e1}
  .b1-result{margin-top:12px;padding:11px 14px;border-radius:9px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px}
  .b1-result.win{background:rgba(22,163,74,.18);border:1px solid rgba(74,222,128,.5);color:#dcfce7}
  .b1-result.lose,.b1-result.penalty{background:rgba(220,38,56,.2);border:1px solid rgba(248,113,113,.55);color:#fee2e2}
  .b1-result.draw{background:rgba(148,163,184,.16);border:1px solid rgba(148,163,184,.4);color:#e2e8f0}
  .b1-res-amt{font-size:14px;font-weight:900}
  .b1-foot{padding:8px 16px;background:#0a0c10;border-top:1px solid #1b202b;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;gap:8px;flex-wrap:wrap}
  .b1-foot b{color:#e2e8f0}
  `;

  let bodyHtml = "";
  const g = String(d.game || "blackjack").toLowerCase();

  if (g === "liarsdice" && d.dice) {
    const ld = d.dice;
    const seats = (ld.seats || [])
      .map(
        (s) => `<div class="b1-seat${s.isUser ? " user" : ""}${s.active ? " active" : ""}">
        <div class="b1-seat-top">
          <div><div class="b1-seat-name">${esc(s.name)}</div><div class="b1-seat-tag">${esc(s.tag || "")}</div></div>
          <span class="b1-status">${s.sealed ? "🔒 Đang úp ly" : "🔓 Đã mở ly"}</span>
        </div>
        <div class="b1-dice-row">${(s.dice || []).map((v) => renderDie(v, s.sealed && !s.isUser)).join("")}</div>
      </div>`
      )
      .join("");
    bodyHtml = `
      <div class="b1-bid-banner">
        <div class="lbl">Mức khai hiện tại • ${esc(ld.bidder || "Chưa khai")}</div>
        <div class="val">🎲 ${esc(ld.currentBid || "Bắt đầu lắc ly")}</div>
      </div>
      <div class="b1-seats">${seats}</div>`;
  } else if (g === "claw" && d.claw) {
    const cl = d.claw;
    bodyHtml = `<div class="b1-claw">
      <div class="b1-claw-title">🕹️ ${esc(cl.machine || "Máy Gắp Thú B1")} • Phí: ${esc(cl.cost || "2 Điểm")}</div>
      <div class="b1-claw-item">${esc(cl.status || "Đang thả kẹp")} — ${esc(cl.item || "...")}</div>
      ${cl.note ? `<div class="b1-claw-note">${esc(cl.note)}</div>` : ""}
    </div>`;
  } else {
    let commHtml = "";
    if (g === "texas") {
      const cards = d.community || [];
      let slots = cards.map((c) => renderCard(c, true)).join("");
      for (let i = cards.length; i < 5; i++) slots += `<div class="b1-card-empty"></div>`;
      commHtml = `<div class="b1-comm-wrap"><div class="b1-comm-label">Bài Chung (Community)</div><div class="b1-comm-row">${slots}</div></div>`;
    }
    const seats = (d.seats || [])
      .map(
        (s) => `<div class="b1-seat${s.isUser ? " user" : ""}${s.active ? " active" : ""}${s.folded ? " folded" : ""}">
        <div class="b1-seat-top">
          <div>
            <div class="b1-seat-name">${esc(s.name)}</div>
            <div class="b1-seat-tag">${esc(s.tag || "")}</div>
          </div>
          ${s.score ? `<span class="b1-score">${esc(s.score)}</span>` : ""}
        </div>
        <div class="b1-seat-meta">
          <span>Cược: <b>${esc(s.stake || "0")}</b></span>
          ${s.blind ? `<span class="b1-blind">ĐÁNH MÙ</span>` : ""}
          <span class="b1-status">${esc(s.status || "")}</span>
        </div>
        <div class="b1-cards">${(s.cards || []).map((c) => renderCard(c, false)).join("")}</div>
      </div>`
      )
      .join("");
    bodyHtml = `${commHtml}<div class="b1-seats">${seats}</div>`;
  }

  let resHtml = "";
  if (d.result) {
    const r = d.result;
    resHtml = `<div class="b1-result ${esc(r.status || "draw")}">
      <div><b>${esc(r.title || "CHỐT KHẾ ƯỚC APP")}</b><div style="font-size:11.5px;opacity:.9">${esc(r.note || "")}</div></div>
      <div class="b1-res-amt">${esc(r.transfer || "")}</div>
    </div>`;
  }

  root.innerHTML = `<style>${css}</style>
  <div class="b1-shell">
    <div class="b1-head">
      <div>
        <div class="b1-title"><span>${esc(d.title || "Sảnh B1")}</span><span class="b1-badge">${esc(d.round || "Đang cược")}</span></div>
        <div class="b1-sub">${esc(d.booth || "Khu Giải Trí Tầng Hầm B1")}</div>
      </div>
      <div class="b1-lock">🔒 VÔ HIỆU DỊ NĂNG</div>
    </div>
    <div class="b1-escrow-bar">
      <div class="b1-escrow-item">📜 <b>${esc(d.escrow || "Khế ước App Escrow")}</b></div>
      ${d.pot ? `<div class="b1-escrow-item pot">💰 Tổng cược: <b>${esc(d.pot)}</b></div>` : ""}
      ${d.toCall ? `<div class="b1-escrow-item">⚡ Theo cược: <b>${esc(d.toCall)}</b></div>` : ""}
    </div>
    <div class="b1-felt">${bodyHtml}${resHtml}</div>
    <div class="b1-foot">
      <span>Lượt hiện tại: <b>${esc(d.turn || "—")}</b></span>
      <span>APP ESCROW • CHUYỂN KHOẢN TỰ ĐỘNG</span>
    </div>
  </div>`;
})();
