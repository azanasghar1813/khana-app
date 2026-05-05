import { useState, useEffect, useRef } from "react";

// ─── Palette & helpers ─────────────────────────────────────────────────────
const COLORS = {
  light: {
    bg: "#F5F0E8",
    card: "#FFFFFF",
    cardAlt: "#FFF8F0",
    primary: "#D4622A",
    primaryLight: "#F28B5A",
    accent: "#2A7D4F",
    accentLight: "#4CAF7D",
    text: "#1A1A2E",
    sub: "#6B6B8A",
    border: "#E8E0D5",
    positive: "#2A7D4F",
    negative: "#C0392B",
    neutral: "#6B6B8A",
    shadow: "rgba(212,98,42,0.12)",
  },
  dark: {
    bg: "#0F0F1A",
    card: "#1A1A2E",
    cardAlt: "#22223A",
    primary: "#F28B5A",
    primaryLight: "#D4622A",
    accent: "#4CAF7D",
    accentLight: "#2A7D4F",
    text: "#F0EBE3",
    sub: "#9D9DBF",
    border: "#2E2E4A",
    positive: "#4CAF7D",
    negative: "#E57373",
    neutral: "#9D9DBF",
    shadow: "rgba(242,139,90,0.15)",
  },
};

const MEAL_EMOJIS = { Subha: "☀️", Shaam: "🌙" };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(n) {
  return "₨ " + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Storage ───────────────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ─── Settlement calculator ─────────────────────────────────────────────────
function calcBalances(members, entries) {
  const bal = {};
  members.forEach((m) => (bal[m.id] = 0));
  entries.forEach(({ amount, paidBy, split }) => {
    const share = split || amount / members.length;
    members.forEach((m) => {
      if (m.id === paidBy) bal[m.id] += amount - share;
      else bal[m.id] -= share;
    });
  });
  return bal;
}

function calcSettlements(members, balances) {
  const pos = members
    .filter((m) => balances[m.id] > 0.5)
    .map((m) => ({ id: m.id, name: m.name, amt: balances[m.id] }));
  const neg = members
    .filter((m) => balances[m.id] < -0.5)
    .map((m) => ({ id: m.id, name: m.name, amt: -balances[m.id] }));
  const txns = [];
  let i = 0,
    j = 0;
  const p = pos.map((x) => ({ ...x }));
  const n = neg.map((x) => ({ ...x }));
  while (i < p.length && j < n.length) {
    const transfer = Math.min(p[i].amt, n[j].amt);
    if (transfer > 0.5)
      txns.push({ from: n[j].name, to: p[i].name, amt: transfer });
    p[i].amt -= transfer;
    n[j].amt -= transfer;
    if (p[i].amt < 0.5) i++;
    if (n[j].amt < 0.5) j++;
  }
  return txns;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(() => load("dkh_dark", false));
  const [tab, setTab] = useState("home");
  const [members, setMembers] = useState(() =>
    load("dkh_members", [
      { id: "m1", name: "Ali" },
      { id: "m2", name: "Bilal" },
      { id: "m3", name: "Sara" },
    ])
  );
  const [entries, setEntries] = useState(() => load("dkh_entries", []));
  const [showAdd, setShowAdd] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);

  const C = dark ? COLORS.dark : COLORS.light;

  useEffect(() => { save("dkh_dark", dark); }, [dark]);
  useEffect(() => { save("dkh_members", members); }, [members]);
  useEffect(() => { save("dkh_entries", entries); }, [entries]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function addEntry(entry) {
    const share = entry.amount / members.length;
    const newEntry = { ...entry, id: uid(), split: share, createdAt: Date.now() };
    setEntries((prev) => [newEntry, ...prev]);
    showToast("Entry added!");
  }

  function updateEntry(entry) {
    const share = entry.amount / members.length;
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...entry, split: share } : e))
    );
    showToast("Entry updated!");
  }

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast("Entry deleted!", "error");
  }

  const balances = calcBalances(members, entries);
  const settlements = calcSettlements(members, balances);

  // Filter entries
  const now = new Date();
  const filteredEntries = entries.filter((e) => {
    const d = new Date(e.date);
    if (filter === "week") {
      const diff = (now - d) / 86400000;
      return diff <= 7;
    }
    if (filter === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const s = {
    app: {
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      maxWidth: 420,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.3s, color 0.3s",
    },
    header: {
      background: C.primary,
      padding: "20px 20px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: `0 4px 20px ${C.shadow}`,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 800,
      color: "#fff",
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 11,
      color: "rgba(255,255,255,0.75)",
      fontWeight: 600,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: 2,
    },
    iconBtn: {
      background: "rgba(255,255,255,0.2)",
      border: "none",
      borderRadius: 12,
      width: 38,
      height: 38,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: 18,
      color: "#fff",
      transition: "background 0.2s",
    },
    nav: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 420,
      background: C.card,
      borderTop: `1px solid ${C.border}`,
      display: "flex",
      zIndex: 100,
      boxShadow: `0 -4px 20px ${C.shadow}`,
    },
    navBtn: (active) => ({
      flex: 1,
      padding: "12px 0 10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      background: "none",
      border: "none",
      cursor: "pointer",
      color: active ? C.primary : C.sub,
      fontSize: 10,
      fontWeight: active ? 800 : 600,
      fontFamily: "inherit",
      transition: "color 0.2s",
    }),
    fab: {
      position: "fixed",
      bottom: 80,
      right: "calc(50% - 210px + 16px)",
      background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
      color: "#fff",
      border: "none",
      borderRadius: 20,
      width: 56,
      height: 56,
      fontSize: 28,
      cursor: "pointer",
      boxShadow: `0 6px 24px ${C.shadow}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99,
      transition: "transform 0.2s, box-shadow 0.2s",
    },
    content: {
      padding: "16px 16px 120px",
    },
    card: {
      background: C.card,
      borderRadius: 18,
      padding: "16px",
      marginBottom: 12,
      boxShadow: `0 2px 12px ${C.shadow}`,
      border: `1px solid ${C.border}`,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: C.sub,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 12,
      marginTop: 4,
    },
    balCard: (val) => ({
      background: val > 0.5 ? C.positive + "18" : val < -0.5 ? C.negative + "18" : C.card,
      borderRadius: 16,
      padding: "14px 16px",
      marginBottom: 10,
      border: `1.5px solid ${val > 0.5 ? C.positive + "40" : val < -0.5 ? C.negative + "40" : C.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }),
    toast: (type) => ({
      position: "fixed",
      top: 80,
      left: "50%",
      transform: "translateX(-50%)",
      background: type === "error" ? C.negative : C.accent,
      color: "#fff",
      padding: "10px 24px",
      borderRadius: 50,
      fontSize: 14,
      fontWeight: 700,
      zIndex: 999,
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      whiteSpace: "nowrap",
    }),
  };

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.headerTitle}>🍽️ Daily Khana Hisab</div>
          <div style={s.headerSub}>{members.length} members • Expense Tracker</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.iconBtn} onClick={() => setShowMembers(true)} title="Members">👥</button>
          <button style={s.iconBtn} onClick={() => setDark((d) => !d)} title="Dark mode">{dark ? "☀️" : "🌙"}</button>
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>
        {tab === "home" && (
          <HomeTab
            C={C} s={s} members={members} entries={filteredEntries}
            balances={balances} onEdit={(e) => { setEditEntry(e); setShowAdd(true); }}
            onDelete={deleteEntry}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            C={C} s={s} entries={filteredEntries} members={members}
            filter={filter} setFilter={setFilter}
            onEdit={(e) => { setEditEntry(e); setShowAdd(true); }}
            onDelete={deleteEntry}
          />
        )}
        {tab === "settle" && (
          <SettleTab C={C} s={s} settlements={settlements} members={members} balances={balances} />
        )}
      </div>

      {/* FAB */}
      <button style={s.fab} onClick={() => { setEditEntry(null); setShowAdd(true); }}>+</button>

      {/* Nav */}
      <nav style={s.nav}>
        {[
          { id: "home", icon: "🏠", label: "Home" },
          { id: "history", icon: "📋", label: "History" },
          { id: "settle", icon: "💸", label: "Settle Up" },
        ].map((t) => (
          <button key={t.id} style={s.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Modals */}
      {showAdd && (
        <AddEntryModal
          C={C} members={members} editEntry={editEntry}
          onClose={() => { setShowAdd(false); setEditEntry(null); }}
          onSave={(e) => { editEntry ? updateEntry(e) : addEntry(e); setShowAdd(false); setEditEntry(null); }}
        />
      )}
      {showMembers && (
        <MembersModal
          C={C} members={members} setMembers={setMembers}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}

// ─── Home Tab ──────────────────────────────────────────────────────────────
function HomeTab({ C, s, members, entries, balances, onEdit, onDelete }) {
  const total = entries.reduce((a, e) => a + e.amount, 0);
  const todayEntries = entries.filter((e) => e.date === today());

  return (
    <>
      {/* Summary card */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
        borderRadius: 20, padding: "20px", marginBottom: 16, color: "#fff",
        boxShadow: `0 6px 24px ${C.shadow}`,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>Total Tracked</div>
        <div style={{ fontSize: 36, fontWeight: 900, marginTop: 4, letterSpacing: -1 }}>₨ {total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{entries.length} entries • {todayEntries.length} today</div>
      </div>

      {/* Balances */}
      <div style={s.sectionTitle}>Member Balances</div>
      {members.map((m) => {
        const val = balances[m.id] || 0;
        return (
          <div key={m.id} style={s.balCard(val)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: val > 0.5 ? C.positive : val < -0.5 ? C.negative : C.sub,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800,
              }}>{m.name[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
                  {Math.abs(val) < 0.5 ? "Settled ✓" : val > 0 ? "Will receive" : "Needs to pay"}
                </div>
              </div>
            </div>
            <div style={{
              fontWeight: 900, fontSize: 16,
              color: val > 0.5 ? C.positive : val < -0.5 ? C.negative : C.sub,
            }}>
              {Math.abs(val) < 0.5 ? "₨ 0" : (val > 0 ? "+" : "-") + fmt(val)}
            </div>
          </div>
        );
      })}

      {/* Recent entries */}
      {entries.length > 0 && (
        <>
          <div style={{ ...s.sectionTitle, marginTop: 8 }}>Recent Entries</div>
          {entries.slice(0, 5).map((e) => (
            <EntryCard key={e.id} entry={e} members={members} C={C} s={s} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </>
      )}

      {entries.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 40, color: C.sub }}>
          <div style={{ fontSize: 48 }}>🍽️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>No entries yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Tap + to add your first meal expense</div>
        </div>
      )}
    </>
  );
}

// ─── History Tab ───────────────────────────────────────────────────────────
function HistoryTab({ C, s, entries, members, filter, setFilter, onEdit, onDelete }) {
  const filters = [
    { id: "all", label: "All Time" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
  ];

  return (
    <>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: "8px 0", borderRadius: 12, border: "none",
            background: filter === f.id ? C.primary : C.card,
            color: filter === f.id ? "#fff" : C.sub,
            fontWeight: 700, fontSize: 12, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
            boxShadow: filter === f.id ? `0 3px 12px ${C.shadow}` : "none",
            border: `1.5px solid ${filter === f.id ? C.primary : C.border}`,
          }}>{f.label}</button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 40, color: C.sub }}>
          <div style={{ fontSize: 40 }}>📭</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>No entries for this period</div>
        </div>
      ) : (
        entries.map((e) => (
          <EntryCard key={e.id} entry={e} members={members} C={C} s={s} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}
    </>
  );
}

// ─── Settle Tab ────────────────────────────────────────────────────────────
function SettleTab({ C, s, settlements, members, balances }) {
  return (
    <>
      <div style={{
        background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
        borderRadius: 20, padding: "20px", marginBottom: 16, color: "#fff",
        boxShadow: `0 6px 24px ${C.accent}30`,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>Settlement Required</div>
        <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>{settlements.length} transaction{settlements.length !== 1 ? "s" : ""}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>To fully balance all accounts</div>
      </div>

      {settlements.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 30, color: C.sub }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 8, color: C.accent }}>All Settled Up!</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Everyone's balance is even</div>
        </div>
      ) : (
        <>
          <div style={s.sectionTitle}>Transactions to Make</div>
          {settlements.map((t, i) => (
            <div key={i} style={{
              ...s.card,
              display: "flex", alignItems: "center", gap: 12,
              borderLeft: `4px solid ${C.primary}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14, background: C.negative + "20",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>💸</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  <span style={{ color: C.negative }}>{t.from}</span>
                  <span style={{ color: C.sub, fontSize: 12 }}> → </span>
                  <span style={{ color: C.positive }}>{t.to}</span>
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2, fontWeight: 600 }}>Should transfer</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: C.primary }}>{fmt(t.amt)}</div>
            </div>
          ))}
        </>
      )}

      <div style={s.sectionTitle}>All Balances</div>
      {members.map((m) => {
        const val = balances[m.id] || 0;
        return (
          <div key={m.id} style={{
            ...s.card,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: val > 0.5 ? C.positive : val < -0.5 ? C.negative : C.sub,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14,
              }}>{m.name[0]}</div>
              <div style={{ fontWeight: 700 }}>{m.name}</div>
            </div>
            <div style={{
              fontWeight: 900, fontSize: 15,
              color: val > 0.5 ? C.positive : val < -0.5 ? C.negative : C.sub,
            }}>
              {Math.abs(val) < 0.5 ? "₨ 0" : (val > 0 ? "+" : "-") + fmt(val)}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Entry Card ────────────────────────────────────────────────────────────
function EntryCard({ entry, members, C, s, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const payer = members.find((m) => m.id === entry.paidBy);

  return (
    <div style={{
      ...s.card, cursor: "pointer",
      borderLeft: `4px solid ${entry.meal === "Subha" ? "#F59E0B" : "#6366F1"}`,
    }} onClick={() => setShowActions((v) => !v)}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: entry.meal === "Subha" ? "#FEF3C7" : "#EDE9FE",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>{MEAL_EMOJIS[entry.meal]}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{entry.meal} Khana</div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginTop: 2 }}>
              {entry.date} • Paid by <span style={{ color: C.primary }}>{payer?.name || "?"}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 900, fontSize: 17, color: C.text }}>₨ {entry.amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>÷ {members.length} = {fmt(entry.split || entry.amount / members.length)}/each</div>
        </div>
      </div>

      {showActions && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }} style={{
            flex: 1, padding: "8px", borderRadius: 10, border: `1.5px solid ${C.primary}`,
            background: C.primary + "15", color: C.primary, fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>✏️ Edit</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} style={{
            flex: 1, padding: "8px", borderRadius: 10, border: `1.5px solid ${C.negative}`,
            background: C.negative + "15", color: C.negative, fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>🗑️ Delete</button>
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit Entry Modal ──────────────────────────────────────────────────
function AddEntryModal({ C, members, editEntry, onClose, onSave }) {
  const [date, setDate] = useState(editEntry?.date || today());
  const [meal, setMeal] = useState(editEntry?.meal || "Subha");
  const [amount, setAmount] = useState(editEntry?.amount?.toString() || "");
  const [paidBy, setPaidBy] = useState(editEntry?.paidBy || members[0]?.id || "");
  const [err, setErr] = useState("");

  const share = amount && !isNaN(amount) ? parseFloat(amount) / members.length : 0;

  function handleSave() {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setErr("Please enter a valid amount");
      return;
    }
    onSave({ ...(editEntry || {}), date, meal, amount: parseFloat(amount), paidBy });
  }

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 14,
    border: `1.5px solid ${C.border}`, background: C.bg,
    color: C.text, fontSize: 15, fontFamily: "inherit", fontWeight: 600,
    boxSizing: "border-box", outline: "none", appearance: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 200, display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: "24px 24px 0 0",
        padding: "24px 20px 40px", width: "100%", maxWidth: 420,
        margin: "0 auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />

        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 20, color: C.text }}>
          {editEntry ? "✏️ Edit Entry" : "➕ Add Entry"}
        </div>

        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </div>

        {/* Meal */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Meal Type</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["Subha", "Shaam"].map((m) => (
              <button key={m} onClick={() => setMeal(m)} style={{
                flex: 1, padding: "12px", borderRadius: 14, fontFamily: "inherit",
                border: `2px solid ${meal === m ? C.primary : C.border}`,
                background: meal === m ? C.primary + "18" : C.bg,
                color: meal === m ? C.primary : C.sub,
                fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}>{MEAL_EMOJIS[m]} {m}</button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Total Amount (₨)</label>
          <input
            type="number" inputMode="numeric" placeholder="0"
            value={amount} onChange={(e) => { setAmount(e.target.value); setErr(""); }}
            style={{ ...inp, fontSize: 20, fontWeight: 900 }}
          />
          {share > 0 && (
            <div style={{ fontSize: 12, color: C.sub, marginTop: 6, fontWeight: 600 }}>
              Each member pays: <strong style={{ color: C.primary }}>{fmt(share)}</strong>
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: C.negative, marginTop: 4, fontWeight: 700 }}>{err}</div>}
        </div>

        {/* Paid By */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: C.sub, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Paid By</label>
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} style={inp}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {/* Preview */}
        {share > 0 && (
          <div style={{
            background: C.bg, borderRadius: 14, padding: "12px 14px",
            marginBottom: 20, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Split Preview</div>
            {members.map((m) => {
              const isPayer = m.id === paidBy;
              const net = isPayer ? parseFloat(amount) - share : -share;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name} {isPayer ? "👑" : ""}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: net > 0 ? C.positive : C.negative }}>
                    {net > 0 ? "+" : ""}{fmt(Math.abs(net))} {net > 0 ? "receives" : "owes"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={handleSave} style={{
          width: "100%", padding: "15px", borderRadius: 16,
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          color: "#fff", border: "none", fontWeight: 900, fontSize: 16,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: `0 6px 20px ${C.shadow}`,
        }}>
          {editEntry ? "Save Changes" : "Add Entry ✓"}
        </button>
      </div>
    </div>
  );
}

// ─── Members Modal ─────────────────────────────────────────────────────────
function MembersModal({ C, members, setMembers, onClose }) {
  const [names, setNames] = useState(members.map((m) => ({ ...m })));
  const [newName, setNewName] = useState("");

  function updateName(id, val) {
    setNames((prev) => prev.map((m) => (m.id === id ? { ...m, name: val } : m)));
  }

  function addMember() {
    const n = newName.trim();
    if (!n || names.length >= 5) return;
    setNames((prev) => [...prev, { id: uid(), name: n }]);
    setNewName("");
  }

  function removeMember(id) {
    if (names.length <= 2) return;
    setNames((prev) => prev.filter((m) => m.id !== id));
  }

  function save() {
    const valid = names.filter((m) => m.name.trim());
    setMembers(valid);
    onClose();
  }

  const inp = {
    flex: 1, padding: "11px 13px", borderRadius: 12,
    border: `1.5px solid ${C.border}`, background: C.bg,
    color: C.text, fontSize: 15, fontFamily: "inherit", fontWeight: 700, outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 200, display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div style={{
        background: C.card, borderRadius: "24px 24px 0 0",
        padding: "24px 20px 40px", width: "100%", maxWidth: 420,
        margin: "0 auto",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: C.text }}>👥 Manage Members</div>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginBottom: 20 }}>2–5 members • Tap name to edit</div>

        {names.map((m) => (
          <div key={m.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: C.primary + "20",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, color: C.primary, fontSize: 16,
            }}>{m.name[0]?.toUpperCase()}</div>
            <input value={m.name} onChange={(e) => updateName(m.id, e.target.value)} style={inp} />
            {names.length > 2 && (
              <button onClick={() => removeMember(m.id)} style={{
                width: 44, height: 44, borderRadius: 12, border: "none",
                background: C.negative + "18", color: C.negative, fontSize: 18,
                cursor: "pointer",
              }}>✕</button>
            )}
          </div>
        ))}

        {names.length < 5 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              placeholder="New member name…" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              style={{ ...inp, flex: 1 }}
            />
            <button onClick={addMember} style={{
              width: 44, height: 44, borderRadius: 12, border: "none",
              background: C.accent + "20", color: C.accent, fontSize: 22, fontWeight: 900,
              cursor: "pointer",
            }}>+</button>
          </div>
        )}

        <button onClick={save} style={{
          width: "100%", padding: "14px", borderRadius: 16,
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
          color: "#fff", border: "none", fontWeight: 900, fontSize: 15,
          cursor: "pointer", fontFamily: "inherit",
        }}>Save Members ✓</button>
      </div>
    </div>
  );
}
