import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = ["#00f0ff", "#ff6b35", "#a3ff70", "#ffd166", "#ff4fcf", "#b388ff", "#00e676"];
const BLDC_MAP = { "Fan": 28, "Exhaust Fan": 22, "Cooler": 180, "AC": 1200 };
const STD_MAP  = { "Fan": 75, "Exhaust Fan": 60, "Cooler": 250, "AC": 1500 };

const INDIAN_STATES_RATE = {
  "Maharashtra": 9.5, "Delhi": 8.0, "Karnataka": 7.5, "Tamil Nadu": 7.0,
  "Uttar Pradesh": 6.5, "Gujarat": 6.0, "Rajasthan": 7.2, "West Bengal": 7.8,
  "Telangana": 8.5, "Andhra Pradesh": 7.3, "Punjab": 6.8, "Haryana": 7.1,
  "Kerala": 5.8, "Madhya Pradesh": 6.2, "Other": 7.0,
};

const PRESET_DEVICES = [
  { label: "Ceiling Fan", power: 75, hours: 8 },
  { label: "Air Conditioner (1.5T)", power: 1500, hours: 6 },
  { label: "Television (LED 43\")", power: 120, hours: 5 },
  { label: "Refrigerator", power: 150, hours: 24 },
  { label: "Washing Machine", power: 500, hours: 1 },
  { label: "Microwave", power: 1000, hours: 0.5 },
  { label: "Water Heater", power: 2000, hours: 0.5 },
  { label: "LED Bulb", power: 10, hours: 6 },
  { label: "Cooler", power: 250, hours: 10 },
  { label: "Laptop", power: 65, hours: 8 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);
const kwhDay = (w, h) => (w * h) / 1000;
const fmt2 = (n) => Number(n).toFixed(2);

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputStyle = {
  background: "rgba(0,240,255,0.05)", border: "1px solid rgba(0,240,255,0.18)",
  borderRadius: 8, padding: "10px 14px", color: "#ddeeff",
  fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", width: "100%",
};
const btnPrimary = {
  background: "linear-gradient(135deg,#00f0ff,#0099bb)", color: "#000", border: "none",
  borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif", fontSize: 14, transition: "all 0.2s",
};
const btnSecondary = {
  background: "rgba(255,255,255,0.05)", color: "#8899bb",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 20px",
  fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14,
};
const cardStyle = {
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,240,255,0.1)",
  borderRadius: 18, padding: "24px", backdropFilter: "blur(10px)",
};
const sectionTitle = {
  fontFamily: "'Orbitron', monospace", fontSize: 11, letterSpacing: 2,
  color: "#00f0ff", textTransform: "uppercase", marginBottom: 18, fontWeight: 700,
};
const bldcBadge = {
  background: "rgba(0,240,255,0.12)", color: "#00f0ff",
  border: "1px solid #00f0ff33", borderRadius: 20, padding: "1px 8px",
  fontSize: 10, fontWeight: 700, marginLeft: 6,
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeSlide { from { opacity:0;transform:translateX(-50%) translateY(10px) } to { opacity:1;transform:translateX(-50%) translateY(0) } }
  @keyframes fadeIn { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:none } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background:#00f0ff22; border-radius:2px; }
  body { background: #030b18; }
  .csv-drop-zone { transition: all 0.2s; }
  .csv-drop-zone:hover { border-color: #00f0ff !important; background: rgba(0,240,255,0.08) !important; }
  .csv-drop-zone.drag-over { border-color: #00f0ff !important; background: rgba(0,240,255,0.12) !important; transform: scale(1.01); }
`;

// ─── Sub-components ──────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid #00f0ff`, borderTopColor: "transparent",
      borderRadius: "50%", animation: "spin 0.7s linear infinite", verticalAlign: "middle",
    }} />
  );
}

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      background: "#0d2236", border: "1px solid #00f0ff44", padding: "12px 28px",
      borderRadius: 30, color: "#00f0ff", fontWeight: 700, zIndex: 9999,
      boxShadow: "0 4px 32px #00f0ff22", animation: "fadeSlide 0.3s ease",
      fontFamily: "'DM Sans', sans-serif", fontSize: 14, whiteSpace: "nowrap",
    }}>{message}</div>
  );
}

function StatCard({ label, value, sub, color = "#00f0ff", icon }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,240,255,0.1)",
      borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 14, right: 16, fontSize: 24, opacity: 0.35 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#4a6a8a", letterSpacing: 2, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "'Orbitron', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#4a6a8a", marginTop: 6 }}>{sub}</div>}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color}55,transparent)` }} />
    </div>
  );
}

// ─── CSV Drop Zone ────────────────────────────────────────────────────────────
function CsvDropZone({ onFile, csvError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    onFile({ target: { files: [file], value: "" } });
  };

  return (
    <div>
      <label
        className={`csv-drop-zone${isDragging ? " drag-over" : ""}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 10, padding: "32px 20px", cursor: "pointer",
          border: "2px dashed rgba(0,240,255,0.25)", borderRadius: 14,
          background: "rgba(0,240,255,0.03)", position: "relative", overflow: "hidden",
        }}
      >
        <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
        {["topLeft","topRight","bottomLeft","bottomRight"].map(corner => (
          <div key={corner} style={{
            position: "absolute",
            top: corner.includes("top") ? 8 : "auto", bottom: corner.includes("bottom") ? 8 : "auto",
            left: corner.includes("Left") ? 8 : "auto", right: corner.includes("Right") ? 8 : "auto",
            width: 12, height: 12,
            borderTop: corner.includes("top") ? "2px solid #00f0ff66" : "none",
            borderBottom: corner.includes("bottom") ? "2px solid #00f0ff66" : "none",
            borderLeft: corner.includes("Left") ? "2px solid #00f0ff66" : "none",
            borderRight: corner.includes("Right") ? "2px solid #00f0ff66" : "none",
          }} />
        ))}
        <div style={{ fontSize: 32, filter: isDragging ? "drop-shadow(0 0 8px #00f0ff)" : "none", transition: "filter 0.2s" }}>
          {isDragging ? "📥" : "📂"}
        </div>
        {fileName
          ? <div style={{ textAlign: "center" }}>
              <div style={{ color: "#a3ff70", fontWeight: 700, fontSize: 14 }}>✅ {fileName}</div>
              <div style={{ color: "#4a6a8a", fontSize: 12, marginTop: 4 }}>Click to replace file</div>
            </div>
          : <div style={{ textAlign: "center" }}>
              <div style={{ color: "#00f0ff", fontWeight: 700, fontSize: 14 }}>
                {isDragging ? "Release to upload" : "Drop CSV here or click to browse"}
              </div>
              <div style={{ color: "#4a6a8a", fontSize: 12, marginTop: 4 }}>Only .csv files accepted</div>
            </div>
        }
      </label>
      {csvError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 12px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: 8 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ color: "#ff6b6b", fontSize: 13 }}>{csvError}</span>
        </div>
      )}
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [customRate, setCustomRate] = useState("");
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [devices, setDevices] = useState([]);
  const [devName, setDevName] = useState("");
  const [devPower, setDevPower] = useState("");
  const [devHours, setDevHours] = useState("8");
  const [devIsBldc, setDevIsBldc] = useState(false);
  const [preset, setPreset] = useState("");
  const [err, setErr] = useState("");

  const rate = useCustomRate ? Number(customRate) || 0 : INDIAN_STATES_RATE[state];

  const addDevice = () => {
    const n = devName.trim(), p = Number(devPower);
    if (!n || !p || p <= 0) { setErr("Enter a valid device name and wattage."); return; }
    setErr("");
    setDevices(prev => [...prev, { id: uid(), device: n, power: p, hours: Number(devHours) || 8, isBldc: devIsBldc }]);
    setDevName(""); setDevPower(""); setDevHours("8"); setDevIsBldc(false); setPreset("");
  };

  const handlePreset = (p) => {
    setPreset(p.label); setDevName(p.label); setDevPower(String(p.power)); setDevHours(String(p.hours)); setErr("");
  };

  const next = () => {
    if (step === 0 && !name.trim()) { setErr("Please enter your name."); return; }
    if (step === 1 && !city.trim()) { setErr("Please enter your city."); return; }
    if (step === 2) { onComplete({ name: name.trim(), city: city.trim(), state, rate: rate || 7, devices }); return; }
    setErr(""); setStep(s => s + 1);
  };

  const steps = ["Who are you?", "Location & Rate", "Add Devices"];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#030b18 0%,#061525 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 26, fontWeight: 900, background: "linear-gradient(90deg,#00f0ff,#b388ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>⚡ PowerPulse AI</div>
        <div style={{ color: "#4a6a8a", fontSize: 11, letterSpacing: 3, marginTop: 6 }}>SMART ENERGY MONITOR · ATOMBERG HACKATHON 2026</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i <= step ? "linear-gradient(135deg,#00f0ff,#0088aa)" : "rgba(255,255,255,0.05)",
              border: i === step ? "2px solid #00f0ff" : "2px solid transparent",
              color: i <= step ? "#000" : "#4a6a8a", fontWeight: 700, fontSize: 13, transition: "all 0.3s",
            }}>{i < step ? "✓" : i + 1}</div>
            <span style={{ fontSize: 12, color: i === step ? "#00f0ff" : "#4a6a8a" }}>{s}</span>
            {i < 2 && <div style={{ width: 20, height: 1, background: i < step ? "#00f0ff55" : "#ffffff11", marginLeft: 4 }} />}
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,240,255,0.12)", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 520, backdropFilter: "blur(12px)" }}>
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ color: "#e0eaff", fontWeight: 700, fontSize: 20 }}>Welcome! What's your name?</h2>
            <p style={{ color: "#4a6a8a", fontSize: 14 }}>We'll personalize your energy dashboard.</p>
            <input autoFocus placeholder="Enter your name" value={name} onChange={e => { setName(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && next()} style={inputStyle} />
          </div>
        )}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ color: "#e0eaff", fontWeight: 700, fontSize: 20 }}>Your Location & Electricity Rate</h2>
            <p style={{ color: "#4a6a8a", fontSize: 14 }}>Used to calculate your accurate monthly bill.</p>
            <input placeholder="City (e.g. Mumbai, Lucknow)" value={city} onChange={e => { setCity(e.target.value); setErr(""); }} style={inputStyle} />
            <select value={state} onChange={e => setState(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {Object.entries(INDIAN_STATES_RATE).map(([s, r]) => (
                <option key={s} value={s} style={{ background: "#0d1f3c" }}>{s} — ₹{r}/unit</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#8899bb", fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={useCustomRate} onChange={e => setUseCustomRate(e.target.checked)} style={{ accentColor: "#00f0ff" }} />
              Enter my own rate from my electricity bill
            </label>
            {useCustomRate && (
              <input type="number" placeholder="Custom rate ₹/kWh" value={customRate} onChange={e => setCustomRate(e.target.value)} style={inputStyle} />
            )}
            <div style={{ background: "rgba(0,240,255,0.05)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#4a6a8a", border: "1px solid #00f0ff15" }}>
              Active rate: <strong style={{ color: "#00f0ff" }}>₹{rate || "—"}/unit</strong>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ color: "#e0eaff", fontWeight: 700, fontSize: 20 }}>Add Your Home Devices</h2>
            <p style={{ color: "#4a6a8a", fontSize: 14 }}>Add all appliances to monitor. You can add/remove more later too.</p>
            <div style={{ fontSize: 11, color: "#4a6a8a", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Quick Presets</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESET_DEVICES.map(p => (
                <button key={p.label} onClick={() => handlePreset(p)} style={{
                  background: preset === p.label ? "rgba(0,240,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: preset === p.label ? "1px solid #00f0ff" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, padding: "4px 12px", color: preset === p.label ? "#00f0ff" : "#8899bb",
                  fontSize: 12, cursor: "pointer", transition: "all 0.2s",
                }}>{p.label}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px", gap: 8 }}>
              <input placeholder="Device name" value={devName} onChange={e => { setDevName(e.target.value); setErr(""); }} style={inputStyle} />
              <input type="number" placeholder="Watts" value={devPower} onChange={e => { setDevPower(e.target.value); setErr(""); }} style={inputStyle} />
              <input type="number" placeholder="Hrs/day" value={devHours} onChange={e => setDevHours(e.target.value)} style={inputStyle} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#8899bb", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={devIsBldc} onChange={e => setDevIsBldc(e.target.checked)} style={{ accentColor: "#00f0ff" }} />
              This is a BLDC device (Atomberg fan, etc.) — uses ~60% less energy
            </label>
            <button onClick={addDevice} style={{ ...btnPrimary, alignSelf: "flex-start", padding: "8px 18px" }}>+ Add Device</button>
            {devices.length > 0 && (
              <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {devices.map(d => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,240,255,0.04)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <span style={{ color: "#e0eaff" }}>{d.device} {d.isBldc && <span style={bldcBadge}>BLDC</span>}</span>
                    <span style={{ color: "#4a6a8a" }}>{d.power}W · {d.hours}h/day</span>
                    <button onClick={() => setDevices(prev => prev.filter(x => x.id !== d.id))} style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {devices.length === 0 && <p style={{ color: "#4a6a8a", fontSize: 13, textAlign: "center" }}>No devices yet — add one above, or skip to add later.</p>}
          </div>
        )}
        {err && <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 12 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && <button onClick={() => { setStep(s => s - 1); setErr(""); }} style={btnSecondary}>← Back</button>}
          <button onClick={next} style={{ ...btnPrimary, flex: 1 }}>
            {step === 2
              ? devices.length === 0 ? "Skip & Open Dashboard →" : `Open Dashboard with ${devices.length} device${devices.length !== 1 ? "s" : ""} →`
              : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ profile, onReset }) {
  const { name, city, state, rate } = profile;
  const [devices, setDevices] = useState(profile.devices || []);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [toast, setToast] = useState("");

  const [devName, setDevName] = useState("");
  const [devPower, setDevPower] = useState("");
  const [devHours, setDevHours] = useState("8");
  const [devIsBldc, setDevIsBldc] = useState(false);
  const [preset, setPreset] = useState("");
  const [csvError, setCsvError] = useState("");

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hello ${name}! 👋 I'm your PowerPulse AI assistant. Ask me about your energy usage in ${city}, bill estimates, savings tips, or BLDC fan benefits. What would you like to know?` }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const showToast = (msg) => setToast(msg);

  const totalDailyKwh   = devices.reduce((a, d) => a + kwhDay(d.power, d.hours), 0);
  const totalMonthlyKwh = totalDailyKwh * 30;
  const monthlyBill     = totalMonthlyKwh * rate;
  const totalWatts      = devices.reduce((a, d) => a + d.power, 0);
  const bldcSavings     = devices.reduce((acc, d) => {
    if (d.isBldc) return acc;
    const bW = BLDC_MAP[d.device], sW = STD_MAP[d.device];
    if (!bW || !sW) return acc;
    return acc + (((sW - bW) * d.hours * 30) / 1000) * rate;
  }, 0);

  const addDevice = () => {
    const n = devName.trim(), p = Number(devPower);
    if (!n || !p || p <= 0) { showToast("⚠️ Enter a valid device name and wattage!"); return; }
    setDevices(prev => [...prev, { id: uid(), device: n, power: p, hours: Number(devHours) || 8, isBldc: devIsBldc }]);
    setDevName(""); setDevPower(""); setDevHours("8"); setDevIsBldc(false); setPreset("");
    showToast("✅ Device added successfully!");
  };

  const deleteDevice = (id) => { setDevices(prev => prev.filter(d => d.id !== id)); showToast("🗑️ Device removed!"); };
  const toggleBldc    = (id) => setDevices(prev => prev.map(d => d.id === id ? { ...d, isBldc: !d.isBldc } : d));
  const handlePreset  = (p)  => { setPreset(p.label); setDevName(p.label); setDevPower(String(p.power)); setDevHours(String(p.hours)); };

  const handleCSV = (e) => {
    setCsvError("");
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setCsvError("Only .csv files accepted!"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").filter(Boolean);
      const added = [];
      for (let i = 1; i < lines.length; i++) {
        const [nm, pw, hr] = lines[i].split(",");
        const p = Number(pw?.trim()), h = Number(hr?.trim()) || 8;
        if (nm?.trim() && !isNaN(p) && p > 0)
          added.push({ id: uid(), device: nm.trim(), power: p, hours: h, isBldc: false });
      }
      if (!added.length) { setCsvError("No valid rows found. Format: Device, Power(W), Hours/day"); return; }
      setDevices(prev => [...prev, ...added]);
      showToast(`✅ ${added.length} devices imported!`);
    };
    reader.readAsText(file);
  };

  // ── AI — uses /api proxy to fix CORS on localhost ────────────────────────────
  const askAI = async () => {
    if (!query.trim() || aiLoading) return;
    const userMsg = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);

    const deviceList = devices.length
      ? devices.map(d => `${d.device}: ${d.power}W, ${d.hours}h/day${d.isBldc ? " (BLDC)" : ""} → ${fmt2(kwhDay(d.power, d.hours))} kWh/day`).join("\n")
      : "No devices added yet.";

    const systemPrompt = `You are PowerPulse AI, an intelligent energy monitoring assistant for an Indian household energy dashboard built for Atomberg's hackathon.

USER PROFILE:
- Name: ${name}
- Location: ${city}, ${state}
- Electricity rate: ₹${rate}/kWh

CURRENT DEVICES:
${deviceList}

SUMMARY:
- Total daily usage: ${fmt2(totalDailyKwh)} kWh
- Monthly usage: ${fmt2(totalMonthlyKwh)} kWh
- Estimated monthly bill: ₹${fmt2(monthlyBill)}
- Potential BLDC savings: ₹${fmt2(bldcSavings)}/month if compatible devices switch to BLDC

ABOUT ATOMBERG: They make BLDC fans and appliances that save up to 65% energy vs standard motors. A standard fan uses 75W; an Atomberg BLDC fan uses only 28W.

INSTRUCTIONS: Respond in clear English only. Be concise (3–5 sentences). Use specific numbers from the data above. Be friendly. Use emojis sparingly.`;

    try {
      const history = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role, content: m.content }));

      // ✅ /api/v1/messages → proxied by Vite to https://api.anthropic.com/v1/messages
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-request-allow-browser": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...history, { role: "user", content: userMsg }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const reply = json.content?.[0]?.text || "Sorry, something went wrong. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ ${err.message || "Unable to connect. Check your API key in vite.config.js."}`,
      }]);
    }
    setAiLoading(false);
  };

  const barData    = devices.map(d => ({ name: d.device, "kWh/day": parseFloat(fmt2(kwhDay(d.power, d.hours))), Watts: d.power }));
  const pieData    = devices.map(d => ({ name: d.device, value: parseFloat(fmt2(kwhDay(d.power, d.hours))) }));
  const weeklyData = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
    kWh: parseFloat((totalDailyKwh * (0.85 + Math.random() * 0.3)).toFixed(2)),
  }));

  const TABS = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "devices",   label: "🔌 Devices"   },
    { id: "ai",        label: "🤖 AI Assistant" },
    { id: "bldc",      label: "⚡ BLDC Savings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#030b18 0%,#061525 60%,#08182e 100%)", color: "#ddeeff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      <div style={{ position:"fixed",top:-80,right:-80,width:360,height:360,background:"radial-gradient(circle,#00f0ff10,transparent 70%)",pointerEvents:"none",zIndex:0 }} />
      <div style={{ position:"fixed",bottom:-100,left:-80,width:420,height:420,background:"radial-gradient(circle,#b388ff0c,transparent 70%)",pointerEvents:"none",zIndex:0 }} />

      {/* Header */}
      <div style={{ padding:"20px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(0,240,255,0.08)", flexWrap:"wrap", gap:12, position:"relative", zIndex:1 }}>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:22, fontWeight:900, background:"linear-gradient(90deg,#00f0ff,#b388ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>⚡ PowerPulse AI</div>
          <div style={{ fontSize:11, color:"#4a6a8a", letterSpacing:2, marginTop:2 }}>ATOMBERG HACKATHON 2026</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ background:"rgba(0,240,255,0.06)", border:"1px solid #00f0ff22", borderRadius:8, padding:"6px 14px", fontSize:13 }}>
            👤 <strong style={{ color:"#00f0ff" }}>{name}</strong> · {city}, {state}
          </div>
          <div style={{ background:"rgba(255,209,102,0.08)", border:"1px solid #ffd16633", borderRadius:8, padding:"6px 14px", fontSize:13, color:"#ffd166", fontWeight:700 }}>
            ₹{rate}/unit
          </div>
          <button onClick={onReset} style={{ background:"rgba(255,100,100,0.08)", border:"1px solid #ff6b6b33", borderRadius:8, padding:"6px 14px", color:"#ff6b6b", fontSize:12, cursor:"pointer" }}>
            ↩ Reset
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ padding:"20px 28px 0", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, position:"relative", zIndex:1 }}>
        <StatCard label="Daily Usage"   value={`${fmt2(totalDailyKwh)}`}       sub="kWh / day"                    color="#00f0ff" icon="📈" />
        <StatCard label="Monthly Bill"  value={`₹${Math.round(monthlyBill)}`}   sub={`${fmt2(totalMonthlyKwh)} kWh/month`} color="#ffd166" icon="💰" />
        <StatCard label="BLDC Savings"  value={`₹${Math.round(bldcSavings)}`}   sub="potential savings/month"      color="#a3ff70" icon="🌱" />
        <StatCard label="Total Devices" value={devices.length}                  sub={`${devices.filter(d=>d.isBldc).length} BLDC · ${devices.filter(d=>!d.isBldc).length} standard`} color="#b388ff" icon="🔌" />
        <StatCard label="Peak Load"     value={`${totalWatts}W`}                sub="simultaneous draw"            color="#ff6b35" icon="⚡" />
      </div>

      {/* Tabs */}
      <div style={{ padding:"24px 28px 0", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", gap:2, borderBottom:"1px solid rgba(0,240,255,0.1)", flexWrap:"wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding:"10px 20px", border:"none", borderRadius:"8px 8px 0 0", cursor:"pointer",
              background: activeTab===t.id ? "rgba(0,240,255,0.1)" : "transparent",
              color: activeTab===t.id ? "#00f0ff" : "#4a6a8a",
              fontWeight: activeTab===t.id ? 700 : 500,
              borderBottom: activeTab===t.id ? "2px solid #00f0ff" : "2px solid transparent",
              fontSize:14, transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding:"24px 28px 48px", position:"relative", zIndex:1 }}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>Energy Usage by Device (kWh / day)</div>
              {devices.length === 0
                ? <p style={{ color:"#4a6a8a", fontSize:14 }}>Add devices to see the chart.</p>
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ top:5, right:10, left:-10, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="name" stroke="#4a6a8a" tick={{ fill:"#8899bb", fontSize:11 }} />
                      <YAxis stroke="#4a6a8a" tick={{ fill:"#8899bb", fontSize:11 }} />
                      <Tooltip contentStyle={{ background:"#0d1f3c", border:"1px solid #00f0ff33", borderRadius:8, color:"#e0eaff", fontSize:13 }} />
                      <Bar dataKey="kWh/day" radius={[4,4,0,0]}>
                        {barData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Consumption Share</div>
              {devices.length === 0
                ? <p style={{ color:"#4a6a8a", fontSize:14 }}>Add devices to see the chart.</p>
                : <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                        labelLine={{ stroke:"#4a6a8a" }}>
                        {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background:"#0d1f3c", border:"1px solid #00f0ff33", borderRadius:8, color:"#e0eaff", fontSize:13 }} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Estimated Weekly Trend</div>
              {devices.length === 0
                ? <p style={{ color:"#4a6a8a", fontSize:14 }}>Add devices to see the trend.</p>
                : <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="day" stroke="#4a6a8a" tick={{ fill:"#8899bb", fontSize:11 }} />
                      <YAxis stroke="#4a6a8a" tick={{ fill:"#8899bb", fontSize:11 }} />
                      <Tooltip contentStyle={{ background:"#0d1f3c", border:"1px solid #00f0ff33", borderRadius:8, color:"#e0eaff", fontSize:13 }} />
                      <Line type="monotone" dataKey="kWh" stroke="#00f0ff" strokeWidth={2} dot={{ fill:"#00f0ff", r:4 }} />
                    </LineChart>
                  </ResponsiveContainer>
              }
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Import CSV Data</div>
              <p style={{ color:"#4a6a8a", fontSize:13, marginBottom:14, lineHeight:1.6 }}>
                Bulk-import devices from a CSV file.<br />
                Format: <code style={{ color:"#00f0ff", background:"rgba(0,240,255,0.08)", padding:"2px 6px", borderRadius:4 }}>Device, Power(W), Hours/day</code>
              </p>
              <CsvDropZone onFile={handleCSV} csvError={csvError} />
              <div style={{ marginTop:14, background:"rgba(0,240,255,0.03)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#4a6a8a", border:"1px solid #00f0ff12", lineHeight:2 }}>
                <strong style={{ color:"#00f0ff" }}>Sample rows:</strong><br />
                Fan, 75, 8<br />AC, 1500, 6<br />TV, 120, 4
              </div>
            </div>
          </div>
        )}

        {/* DEVICES */}
        {activeTab === "devices" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>Add New Device</div>
              <div style={{ fontSize:11, color:"#4a6a8a", letterSpacing:2, textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Quick Presets</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                {PRESET_DEVICES.map(p => (
                  <button key={p.label} onClick={() => handlePreset(p)} style={{
                    background: preset===p.label ? "rgba(0,240,255,0.15)" : "rgba(255,255,255,0.04)",
                    border: preset===p.label ? "1px solid #00f0ff" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius:20, padding:"4px 12px", color: preset===p.label ? "#00f0ff" : "#8899bb",
                    fontSize:12, cursor:"pointer", transition:"all 0.2s",
                  }}>{p.label}</button>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <input placeholder="Device name" value={devName} onChange={e=>setDevName(e.target.value)} style={inputStyle} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <input type="number" placeholder="Power (Watts)" value={devPower} onChange={e=>setDevPower(e.target.value)} style={inputStyle} />
                  <input type="number" placeholder="Hours per day" value={devHours} onChange={e=>setDevHours(e.target.value)} style={inputStyle} />
                </div>
                <label style={{ display:"flex", alignItems:"center", gap:8, color:"#8899bb", fontSize:13, cursor:"pointer" }}>
                  <input type="checkbox" checked={devIsBldc} onChange={e=>setDevIsBldc(e.target.checked)} style={{ accentColor:"#00f0ff" }} />
                  This is a BLDC device (Atomberg fan, etc.)
                </label>
                <button onClick={addDevice} style={btnPrimary}>+ Add Device</button>
              </div>
            </div>
            <div style={{ ...cardStyle, maxHeight:540, overflowY:"auto" }}>
              <div style={sectionTitle}>Your Devices ({devices.length})</div>
              {devices.length === 0 && <p style={{ color:"#4a6a8a", fontSize:14 }}>No devices added yet. Use the form on the left.</p>}
              {devices.map(d => (
                <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"rgba(255,255,255,0.025)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", marginBottom:8, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:120 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#ddeeff" }}>
                      {d.device} {d.isBldc && <span style={bldcBadge}>BLDC</span>}
                    </div>
                    <div style={{ color:"#4a6a8a", fontSize:12, marginTop:3 }}>
                      {d.power}W · {d.hours}h/day · {fmt2(kwhDay(d.power,d.hours))} kWh/day · ₹{Math.round(kwhDay(d.power,d.hours)*30*rate)}/mo
                    </div>
                  </div>
                  <button onClick={()=>toggleBldc(d.id)} style={{ background:"rgba(0,240,255,0.07)", border:"1px solid #00f0ff33", borderRadius:6, padding:"4px 10px", color:"#00f0ff", fontSize:12, cursor:"pointer" }}>
                    {d.isBldc ? "→ Standard" : "→ BLDC"}
                  </button>
                  <button onClick={()=>deleteDevice(d.id)} style={{ background:"rgba(255,80,80,0.08)", border:"1px solid #ff6b6b33", borderRadius:6, padding:"4px 10px", color:"#ff6b6b", fontSize:12, cursor:"pointer" }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI ASSISTANT */}
        {activeTab === "ai" && (
          <div style={{ maxWidth:740 }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>AI Energy Assistant — Powered by Claude</div>
              <div style={{ height:360, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, marginBottom:16, paddingRight:4 }}>
                {messages.map((m,i) => (
                  <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start", animation:"fadeIn 0.3s ease" }}>
                    <div style={{ fontSize:11, color:"#4a6a8a", marginBottom:4 }}>
                      {m.role==="user" ? "You" : "⚡ PowerPulse AI"}
                    </div>
                    <div style={{
                      maxWidth:"82%", padding:"12px 16px", fontSize:14, lineHeight:1.65,
                      borderRadius: m.role==="user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                      background: m.role==="user" ? "rgba(99,102,241,0.15)" : "rgba(0,240,255,0.07)",
                      border: m.role==="user" ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(0,240,255,0.15)",
                    }}>{m.content}</div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, color:"#4a6a8a", fontSize:13 }}>
                    <Spinner /> Analyzing your energy data...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                {[
                  "What's my monthly bill?",
                  "Which device uses the most power?",
                  "How much can I save with BLDC fans?",
                  "Give me energy saving tips",
                  "Is my usage high or normal?",
                ].map(q => (
                  <button key={q} onClick={() => setQuery(q)} style={{ background:"rgba(0,240,255,0.05)", border:"1px solid #00f0ff18", borderRadius:20, padding:"4px 12px", color:"#8899bb", fontSize:12, cursor:"pointer" }}>
                    {q}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <input
                  style={{ ...inputStyle, flex:1 }}
                  placeholder="Ask anything about your energy usage..."
                  value={query}
                  onChange={e=>setQuery(e.target.value)}
                  onKeyDown={e=>e.key==="Enter" && askAI()}
                />
                <button onClick={askAI} disabled={aiLoading} style={{ ...btnPrimary, minWidth:80, opacity:aiLoading?0.7:1 }}>
                  {aiLoading ? <Spinner /> : "Ask →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BLDC SAVINGS */}
        {activeTab === "bldc" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>BLDC vs Standard — Device Comparison</div>
              <p style={{ color:"#4a6a8a", fontSize:13, marginBottom:16, lineHeight:1.6 }}>
                Atomberg's BLDC technology reduces energy consumption by up to <strong style={{ color:"#a3ff70" }}>65%</strong> compared to standard motors.
              </p>
              {Object.entries(BLDC_MAP).map(([nm, bW]) => {
                const sW = STD_MAP[nm] || bW + 50;
                const d  = devices.find(x => x.device === nm);
                const hrs = d?.hours || 8;
                const saving = (((sW - bW) * hrs * 30) / 1000) * rate;
                const pct = Math.round((1 - bW/sW)*100);
                return (
                  <div key={nm} style={{ marginBottom:16, padding:"14px 16px", background:"rgba(0,240,255,0.03)", borderRadius:12, border:"1px solid rgba(0,240,255,0.08)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontWeight:700, fontSize:15 }}>{nm}</span>
                      <span style={{ color:"#a3ff70", fontWeight:700 }}>Save ₹{Math.round(saving)}/mo</span>
                    </div>
                    <div style={{ fontSize:12, color:"#4a6a8a", marginBottom:8 }}>
                      Standard: {sW}W → Atomberg BLDC: {bW}W · {pct}% less power · {hrs}h/day assumed
                    </div>
                    <div style={{ height:6, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#00f0ff,#a3ff70)", borderRadius:3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div style={cardStyle}>
                <div style={sectionTitle}>Your Total BLDC Potential</div>
                <div style={{ textAlign:"center", padding:"12px 0 20px" }}>
                  <div style={{ fontSize:11, color:"#4a6a8a", marginBottom:8, letterSpacing:2 }}>MONTHLY SAVINGS IF YOU SWITCH</div>
                  <div style={{ fontSize:52, fontWeight:900, fontFamily:"'Orbitron',monospace", color:"#a3ff70", lineHeight:1 }}>
                    ₹{Math.round(bldcSavings)}
                  </div>
                  <div style={{ color:"#4a6a8a", fontSize:13, marginTop:6 }}>per month</div>
                  <div style={{ marginTop:18, fontSize:30, fontWeight:900, fontFamily:"'Orbitron',monospace", color:"#00f0ff" }}>
                    ₹{Math.round(bldcSavings*12)}
                  </div>
                  <div style={{ color:"#4a6a8a", fontSize:13, marginTop:4 }}>per year 🎉</div>
                </div>
                {bldcSavings === 0 && <p style={{ color:"#4a6a8a", fontSize:13, textAlign:"center" }}>Add Fan, Cooler, AC, or Exhaust Fan devices to see potential savings.</p>}
              </div>
              <div style={cardStyle}>
                <div style={sectionTitle}>Why Atomberg BLDC?</div>
                {[
                  ["⚡","Uses 28W vs 75W for a standard fan — 65% energy savings"],
                  ["📱","Remote control + IoT smart home integration"],
                  ["🔇","Ultra-silent operation at all speeds"],
                  ["⭐","5-Star BEE rating — highest efficiency tier"],
                  ["🌿","Significantly reduces your carbon footprint"],
                  ["💡","Save ₹1,500+ per year per fan"],
                ].map(([icon,text]) => (
                  <div key={text} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                    <span style={{ fontSize:18, minWidth:24 }}>{icon}</span>
                    <span style={{ color:"#8899bb", fontSize:13, lineHeight:1.6 }}>{text}</span>
                  </div>
                ))}
                <a href="https://atomberg.com" target="_blank" rel="noreferrer"
                  style={{ display:"block", marginTop:8, textAlign:"center", color:"#00f0ff", fontSize:13, textDecoration:"none", borderBottom:"1px solid #00f0ff44", paddingBottom:2, width:"fit-content", margin:"12px auto 0" }}>
                  🛒 Explore Atomberg BLDC Fans →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState(null);
  if (!profile) return <Onboarding onComplete={setProfile} />;
  return <Dashboard profile={profile} onReset={() => setProfile(null)} />;
}