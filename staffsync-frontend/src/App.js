import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarOff, Clock, Megaphone, GraduationCap,
  UserCircle, LogOut, Plus, X, Search, Check, Trash2
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "https://staffsync-backend-0iiy.onrender.com/api";

/* ---------- data layer ---------- */
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};
async function api(path, { method = "GET", body } = {}) {
  const token = store.get("ss_token");
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}
function useResource(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResource = async () => {
    try {
      setLoading(true);
      const r = await api(path);
      setData(Array.isArray(r) ? r : r.data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResource();
  }, [path]);

  const add = async (body) => {
    try {
      const r = await api(path, { method: "POST", body });
      const newEntry = r.data || r;
      setData((d) => [newEntry, ...d]);
    } catch (err) {
      alert(err.message);
    }
  };

  const patch = async (id, body) => {
    try {
      await api(`${path}/${id}`, { method: "PUT", body });
      setData((d) => d.map((x) => (x._id === id ? { ...x, ...body } : x)));
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api(`${path}/${id}`, { method: "DELETE" });
      setData((d) => d.filter((x) => x._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return { data, loading, add, patch, remove, refresh: fetchResource };
}

/* ---------- auth ---------- */
const Auth = createContext(null);
const useAuth = () => useContext(Auth);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => store.get("ss_user"));

  const login = (u, token) => {
    store.set("ss_user", u);
    if (token) store.set("ss_token", token);
    setUser(u);
  };

  const logout = () => {
    store.del("ss_user");
    store.del("ss_token");
    setUser(null);
  };

  return <Auth.Provider value={{ user, login, logout }}>{children}</Auth.Provider>;
}

/* ---------- UI helpers ---------- */
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "–");
const days = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5) + 1);
const initials = (n = "") => n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

const Badge = ({ s }) => <span className={`badge b-${String(s).toLowerCase()}`}>{s}</span>;

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-h"><h3>{title}</h3><button className="icon" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Form({ fields, submitLabel, onSubmit, onClose }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.options ? f.options[0] : ""])));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); onClose(); }} className="form">
      {fields.map((f) => (
        <label key={f.name} className={f.wide ? "wide" : ""}>
          {f.label}
          {f.options ? (
            <select value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
          ) : f.area ? (
            <textarea rows={3} required={f.required !== false} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
          ) : (
            <input type={f.type || "text"} required={f.required !== false} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
          )}
        </label>
      ))}
      <div className="form-actions wide"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn">{submitLabel}</button></div>
    </form>
  );
}

function Page({ title, sub, action, children }) {
  return (
    <section className="page">
      <header className="page-h">
        <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }) => <div className="empty">{children}</div>;

/* ---------- layout ---------- */
const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, roles: ["hr", "manager", "employee"] },
  { to: "/attendance", label: "Attendance", icon: Clock, roles: ["hr", "manager", "employee"] },
  { to: "/leaves", label: "Leave", icon: CalendarOff, roles: ["hr", "manager", "employee"] },
  { to: "/employees", label: "People", icon: Users, roles: ["hr"] },
  { to: "/training", label: "Training", icon: GraduationCap, roles: ["hr", "manager", "employee"] },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["hr", "manager", "employee"] },
  { to: "/profile", label: "My profile", icon: UserCircle, roles: ["hr", "manager", "employee"] },
];

function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="mark">S</span><span>StaffSync</span></div>
        <nav>
          {NAV.filter((n) => n.roles.includes(user.role)).map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} end={to === "/"} className="nav"><I size={18} /><span>{label}</span></NavLink>
          ))}
        </nav>
        <div className="me">
          <span className="avatar">{initials(user.name)}</span>
          <div className="me-t"><strong>{user.name}</strong><small>{user.role === "hr" ? "HR Lead" : user.role}</small></div>
          <button className="icon dark" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}

const Guard = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

/* ---------- login ---------- */
function Login() {
  const { user, login } = useAuth();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api("/auth/login", { method: "POST", body: f });
      login(r.user, r.token);
    } catch (e2) {
      setErr(e2.message === "Failed to fetch" ? "Backend server is not running on port 5000." : e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art">
        <div className="art-overlay">
          <div className="art-brand"><span className="mark">S</span><span>StaffSync HR</span></div>
          <h1>Streamline your workforce in one portal.</h1>
          <p>Real-time attendance tracking, seamless leave management, and employee directories.</p>
          <div className="art-image-card">
            <img 
              src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80" 
              alt="Office Workspace" 
              className="preview-img"
            />
          </div>
        </div>
      </div>
      <form className="login-card" onSubmit={submit}>
        <div className="brand dark"><span className="mark">S</span><span>StaffSync</span></div>
        <div className="login-h">
          <h2>Welcome back</h2>
          <p className="muted">Enter your credentials to access your account</p>
        </div>
        <label>Work Email<input type="email" placeholder="sana@staffsync.io" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" /></label>
        <label>Password<input type="password" placeholder="••••••••" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn full" disabled={busy}>{busy ? "Authenticating…" : "Sign in to Dashboard"}</button>
      </form>
    </div>
  );
}

/* ---------- pages ---------- */
function Overview() {
  const { user } = useAuth();
  const att = useResource("/attendance");
  const leaves = useResource("/leaves");
  const news = useResource("/announcements");
  const emps = useResource(user.role === "hr" ? "/employees" : "/trainings");
  const pending = leaves.data.filter((l) => l.status === "Pending").length;
  const hour = new Date().getHours();
  const stats = user.role === "hr"
    ? [["Total Staff Headcount", emps.data.length], ["Pending Leave Requests", pending], ["Active Announcements", news.data.length]]
    : user.role === "manager"
    ? [["Pending Requests", pending], ["Days Present This Month", att.data.length], ["Scheduled Trainings", emps.data.length]]
    : [["Days Present This Month", att.data.length], ["My Pending Leaves", pending], ["Upcoming Trainings", emps.data.length]];

  return (
    <Page title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`} sub="Welcome to your HR management overview.">
      <div className="stats">{stats.map(([l, n]) => <div key={l} className="stat"><b>{n}</b><span>{l}</span></div>)}</div>
      <h2 className="sec">Latest Announcements</h2>
      <div className="stack">
        {news.data.slice(0, 3).map((n) => (
          <article key={n._id} className="note"><h3>{n.title}</h3><p>{n.body}</p><small className="muted">{n.author} · {fmt(n.date)}</small></article>
        ))}
        {!news.data.length && <Empty>No announcements posted yet.</Empty>}
      </div>
    </Page>
  );
}

function Attendance() {
  const res = useResource("/attendance");
  return (
    <Page title="Attendance" sub="Check-in records and daily office hours log.">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours Logged</th></tr></thead>
          <tbody>
            {res.data.map((r) => {
              const h = r.checkIn && r.checkOut ? ((new Date(`1970-01-01T${r.checkOut}`) - new Date(`1970-01-01T${r.checkIn}`)) / 36e5).toFixed(1) : "–";
              return <tr key={r._id}><td>{fmt(r.date)}</td><td>{r.checkIn || "–"}</td><td>{r.checkOut || "–"}</td><td>{h} hrs</td></tr>;
            })}
          </tbody>
        </table>
        {!res.data.length && <Empty>No attendance records found.</Empty>}
      </div>
    </Page>
  );
}

function Leaves() {
  const { user } = useAuth();
  const res = useResource("/leaves");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const review = user.role !== "employee";
  const rows = res.data.filter((l) => filter === "All" || l.status === filter);
  return (
    <Page title="Leave Applications" sub={review ? "Review and manage team leave requests." : "Apply for leave and track approval status."}
      action={<button className="btn" onClick={() => setOpen(true)}><Plus size={16} />Apply for Leave</button>}>
      <div className="chips">{["All", "Pending", "Approved", "Rejected"].map((s) => <button key={s} className={`chip ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>{s}</button>)}</div>
      <div className="table-wrap">
        <table>
          <thead><tr>{review && <th>Employee</th>}<th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th>{review && <th />}</tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l._id}>
                {review && <td><strong>{l.employee}</strong></td>}
                <td>{l.type}</td><td>{fmt(l.from)} – {fmt(l.to)}</td><td>{days(l.from, l.to)}</td><td className="clip">{l.reason}</td><td><Badge s={l.status} /></td>
                {review && (
                  <td className="acts">
                    {l.status === "Pending" && (<>
                      <button className="icon ok" aria-label="Approve" onClick={() => res.patch(l._id, { status: "Approved" })}><Check size={16} /></button>
                      <button className="icon no" aria-label="Reject" onClick={() => res.patch(l._id, { status: "Rejected" })}><X size={16} /></button>
                    </>)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No {filter === "All" ? "" : filter.toLowerCase() + " "}leave requests found.</Empty>}
      </div>
      {open && (
        <Modal title="Apply for Leave" onClose={() => setOpen(false)}>
          <Form submitLabel="Submit Application" onClose={() => setOpen(false)}
            onSubmit={(v) => res.add({ ...v, employee: user.name, status: "Pending" })}
            fields={[
              { name: "type", label: "Leave Type", options: ["Casual", "Sick", "Annual", "Unpaid"], wide: true },
              { name: "from", label: "From Date", type: "date" }, { name: "to", label: "To Date", type: "date" },
              { name: "reason", label: "Reason", area: true, wide: true },
            ]} />
        </Modal>
      )}
    </Page>
  );
}

function Employees() {
  const res = useResource("/employees");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rows = res.data.filter((e) => 
    `${e.name || ""} ${e.department || ""} ${e.position || ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const handleAddEmployee = async (formData) => {
    await res.add({
      name: formData.name,
      email: formData.email,
      department: formData.department,
      position: formData.position,
      role: (formData.role || "employee").toLowerCase(),
      password: "123456"
    });
    setOpen(false);
  };

  return (
    <Page title="Employee Directory" sub={`${res.data.length} registered employees`}
      action={<button className="btn" onClick={() => setOpen(true)}><Plus size={16} />Add Employee</button>}>
      <div className="search"><Search size={16} /><input placeholder="Search by name, department or position..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Department</th><th>Position</th><th>Access Level</th><th /></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e._id || e.email}>
                <td><div className="who"><span className="avatar sm">{initials(e.name)}</span><div><strong>{e.name}</strong><small className="muted">{e.email}</small></div></div></td>
                <td>{e.department}</td><td>{e.position}</td><td><Badge s={e.role === "hr" ? "HR" : e.role} /></td>
                <td className="acts"><button className="icon no" aria-label={`Remove ${e.name}`} onClick={() => window.confirm(`Remove ${e.name}?`) && res.remove(e._id)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No employee records match "{q}".</Empty>}
      </div>
      {open && (
        <Modal title="Add New Employee" onClose={() => setOpen(false)}>
          <Form submitLabel="Add Employee" onClose={() => setOpen(false)} onSubmit={handleAddEmployee}
            fields={[
              { name: "name", label: "Full Name", required: true },
              { name: "email", label: "Work Email", type: "email", required: true },
              { name: "department", label: "Department", required: true },
              { name: "position", label: "Position", required: true },
              { name: "role", label: "Access Level", options: ["employee", "manager", "hr"], wide: true },
            ]} />
        </Modal>
      )}
    </Page>
  );
}

function Announcements() {
  const { user } = useAuth();
  const res = useResource("/announcements");
  const [open, setOpen] = useState(false);
  return (
    <Page title="Announcements" sub="Official updates and company news."
      action={user.role === "hr" && <button className="btn" onClick={() => setOpen(true)}><Plus size={16} />Post Announcement</button>}>
      <div className="stack">
        {res.data.map((n) => (
          <article key={n._id} className="note">
            <h3>{n.title}</h3><p>{n.body}</p><small className="muted">{n.author} · {fmt(n.date)}</small>
            {user.role === "hr" && <button className="icon no del" aria-label="Delete" onClick={() => res.remove(n._id)}><Trash2 size={16} /></button>}
          </article>
        ))}
        {!res.data.length && <Empty>No announcements posted yet.</Empty>}
      </div>
      {open && (
        <Modal title="Post Announcement" onClose={() => setOpen(false)}>
          <Form submitLabel="Publish" onClose={() => setOpen(false)} onSubmit={(v) => res.add({ ...v, author: user.name, date: new Date().toISOString() })}
            fields={[{ name: "title", label: "Headline", wide: true }, { name: "body", label: "Message", area: true, wide: true }]} />
        </Modal>
      )}
    </Page>
  );
}

function Training() {
  const { user } = useAuth();
  const res = useResource("/trainings");
  const [open, setOpen] = useState(false);
  const canManage = user.role !== "employee";
  return (
    <Page title="Training Sessions" sub="Skill development and scheduled sessions."
      action={canManage && <button className="btn" onClick={() => setOpen(true)}><Plus size={16} />New Program</button>}>
      <div className="cards">
        {res.data.map((t) => (
          <article key={t._id} className="card">
            <small className="muted">{fmt(t.date)} · {t.mode}</small>
            <h3>{t.title}</h3>
            <p className="muted">{t.team} · {t.seats} seats available</p>
            {canManage && <button className="icon no del" aria-label="Delete" onClick={() => res.remove(t._id)}><Trash2 size={16} /></button>}
          </article>
        ))}
      </div>
      {!res.data.length && <Empty>No training programs scheduled.</Empty>}
      {open && (
        <Modal title="New Training Session" onClose={() => setOpen(false)}>
          <Form submitLabel="Create Session" onClose={() => setOpen(false)} onSubmit={(v) => res.add({ ...v, seats: Number(v.seats) })}
            fields={[
              { name: "title", label: "Title", wide: true }, { name: "date", label: "Date", type: "date" },
              { name: "mode", label: "Mode", options: ["Online", "In person"] },
              { name: "team", label: "Target Team" }, { name: "seats", label: "Capacity Seats", type: "number" },
            ]} />
        </Modal>
      )}
    </Page>
  );
}

function Profile() {
  const { user, login } = useAuth();
  const [p, setP] = useState({ name: user.name, email: user.email || "", phone: "", address: "", emergency: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/profile").then((r) => setP((x) => ({ ...x, ...(r.data || r) }))).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api("/profile", { method: "PUT", body: p });
      login({ ...user, name: p.name });
      setMsg("Profile saved.");
    } catch {
      setMsg("Saved locally.");
    }
  };

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <Page title="My Profile" sub="Manage your contact details and account info.">
      <form className="form card profile" onSubmit={save}>
        <label>Full Name<input value={p.name} onChange={set("name")} required /></label>
        <label>Email<input value={p.email} readOnly /></label>
        <label>Phone<input value={p.phone} onChange={set("phone")} /></label>
        <label>Emergency Contact<input value={p.emergency} onChange={set("emergency")} /></label>
        <label className="wide">Address<textarea rows={3} value={p.address} onChange={set("address")} /></label>
        <div className="form-actions wide">{msg && <span className="muted" role="status">{msg}</span>}<button className="btn">Save Changes</button></div>
      </form>
    </Page>
  );
}

/* ---------- app ---------- */
export default function App() {
  return (
    <AuthProvider>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Guard><Layout /></Guard>}>
            <Route index element={<Overview />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="employees" element={<Guard roles={["hr"]}><Employees /></Guard>} />
            <Route path="training" element={<Training />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/* ---------- CSS ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg: #ffffff;
  --sidebar-bg: #fafafa;
  --border: #eaeaea;
  --text-main: #111111;
  --text-muted: #666666;
  --radius: 8px;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100vh; background: var(--bg); }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text-main); line-height: 1.5; font-size: 14px; }

h1, h2, h3 { font-weight: 600; margin: 0; color: var(--text-main); letter-spacing: -0.02em; }
h1 { font-size: 1.5rem; }
h2 { font-size: 1.15rem; }
h3 { font-size: 1rem; }
p { margin: 0; }
.muted { color: var(--text-muted); }

button, input, select, textarea { font: inherit; color: inherit; }

.shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.side { background: var(--sidebar-bg); border-right: 1px solid var(--border); padding: 20px 16px; display: flex; flex-direction: column; gap: 24px; position: sticky; top: 0; height: 100vh; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.1rem; color: #000; }
.mark { width: 28px; height: 28px; border-radius: 6px; background: #000; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.85rem; }

nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.nav { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius); color: var(--text-muted); text-decoration: none; font-weight: 500; font-size: 0.9rem; }
.nav:hover { background: #f0f0f0; color: #000; }
.nav.active { background: #000; color: #fff; }

.me { display: flex; align-items: center; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border); }
.me-t { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.me-t strong { font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.me-t small { color: var(--text-muted); font-size: 0.75rem; }

.avatar { width: 32px; height: 32px; border-radius: 50%; background: #e5e5e5; color: #111; display: grid; place-items: center; font-weight: 600; font-size: 0.75rem; flex: none; }
.avatar.sm { width: 28px; height: 28px; font-size: 0.7rem; }

.main { padding: 36px 48px; background: var(--bg); }
.page { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.page-h { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.sec { margin-top: 12px; font-size: 1rem; }

.btn { display: inline-flex; align-items: center; gap: 8px; justify-content: center; background: #000; color: #fff; border: 1px solid #000; border-radius: var(--radius); padding: 8px 14px; font-weight: 500; font-size: 0.88rem; cursor: pointer; transition: 0.2s; }
.btn:hover { background: #333; }
.btn.ghost { background: #fff; color: #111; border: 1px solid var(--border); }
.btn.ghost:hover { background: #f5f5f5; }
.btn.full { width: 100%; }

.icon { background: transparent; border: 0; border-radius: 6px; padding: 6px; cursor: pointer; display: inline-grid; place-items: center; color: var(--text-muted); }
.icon:hover { background: #f0f0f0; color: #000; }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.stat { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; flex-direction: column; gap: 4px; }
.stat b { font-size: 1.8rem; font-weight: 700; color: #000; }
.stat span { color: var(--text-muted); font-size: 0.85rem; }

.stack { display: flex; flex-direction: column; gap: 12px; }
.note, .card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; position: relative; display: flex; flex-direction: column; gap: 6px; }
.note { border-left: 3px solid #000; }
.del { position: absolute; top: 12px; right: 12px; }

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }

.table-wrap { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 560px; }
th { text-align: left; font-weight: 600; color: var(--text-muted); font-size: 0.8rem; padding: 12px 16px; border-bottom: 1px solid var(--border); background: #fafafa; }
td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; font-size: 0.88rem; }
tr:last-child td { border-bottom: 0; }
.clip { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acts { white-space: nowrap; text-align: right; }
.who { display: flex; gap: 10px; align-items: center; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; border: 1px solid var(--border); }
.b-pending { background: #fffbe6; color: #8c6b00; border-color: #ffe58f; }
.b-approved { background: #f6ffed; color: #274e13; border-color: #b7eb8f; }
.b-rejected { background: #fff2f0; color: #a8071a; border-color: #ffccc7; }
.b-hr { background: #f9f0ff; color: #531dab; border-color: #d3adf7; }
.b-manager { background: #e6f7ff; color: #0958d9; border-color: #91caff; }
.b-employee { background: #f5f5f5; color: #262626; border-color: #d9d9d9; }

.chips { display: flex; gap: 8px; }
.chip { background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; font-size: 0.82rem; font-weight: 500; cursor: pointer; color: var(--text-muted); }
.chip.on { background: #000; color: #fff; border-color: #000; }

.search { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; color: var(--text-muted); }
.search input { border: 0; background: transparent; width: 100%; outline: 0; }

.login { display: grid; grid-template-columns: 1.1fr 420px; min-height: 100vh; background: #fff; }
.login-art { background: #fafafa; border-right: 1px solid var(--border); padding: 48px; display: flex; flex-direction: column; justify-content: center; position: relative; }
.art-overlay { max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.art-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1rem; color: #000; margin-bottom: 12px; }
.art-overlay h1 { font-size: 2.2rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.03em; }
.art-overlay p { color: var(--text-muted); font-size: 1rem; }
.art-image-card { margin-top: 24px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
.preview-img { width: 100%; height: 260px; object-fit: cover; display: block; }

.login-card { background: #fff; padding: 48px 40px; display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.login-h h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
.login-card label { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; font-weight: 500; }
.login-card input { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; background: #fff; }
.err { color: #d32f2f; font-size: 0.85rem; }

.scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.2); display: grid; place-items: center; padding: 20px; z-index: 100; }
.modal { background: #fff; border-radius: 12px; width: 100%; max-width: 440px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid var(--border); }
.modal-h { display: flex; justify-content: space-between; align-items: center; }

.form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; font-weight: 500; }
.form input, .form select, .form textarea { border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; background: #fff; }
.wide { grid-column: 1 / -1; }
.form-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 8px; }

.empty { padding: 32px; text-align: center; color: var(--text-muted); background: #fff; border: 1px solid var(--border); border-radius: var(--radius); }

@media(max-width: 840px) {
  .shell { grid-template-columns: 1fr; }
  .side { display: none; }
  .login { grid-template-columns: 1fr; }
  .login-art { display: none; }
}
`;