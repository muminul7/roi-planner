import { useState, useCallback } from "react";

const defaultState = {
  bizName: "Geek Studio",
  currency: "৳",
  amortYears: 5,
  utilization: 60,
  growthRate: 5,
  capex: [
    { id: 1, name: "Equipment & Camera", note: "Primary tools", amt: 150000 },
    { id: 2, name: "Computer / Workstation", note: "Editing setup", amt: 80000 },
    { id: 3, name: "Studio Setup", note: "Backdrop, lights, props", amt: 60000 },
    { id: 4, name: "Software Licenses", note: "Adobe, AI tools", amt: 20000 },
    { id: 5, name: "Miscellaneous", note: "Accessories, contingency", amt: 20000 },
  ],
  opex: [
    { id: 1, name: "Studio Rent", note: "Monthly", amt: 20000 },
    { id: 2, name: "Staff Salary", note: "Editor + Coordinator", amt: 40000 },
    { id: 3, name: "Utilities & Internet", note: "Electricity, internet", amt: 6000 },
    { id: 4, name: "Software Subscriptions", note: "Monthly tools", amt: 8000 },
    { id: 5, name: "Marketing", note: "Ads, promotion", amt: 10000 },
    { id: 6, name: "Miscellaneous", note: "Operational", amt: 5000 },
  ],
  rev: [
    { id: 1, name: "Photo Shoot (Product/Corporate)", note: "Per session", price: 8000, qty: 10 },
    { id: 2, name: "Video Production (Brand/Ad)", note: "Per video", price: 20000, qty: 4 },
    { id: 3, name: "Social Media Package", note: "Monthly retainer/client", price: 12000, qty: 4 },
    { id: 4, name: "Event Coverage", note: "Per event", price: 25000, qty: 2 },
    { id: 5, name: "Reels / Short-form Content", note: "Per piece", price: 3000, qty: 12 },
  ],
};

let nextId = 100;
const uid = () => ++nextId;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function RoIPlanner() {
  const [page, setPage] = useState("dashboard");
  const [s, setS] = useState(defaultState);
  const [copyMsg, setCopyMsg] = useState("Copy RoI summary");
  const [resetMsg, setResetMsg] = useState("");

  const fmt = useCallback((n) => {
    const c = s.currency;
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 10000000) return sign + c + (abs / 10000000).toFixed(2) + "Cr";
    if (abs >= 100000) return sign + c + (abs / 100000).toFixed(2) + "L";
    return sign + c + Math.round(abs).toLocaleString("en-IN");
  }, [s.currency]);

  const copySummary = async () => {
    const summary = [
      `Business: ${s.bizName || "Your Business"}`,
      `Currency: ${s.currency}`,
      `Total Investment: ${fmt(totalInv)}`,
      `Year 1 Revenue: ${fmt(yr1)}`,
      `Year 1 Net Profit: ${fmt(netProfit)}`,
      `RoI: ${roiPct}%`,
      `Break-even: ${breakEven ? `Month ${breakEven}` : ">12 months"}`,
      `Gross Margin: ${margin}%`,
      `Health Score: ${health}`,
      `Verdict: ${verdictText}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopyMsg("Copied");
      setTimeout(() => setCopyMsg("Copy RoI summary"), 1600);
    } catch (error) {
      setCopyMsg("Copy failed");
      setTimeout(() => setCopyMsg("Copy RoI summary"), 1600);
    }
  };

  const resetPlanner = () => {
    setS(defaultState);
    setPage("dashboard");
    setCopyMsg("Copy RoI summary");
    setResetMsg("Planner reset to default values");
    setTimeout(() => setResetMsg(""), 1800);
  };

  // ---- CALCULATIONS ----
  const capexTotal = s.capex.reduce((a, x) => a + x.amt, 0);
  const amortMo = capexTotal / (s.amortYears * 12);
  const opexMo = s.opex.reduce((a, x) => a + x.amt, 0);
  const fullRev = s.rev.reduce((a, x) => a + x.price * x.qty, 0);
  const rev1 = fullRev * (s.utilization / 100);
  const gr = s.growthRate / 100;

  const monthly = [];
  let cur = rev1;
  for (let i = 0; i < 12; i++) {
    monthly.push(Math.round(cur));
    cur = Math.min(cur * (1 + gr), fullRev * 1.8);
  }
  const yr1 = monthly.reduce((a, b) => a + b, 0);
  const totalInv = capexTotal + opexMo * 12;
  const netProfit = yr1 - opexMo * 12 - capexTotal;
  const roiPct = totalInv > 0 ? Math.round((netProfit / totalInv) * 100) : 0;
  const margin = fullRev > 0 ? Math.round(((fullRev - opexMo) / fullRev) * 100) : 0;

  const nets = monthly.map((r) => Math.round(r - opexMo));
  let cum = -capexTotal;
  let breakEven = null;
  for (let i = 0; i < 12; i++) {
    cum += nets[i];
    if (breakEven === null && cum >= 0) breakEven = i + 1;
  }

  const capexRecov = Math.min(Math.max(yr1 - opexMo * 12, 0), capexTotal);
  const capexRecovPct = capexTotal > 0 ? Math.min(Math.round((capexRecov / capexTotal) * 100), 100) : 0;

  const maxMonthly = Math.max(...monthly, 1);
  const maxNets = Math.max(...nets.map(Math.abs), 1);

  // health score
  let health = roiPct >= 50 ? 90 : roiPct >= 25 ? 75 : roiPct >= 0 ? 55 : 30;
  if (margin >= 40) health = Math.min(health + 5, 100);
  if (breakEven && breakEven <= 6) health = Math.min(health + 5, 100);

  const verdictClass = roiPct >= 50 ? "good" : roiPct >= 0 ? "warn" : "bad";
  const verdictText =
    roiPct >= 50
      ? `Strong! RoI of ${roiPct}% — this business model looks highly viable. Break-even in ${breakEven || ">12"} month(s). Focus on reaching full capacity to accelerate profit.`
      : roiPct >= 0
      ? `Moderate. RoI of ${roiPct}% — profitable but room to improve. Try increasing revenue, raising prices, or cutting high-% OPEX items. Break-even: ${breakEven ? "Month " + breakEven : ">12 months"}.`
      : `Currently loss-making (RoI: ${roiPct}%). Revenue needs to grow or costs need to shrink. Increase prices/quantity in Revenue tab, or reduce OPEX.`;

  // ---- UPDATERS ----
  const upd = (key, val) => setS((p) => ({ ...p, [key]: val }));
  const updCapex = (id, field, val) =>
    setS((p) => ({ ...p, capex: p.capex.map((x) => (x.id === id ? { ...x, [field]: val } : x)) }));
  const updOpex = (id, field, val) =>
    setS((p) => ({ ...p, opex: p.opex.map((x) => (x.id === id ? { ...x, [field]: val } : x)) }));
  const updRev = (id, field, val) =>
    setS((p) => ({ ...p, rev: p.rev.map((x) => (x.id === id ? { ...x, [field]: val } : x)) }));

  const addCapex = () => setS((p) => ({ ...p, capex: [...p.capex, { id: uid(), name: "New item", note: "", amt: 0 }] }));
  const addOpex = () => setS((p) => ({ ...p, opex: [...p.opex, { id: uid(), name: "New expense", note: "", amt: 0 }] }));
  const addRev = () => setS((p) => ({ ...p, rev: [...p.rev, { id: uid(), name: "New service", note: "", price: 0, qty: 1 }] }));
  const delCapex = (id) => setS((p) => ({ ...p, capex: p.capex.filter((x) => x.id !== id) }));
  const delOpex = (id) => setS((p) => ({ ...p, opex: p.opex.filter((x) => x.id !== id) }));
  const delRev = (id) => setS((p) => ({ ...p, rev: p.rev.filter((x) => x.id !== id) }));

  // ---- STYLES ----
  const css = {
    app: { display: "flex", minHeight: "100vh", background: "#0c0c0c", color: "#eeecea", fontFamily: "system-ui,sans-serif", fontSize: 14 },
    sidebar: { width: 220, flexShrink: 0, background: "#141414", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" },
    main: { flex: 1, padding: "28px 32px", maxWidth: 860 },
    logo: { padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
    logoMark: { fontSize: 16, fontWeight: 700, color: "#c8f060", letterSpacing: -0.3 },
    logoSub: { fontSize: 9, color: "#666", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" },
    navBtn: (active) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: active ? "#c8f060" : "#666", background: active ? "rgba(200,240,96,0.08)" : "none", border: "none", width: "100%", textAlign: "left", fontWeight: active ? 500 : 400, transition: "all .15s" }),
    healthBox: { margin: 12, background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 10px", textAlign: "center" },
    healthNum: { fontSize: 32, fontWeight: 700, color: health >= 75 ? "#c8f060" : health >= 50 ? "#f0b060" : "#f06060", lineHeight: 1 },
    healthLbl: { fontSize: 9, color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em" },
    ph: { marginBottom: 22 },
    phTitle: { fontSize: 22, fontWeight: 700, letterSpacing: -0.4 },
    phDesc: { fontSize: 12, color: "#666", marginTop: 4 },
    card: { background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 16 },
    cardTitle: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.09em", color: "#555", marginBottom: 14 },
    mg: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 16 },
    met: (variant) => ({
      background: variant === "acc" ? "rgba(200,240,96,0.04)" : variant === "suc" ? "rgba(96,240,176,0.04)" : "#1a1a1a",
      border: variant === "acc" ? "1px solid rgba(200,240,96,0.2)" : variant === "suc" ? "1px solid rgba(96,240,176,0.2)" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, padding: 14
    }),
    metLbl: { fontSize: 10, color: "#666", marginBottom: 4 },
    metVal: (c) => ({ fontSize: 18, fontWeight: 700, color: c === "pos" ? "#60f0b0" : c === "neg" ? "#f06060" : c === "war" ? "#f0b060" : c === "acc" ? "#c8f060" : "#eeecea" }),
    metSub: { fontSize: 10, color: "#555", marginTop: 2 },
    input: { background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)", color: "#eeecea", padding: "6px 9px", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit" },
    nameInput: { background: "none", border: "none", color: "#eeecea", padding: 0, fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%" },
    noteInput: { background: "none", border: "none", color: "#666", padding: 0, fontSize: 11, outline: "none", fontFamily: "inherit", width: "100%", marginTop: 1 },
    row: { display: "grid", gap: 8, alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    addBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px dashed rgba(255,255,255,0.14)", color: "#666", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, width: "100%", marginTop: 10, fontFamily: "inherit" },
    delBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: "3px 6px", borderRadius: 6 },
    verdictBox: (c) => ({ borderRadius: 10, padding: "12px 16px", marginTop: 14, borderLeft: `3px solid ${c === "good" ? "#60f0b0" : c === "warn" ? "#f0b060" : "#f06060"}`, background: c === "good" ? "rgba(96,240,176,0.05)" : c === "warn" ? "rgba(240,176,96,0.05)" : "rgba(240,96,96,0.05)", fontSize: 13, lineHeight: 1.7 }),
    bcRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 },
    bcLbl: { fontSize: 11, color: "#666", width: 130, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    bcTrack: { flex: 1, background: "#1c1c1c", borderRadius: 3, height: 20, overflow: "hidden", position: "relative" },
    bcVal: { fontSize: 11, color: "#666", width: 80, textAlign: "right", flexShrink: 0 },
    plRow: (last) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)", borderTop: last ? "1px solid rgba(255,255,255,0.12)" : "none", fontSize: last ? 14 : 13, fontWeight: last ? 600 : 400 }),
    actionRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, marginBottom: 16 },
    primaryBtn: { background: "#c8f060", color: "#0c0c0c", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" },
    secondaryBtn: { background: "#1a1a1a", color: "#eeecea", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" },
    helperText: { fontSize: 11, color: "#666", marginTop: 6 },
  };

  const BarFill = ({ pct, color, label }) => (
    <div style={{ ...css.bcTrack }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 7, transition: "width .35s", minWidth: 2 }}>
        {pct > 18 && <span style={{ fontSize: 10, fontWeight: 600, color: "#0c0c0c" }}>{label}</span>}
      </div>
    </div>
  );

  const Slider = ({ label, val, min, max, step = 1, onChange, display }) => (
    <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#c8f060" }}>{display}</div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={onChange}
        style={{ width: "100%", accentColor: "#c8f060", marginTop: 8, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginTop: 2 }}>
        <span>{min}{label.includes("year") ? " yr" : label.includes("%") ? "%" : ""}</span>
        <span>{max}{label.includes("year") ? " yrs" : label.includes("%") ? "%" : ""}</span>
      </div>
    </div>
  );

  const NavBtn = ({ id, icon, label }) => (
    <button style={css.navBtn(page === id)} onClick={() => setPage(id)}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </button>
  );

  // ---- RENDER ----
  return (
    <div style={css.app}>
      {/* SIDEBAR */}
      <aside style={css.sidebar}>
        <div style={css.logo}>
          <div style={css.logoMark}>RoI Planner</div>
          <div style={css.logoSub}>Business Investment Framework</div>
        </div>

        {/* Business setup */}
        <div style={{ padding: "12px 12px 4px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 5 }}>Business name</div>
          <input value={s.bizName} onChange={(e) => upd("bizName", e.target.value)}
            style={{ ...css.input, width: "100%", marginBottom: 8 }} placeholder="e.g. Geek Studio" />
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 5 }}>Currency</div>
          <select value={s.currency} onChange={(e) => upd("currency", e.target.value)}
            style={{ ...css.input, width: "100%", marginBottom: 10 }}>
            <option value="৳">BDT (৳)</option>
            <option value="$">USD ($)</option>
            <option value="€">EUR (€)</option>
            <option value="£">GBP (£)</option>
            <option value="₹">INR (₹)</option>
          </select>
        </div>

        <div style={{ padding: "8px 8px" }}>
          <NavBtn id="dashboard" icon="▦" label="Dashboard" />
          <NavBtn id="capex" icon="◈" label="CAPEX" />
          <NavBtn id="opex" icon="◷" label="Monthly OPEX" />
          <NavBtn id="revenue" icon="↗" label="Revenue" />
          <NavBtn id="roi" icon="✓" label="RoI Summary" />
          <NavBtn id="scenarios" icon="⬡" label="Scenarios" />
          <div style={{ padding: "8px 2px 0" }}>
            <button style={css.secondaryBtn} onClick={resetPlanner}>Reset planner</button>
            {resetMsg && <div style={css.helperText}>{resetMsg}</div>}
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <div style={css.healthBox}>
            <div style={css.healthNum}>{health}</div>
            <div style={css.healthLbl}>Business Health Score</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={css.main}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <div style={css.ph}>
              <div style={css.phTitle}>{s.bizName || "Your Business"}</div>
              <div style={css.phDesc}>Live overview — all numbers auto-update as you fill each section.</div>
            </div>
            <div style={css.mg}>
              {[
                { lbl: "Total Investment", val: fmt(totalInv), sub: "CAPEX + Year 1 OPEX", v: "acc" },
                { lbl: "Year 1 Revenue", val: fmt(yr1), sub: "With growth applied", c: "pos", v: "suc" },
                { lbl: "Year 1 Net Profit", val: fmt(netProfit), sub: "Revenue − all costs", c: netProfit >= 0 ? "pos" : "neg" },
                { lbl: "RoI %", val: roiPct + "%", sub: "Net Profit / Invested", c: roiPct >= 30 ? "pos" : roiPct >= 0 ? "war" : "neg" },
                { lbl: "Break-even", val: breakEven ? "Month " + breakEven : ">12 mo", sub: "When CAPEX recovered" },
                { lbl: "Gross Margin", val: margin + "%", sub: "At full capacity", c: margin >= 30 ? "pos" : margin >= 10 ? "war" : "neg" },
              ].map((m, i) => (
                <div key={i} style={css.met(m.v)}>
                  <div style={css.metLbl}>{m.lbl}</div>
                  <div style={css.metVal(m.c)}>{m.val}</div>
                  <div style={css.metSub}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Monthly bars */}
            <div style={css.card}>
              <div style={css.cardTitle}>12-month revenue projection</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 3, alignItems: "flex-end", height: 72 }}>
                {monthly.map((r, i) => {
                  const h = Math.max(Math.round((r / maxMonthly) * 60), 2);
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ width: "100%", height: h, background: r >= opexMo ? "#c8f060" : "#f06060", borderRadius: "2px 2px 0 0", minHeight: 2 }} />
                      <div style={{ fontSize: 8, color: "#555", marginTop: 3 }}>{MONTHS[i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary bars */}
            <div style={css.card}>
              <div style={css.cardTitle}>Cost vs Revenue — Year 1</div>
              <div>
                {[
                  { lbl: "CAPEX", val: capexTotal, color: "#f0b060" },
                  { lbl: "Year 1 OPEX", val: opexMo * 12, color: "#f06060" },
                  { lbl: "Year 1 Revenue", val: yr1, color: "#c8f060" },
                  { lbl: "Net Profit", val: Math.max(netProfit, 0), color: "#60f0b0" },
                ].map((b, i) => {
                  const maxB = Math.max(capexTotal, opexMo * 12, yr1, 1);
                  const pct = Math.round((b.val / maxB) * 100);
                  return (
                    <div key={i} style={css.bcRow}>
                      <div style={css.bcLbl}>{b.lbl}</div>
                      <BarFill pct={pct} color={b.color} label={fmt(b.val)} />
                      <div style={css.bcVal}>{fmt(b.val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={css.verdictBox(verdictClass)}>{verdictText}</div>
          </div>
        )}

        {/* CAPEX */}
        {page === "capex" && (
          <div>
            <div style={css.ph}><div style={css.phTitle}>CAPEX — One-time Investment</div><div style={css.phDesc}>Equipment, setup, infrastructure. Paid once at the start.</div></div>
            <div style={css.card}>
              <div style={css.cardTitle}>Capital expenditure items</div>
              {s.capex.map((x) => {
                const am = x.amt / (s.amortYears * 12);
                return (
                  <div key={x.id} style={{ ...css.row, gridTemplateColumns: "1fr auto auto auto" }}>
                    <div>
                      <input style={css.nameInput} value={x.name} onChange={(e) => updCapex(x.id, "name", e.target.value)} placeholder="Item name" />
                      <input style={css.noteInput} value={x.note} onChange={(e) => updCapex(x.id, "note", e.target.value)} placeholder="Description" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "#555" }}>{s.currency}</span>
                      <input style={{ ...css.input, width: 110, textAlign: "right" }} type="number" value={x.amt} onChange={(e) => updCapex(x.id, "amt", +e.target.value || 0)} />
                    </div>
                    <div style={{ fontSize: 11, color: "#555", textAlign: "right", width: 80 }}>{fmt(am)}/mo</div>
                    <button style={css.delBtn} onClick={() => delCapex(x.id)}>✕</button>
                  </div>
                );
              })}
              <button style={css.addBtn} onClick={addCapex}>＋ Add item</button>
            </div>

            <div style={css.card}>
              <div style={css.cardTitle}>Amortization</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Slider label="Amortize over years" val={s.amortYears} min={1} max={10}
                  display={s.amortYears + " year" + (s.amortYears > 1 ? "s" : "")}
                  onChange={(e) => upd("amortYears", +e.target.value)} />
                <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>Monthly amortization</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#c8f060" }}>{fmt(amortMo)}/mo</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>Added to effective monthly cost</div>
                </div>
              </div>
            </div>

            <div style={css.mg}>
              {[
                { lbl: "Total CAPEX", val: fmt(capexTotal), v: "acc" },
                { lbl: "Monthly amort.", val: fmt(amortMo) + "/mo" },
                { lbl: "Items", val: s.capex.length },
              ].map((m, i) => (
                <div key={i} style={css.met(m.v)}><div style={css.metLbl}>{m.lbl}</div><div style={css.metVal(m.c || (m.v === "acc" ? "acc" : null))}>{m.val}</div></div>
              ))}
            </div>
          </div>
        )}

        {/* OPEX */}
        {page === "opex" && (
          <div>
            <div style={css.ph}><div style={css.phTitle}>OPEX — Monthly Operating Costs</div><div style={css.phDesc}>Fixed and variable costs paid every month to run the business.</div></div>
            <div style={css.card}>
              <div style={css.cardTitle}>Monthly expenses</div>
              {s.opex.map((x) => {
                const pct = opexMo > 0 ? Math.round((x.amt / opexMo) * 100) : 0;
                return (
                  <div key={x.id} style={{ ...css.row, gridTemplateColumns: "1fr auto auto auto" }}>
                    <div>
                      <input style={css.nameInput} value={x.name} onChange={(e) => updOpex(x.id, "name", e.target.value)} />
                      <input style={css.noteInput} value={x.note} onChange={(e) => updOpex(x.id, "note", e.target.value)} placeholder="Description" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "#555" }}>{s.currency}</span>
                      <input style={{ ...css.input, width: 110, textAlign: "right" }} type="number" value={x.amt} onChange={(e) => updOpex(x.id, "amt", +e.target.value || 0)} />
                    </div>
                    <div style={{ fontSize: 11, color: "#555", textAlign: "right", width: 50 }}>{pct}%</div>
                    <button style={css.delBtn} onClick={() => delOpex(x.id)}>✕</button>
                  </div>
                );
              })}
              <button style={css.addBtn} onClick={addOpex}>＋ Add expense</button>
            </div>
            <div style={css.mg}>
              {[
                { lbl: "Monthly OPEX", val: fmt(opexMo), v: "acc" },
                { lbl: "Annual OPEX", val: fmt(opexMo * 12) },
                { lbl: "Items", val: s.opex.length },
              ].map((m, i) => (
                <div key={i} style={css.met(m.v)}><div style={css.metLbl}>{m.lbl}</div><div style={css.metVal(m.v === "acc" ? "acc" : null)}>{m.val}</div></div>
              ))}
            </div>
            <div style={css.card}>
              <div style={css.cardTitle}>Breakdown by item</div>
              {s.opex.map((x) => {
                const maxO = Math.max(...s.opex.map((o) => o.amt), 1);
                const pct = Math.round((x.amt / maxO) * 100);
                const share = opexMo > 0 ? Math.round((x.amt / opexMo) * 100) : 0;
                return (
                  <div key={x.id} style={css.bcRow}>
                    <div style={css.bcLbl}>{x.name}</div>
                    <BarFill pct={pct} color="#f0b060" label={share + "%"} />
                    <div style={css.bcVal}>{fmt(x.amt)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REVENUE */}
        {page === "revenue" && (
          <div>
            <div style={css.ph}><div style={css.phTitle}>Revenue — Pricing & Volume</div><div style={css.phDesc}>Add services or products. Set price × quantity per month.</div></div>
            <div style={css.card}>
              <div style={css.cardTitle}>Revenue streams</div>
              {s.rev.map((x) => {
                const t = x.price * x.qty;
                return (
                  <div key={x.id} style={{ ...css.row, gridTemplateColumns: "1fr auto auto auto auto" }}>
                    <div>
                      <input style={css.nameInput} value={x.name} onChange={(e) => updRev(x.id, "name", e.target.value)} />
                      <input style={css.noteInput} value={x.note} onChange={(e) => updRev(x.id, "note", e.target.value)} placeholder="Description" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "#555" }}>{s.currency}</span>
                      <input style={{ ...css.input, width: 100, textAlign: "right" }} type="number" value={x.price} onChange={(e) => updRev(x.id, "price", +e.target.value || 0)} />
                    </div>
                    <input style={{ ...css.input, width: 55, textAlign: "center" }} type="number" value={x.qty} min={0} onChange={(e) => updRev(x.id, "qty", +e.target.value || 0)} title="Qty/month" />
                    <div style={{ fontSize: 12, color: "#888", textAlign: "right", width: 80 }}>{fmt(t)}</div>
                    <button style={css.delBtn} onClick={() => delRev(x.id)}>✕</button>
                  </div>
                );
              })}
              <button style={css.addBtn} onClick={addRev}>＋ Add revenue stream</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Slider label="Month 1 utilization %" val={s.utilization} min={10} max={100} step={5}
                display={s.utilization + "%"} onChange={(e) => upd("utilization", +e.target.value)} />
              <Slider label="Monthly growth rate %" val={s.growthRate} min={0} max={30}
                display={s.growthRate + "%"} onChange={(e) => upd("growthRate", +e.target.value)} />
            </div>
            <div style={css.mg}>
              {[
                { lbl: "Full capacity revenue", val: fmt(fullRev), c: "pos" },
                { lbl: "Month 1 revenue", val: fmt(rev1) },
                { lbl: "Year 1 total", val: fmt(yr1), v: "acc" },
                { lbl: "Revenue streams", val: s.rev.length },
              ].map((m, i) => (
                <div key={i} style={css.met(m.v)}><div style={css.metLbl}>{m.lbl}</div><div style={css.metVal(m.v === "acc" ? "acc" : m.c)}>{m.val}</div></div>
              ))}
            </div>
            <div style={css.card}>
              <div style={css.cardTitle}>Revenue stream breakdown</div>
              {s.rev.map((x) => {
                const t = x.price * x.qty;
                const maxR = Math.max(...s.rev.map((r) => r.price * r.qty), 1);
                const pct = Math.round((t / maxR) * 100);
                const share = fullRev > 0 ? Math.round((t / fullRev) * 100) : 0;
                return (
                  <div key={x.id} style={css.bcRow}>
                    <div style={css.bcLbl}>{x.name}</div>
                    <BarFill pct={pct} color="#c8f060" label={share + "%"} />
                    <div style={css.bcVal}>{fmt(t)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ROI SUMMARY */}
        {page === "roi" && (
          <div>
            <div style={css.ph}><div style={css.phTitle}>RoI Summary</div><div style={css.phDesc}>Full P&amp;L, break-even, and return on investment.</div></div>
            <div style={{ textAlign: "center", padding: "26px 20px", background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -3, color: roiPct >= 0 ? "#c8f060" : "#f06060", lineHeight: 1 }}>{roiPct}%</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Return on Investment — Year 1</div>
            </div>
            <div style={css.mg}>
              {[
                { lbl: "Total invested", val: fmt(totalInv) },
                { lbl: "Year 1 revenue", val: fmt(yr1), c: "pos", v: "suc" },
                { lbl: "Net profit", val: fmt(netProfit), c: netProfit >= 0 ? "pos" : "neg" },
                { lbl: "Break-even", val: breakEven ? "Month " + breakEven : ">12 mo" },
                { lbl: "Gross margin", val: margin + "%", c: margin >= 30 ? "pos" : margin >= 10 ? "war" : "neg" },
                { lbl: "Monthly burn", val: fmt(opexMo) + "/mo" },
              ].map((m, i) => (
                <div key={i} style={css.met(m.v)}><div style={css.metLbl}>{m.lbl}</div><div style={css.metVal(m.c)}>{m.val}</div></div>
              ))}
            </div>

            <div style={css.actionRow}>
              <button style={css.primaryBtn} onClick={copySummary}>{copyMsg}</button>
            </div>

            <div style={css.card}>
              <div style={css.cardTitle}>P&amp;L — Year 1</div>
              {[
                { lbl: "Year 1 Gross Revenue", val: yr1, c: "pos" },
                { lbl: "↳ Monthly OPEX × 12", val: -opexMo * 12, c: "neg" },
                { lbl: "↳ CAPEX (one-time)", val: -capexTotal, c: "neg" },
                { lbl: "Year 1 Net Profit / Loss", val: netProfit, c: netProfit >= 0 ? "pos" : "neg", last: true },
              ].map((r, i) => (
                <div key={i} style={css.plRow(r.last)}>
                  <span style={{ color: r.last ? "#eeecea" : "#666" }}>{r.lbl}</span>
                  <span style={css.metVal(r.c)}>{r.val < 0 ? "−" : ""}{fmt(Math.abs(r.val))}</span>
                </div>
              ))}
            </div>

            <div style={css.card}>
              <div style={css.cardTitle}>CAPEX recovery progress</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 5 }}>
                <span>Recovered in Year 1</span>
                <span>{fmt(capexRecov)} / {fmt(capexTotal)} ({capexRecovPct}%)</span>
              </div>
              <div style={{ height: 7, background: "#1c1c1c", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: capexRecovPct + "%", background: "#c8f060", borderRadius: 4, transition: "width .35s" }} />
              </div>
            </div>

            <div style={css.card}>
              <div style={css.cardTitle}>Monthly net cashflow — 12 months</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100, padding: "0 4px" }}>
                {nets.map((n, i) => {
                  const h = Math.max(Math.round((Math.abs(n) / maxNets) * 80), 2);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: n >= 0 ? "flex-end" : "flex-start", height: "100%" }}>
                      <div style={{ width: "100%", height: h, background: n >= 0 ? "#c8f060" : "#f06060", borderRadius: n >= 0 ? "2px 2px 0 0" : "0 0 2px 2px", minHeight: 2 }} />
                      <div style={{ fontSize: 8, color: "#555", marginTop: 3 }}>{MONTHS[i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={css.verdictBox(verdictClass)}>{verdictText}</div>
          </div>
        )}

        {/* SCENARIOS */}
        {page === "scenarios" && (
          <ScenarioPage s={s} upd={upd} fmt={fmt} fullRev={fullRev} opexMo={opexMo} capexTotal={capexTotal} css={css} />
        )}

      </main>
    </div>
  );
}

function ScenarioPage({ s, fmt, fullRev, opexMo, capexTotal, css }) {
  const [revMult, setRevMult] = useState(1.0);
  const [costMult, setCostMult] = useState(1.0);

  const calcScenario = (rm, cm) => {
    const gr = s.growthRate / 100;
    let cur = fullRev * (s.utilization / 100) * rm, yr1 = 0;
    for (let i = 0; i < 12; i++) { yr1 += Math.round(cur); cur = Math.min(cur * (1 + gr), fullRev * rm * 1.8); }
    const tc = opexMo * cm * 12 + capexTotal * cm;
    const p = yr1 - tc;
    const r = tc > 0 ? Math.round((p / tc) * 100) : 0;
    return { yr1: Math.round(yr1), tc: Math.round(tc), p: Math.round(p), r };
  };

  const base = calcScenario(1.0, 1.0);
  const pess = calcScenario(0.6, 1.3);
  const opt = calcScenario(1.5, 0.85);
  const cur2 = calcScenario(revMult, costMult);

  const presets = [
    { lbl: "Pessimistic", rv: 0.6, co: 1.3 },
    { lbl: "Base case", rv: 1.0, co: 1.0 },
    { lbl: "Optimistic", rv: 1.5, co: 0.85 },
  ];

  return (
    <div>
      <div style={css.ph}><div style={css.phTitle}>Scenario Planning</div><div style={css.phDesc}>Compare Pessimistic, Base, and Optimistic projections.</div></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {presets.map((p) => (
          <div key={p.lbl} onClick={() => { setRevMult(p.rv); setCostMult(p.co); }}
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", background: "#1a1a1a", color: "#888" }}>
            {p.lbl}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>Revenue multiplier</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#60f0b0" }}>{revMult.toFixed(1)}×</div>
          <input type="range" min={0.3} max={2.0} step={0.1} value={revMult}
            onChange={(e) => setRevMult(+e.target.value)}
            style={{ width: "100%", accentColor: "#60f0b0", marginTop: 8, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginTop: 2 }}><span>0.3×</span><span>2.0×</span></div>
        </div>
        <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>Cost multiplier</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f0b060" }}>{costMult.toFixed(1)}×</div>
          <input type="range" min={0.5} max={2.0} step={0.1} value={costMult}
            onChange={(e) => setCostMult(+e.target.value)}
            style={{ width: "100%", accentColor: "#f0b060", marginTop: 8, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginTop: 2 }}><span>0.5×</span><span>2.0×</span></div>
        </div>
      </div>

      <div style={css.mg}>
        {[
          { lbl: "Adjusted revenue Y1", val: fmt(cur2.yr1), c: "pos" },
          { lbl: "Adjusted total cost", val: fmt(cur2.tc), c: "neg" },
          { lbl: "Adjusted net profit", val: fmt(cur2.p), c: cur2.p >= 0 ? "pos" : "neg", v: "acc" },
          { lbl: "Adjusted RoI", val: cur2.r + "%", c: cur2.r >= 30 ? "pos" : cur2.r >= 0 ? "war" : "neg" },
        ].map((m, i) => (
          <div key={i} style={css.met(m.v)}><div style={css.metLbl}>{m.lbl}</div><div style={css.metVal(m.c)}>{m.val}</div></div>
        ))}
      </div>

      <div style={css.card}>
        <div style={css.cardTitle}>3 scenarios — net profit comparison</div>
        {[
          { lbl: "Pessimistic", val: pess.p, roi: pess.r },
          { lbl: "Base case", val: base.p, roi: base.r },
          { lbl: "Optimistic", val: opt.p, roi: opt.r },
        ].map((sc, i) => {
          const maxP = Math.max(Math.abs(pess.p), Math.abs(base.p), Math.abs(opt.p), 1);
          const pct = Math.round((Math.abs(sc.val) / maxP) * 100);
          return (
            <div key={i} style={css.bcRow}>
              <div style={css.bcLbl}>{sc.lbl}</div>
              <div style={css.bcTrack}>
                <div style={{ height: "100%", width: pct + "%", background: sc.val >= 0 ? "#c8f060" : "#f06060", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 7, minWidth: 2 }}>
                  {pct > 18 && <span style={{ fontSize: 10, fontWeight: 600, color: "#0c0c0c" }}>{fmt(sc.val)}</span>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#666", width: 80, textAlign: "right" }}>{sc.roi}% RoI</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
