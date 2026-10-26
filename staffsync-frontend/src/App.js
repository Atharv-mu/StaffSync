import "./App.css";
import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { 
  Users, 
  Calendar, 
  Clock, 
  LogOut, 
  Plus, 
  Trash2, 
  Check, 
  Shield, 
  UserCheck, 
  X,
  LayoutDashboard,
  Megaphone,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  UserPlus,
  Send,
  Building,
  Mail,
  Briefcase
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "https://staffsync-backend-0iiy.onrender.com/api";

/* ==========================================
   LOCAL STORAGE & API WRAPPER UTILS
   ========================================== */
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

async function api(path, { method = "GET", body } = {}) {
  const token = store.get("ss_token");
  const res = await fetch(API + path, {
    method,
    headers: { 
      "Content-Type": "application/json", 
      ...(token ? { Authorization: `Bearer ${token}` } : {}) 
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

/* ==========================================
   AUTHENTICATION CONTEXT
   ========================================== */
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(store.get("ss_user"));
  const [token, setToken] = useState(store.get("ss_token"));

  const login = (u, t) => {
    setUser(u);
    setToken(t);
    store.set("ss_user", u);
    store.set("ss_token", t);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    store.del("ss_user");
    store.del("ss_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ==========================================
   SIDEBAR NAVIGATION COMPONENT
   ========================================== */
function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Employees", path: "/employees", icon: Users },
    { name: "Attendance", path: "/attendance", icon: Clock },
    { name: "Leaves", path: "/leaves", icon: Calendar },
    { name: "Announcements", path: "/announcements", icon: Megaphone },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">S</div>
        <h2>StaffSync</h2>
      </div>

      <nav className="sidebar-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-role">{user?.role || "employee"}</span>
          </div>
        </div>
        <button onClick={logout} className="logout-btn" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

/* ==========================================
   LOGIN PAGE COMPONENT
   ========================================== */
function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      login(data.user, data.token);
    } catch (err) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-banner">
        <div className="banner-header">
          <div className="logo-badge dark">S</div>
          <span>StaffSync HR</span>
        </div>
        <h1>Streamline your workforce in one portal.</h1>
        <p>Real-time attendance tracking, seamless leave management, and employee directories.</p>
        <div className="banner-image-wrapper">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80" 
            alt="Office workspace" 
          />
        </div>
      </div>

      <div className="login-form-area">
        <div className="form-card">
          <div className="form-header">
            <div className="logo-badge">S</div>
            <h2>StaffSync</h2>
            <h3>Welcome back</h3>
            <p>Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sana@staffsync.io"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <div className="error-alert">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   DASHBOARD OVERVIEW COMPONENT
   ========================================== */
function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ employeesCount: 0, pendingLeaves: 0, presentToday: 0 });
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const emp = await api("/employees").catch(() => []);
        const leaves = await api("/leaves").catch(() => []);
        const ann = await api("/announcements").catch(() => []);
        
        setStats({
          employeesCount: Array.isArray(emp) ? emp.length : 0,
          pendingLeaves: Array.isArray(leaves) ? leaves.filter(l => l.status === "pending").length : 0,
          presentToday: 1,
        });
        setAnnouncements(Array.isArray(ann) ? ann.slice(0, 3) : []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Good day, {user?.name || "User"}</h1>
        <p>Welcome to your HR management overview.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Team Members</span>
            <Users className="stat-icon" size={20} />
          </div>
          <span className="stat-value">{stats.employeesCount}</span>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span>Pending Leave Applications</span>
            <Calendar className="stat-icon" size={20} />
          </div>
          <span className="stat-value">{stats.pendingLeaves}</span>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span>Attendance Status Today</span>
            <Clock className="stat-icon" size={20} />
          </div>
          <span className="stat-value">{stats.presentToday > 0 ? "Present" : "Not Marked"}</span>
        </div>
      </div>

      <section className="dashboard-section">
        <h3>Recent Company Announcements</h3>
        {announcements.length === 0 ? (
          <div className="empty-card">
            <p>No announcements posted yet.</p>
          </div>
        ) : (
          <div className="cards-grid">
            {announcements.map((item, idx) => (
              <div key={idx} className="info-card">
                <h4>{item.title}</h4>
                <p>{item.content}</p>
                <small>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ==========================================
   EMPLOYEES MANAGEMENT COMPONENT
   ========================================== */
function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", department: "Engineering" });
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      const data = await api("/employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/employees", { method: "POST", body: form });
      setShowModal(false);
      setForm({ name: "", email: "", role: "employee", department: "Engineering" });
      fetchEmployees();
    } catch (err) {
      alert(err.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this employee?")) return;
    try {
      await api(`/employees/${id}`, { method: "DELETE" });
      fetchEmployees();
    } catch (err) {
      alert(err.message || "Failed to delete employee");
    }
  };

  const filtered = employees.filter(e => 
    e.name?.toLowerCase().includes(search.toLowerCase()) || 
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>Employees Directory</h1>
          <p>Manage employee records, roles, and departmental access.</p>
        </div>
        {user?.role === "admin" && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={18} /> Add Employee
          </button>
        )}
      </header>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search employees by name or email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              {user?.role === "admin" && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">No employees found.</td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp._id || emp.email}>
                  <td className="font-medium">
                    <div className="flex-align gap-2">
                      <div className="avatar-sm">{emp.name?.charAt(0).toUpperCase()}</div>
                      {emp.name}
                    </div>
                  </td>
                  <td>{emp.email}</td>
                  <td>
                    <span className={`badge ${emp.role === "admin" ? "badge-admin" : "badge-emp"}`}>
                      {emp.role}
                    </span>
                  </td>
                  <td>{emp.department || "General"}</td>
                  {user?.role === "admin" && (
                    <td>
                      <button className="btn-danger-icon" onClick={() => handleDelete(emp._id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Employee</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label>Full Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Doe" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@staffsync.io" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Engineering" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Create Employee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================
   ATTENDANCE MANAGEMENT COMPONENT
   ========================================== */
function Attendance() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [logs, setLogs] = useState([]);

  const handleCheckIn = () => {
    const time = new Date().toLocaleTimeString();
    setCheckedIn(true);
    setCheckInTime(time);
    setLogs([{ date: new Date().toLocaleDateString(), status: "Present", checkIn: time, checkOut: "--" }, ...logs]);
  };

  const handleCheckOut = () => {
    const time = new Date().toLocaleTimeString();
    setCheckedIn(false);
    if (logs.length > 0) {
      const updated = [...logs];
      updated[0].checkOut = time;
      setLogs(updated);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Attendance Tracking</h1>
        <p>Log your daily working hours and review time history.</p>
      </header>

      <div className="card-box flex-between flex-align">
        <div>
          <h3>Today's Shift Status</h3>
          <p>{checkedIn ? `Checked in at ${checkInTime}` : "You haven't checked in yet today."}</p>
        </div>
        <div>
          {!checkedIn ? (
            <button className="btn-success" onClick={handleCheckIn}>
              <CheckCircle size={18} /> Clock In Now
            </button>
          ) : (
            <button className="btn-warning" onClick={handleCheckOut}>
              <Clock size={18} /> Clock Out
            </button>
          )}
        </div>
      </div>

      <div className="section-title mt-6">
        <h3>Attendance Logs</h3>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Check In Time</th>
              <th>Check Out Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">No attendance recorded today.</td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr key={i}>
                  <td>{log.date}</td>
                  <td><span className="badge badge-success">{log.status}</span></td>
                  <td>{log.checkIn}</td>
                  <td>{log.checkOut}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==========================================
   LEAVES MANAGEMENT COMPONENT
   ========================================== */
function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ reason: "", startDate: "", endDate: "", type: "Casual" });

  const fetchLeaves = async () => {
    try {
      const data = await api("/leaves");
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api("/leaves", { method: "POST", body: form });
      setShowModal(false);
      setForm({ reason: "", startDate: "", endDate: "", type: "Casual" });
      fetchLeaves();
    } catch (err) {
      alert(err.message || "Failed to apply leave");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api(`/leaves/${id}`, { method: "PATCH", body: { status } });
      fetchLeaves();
    } catch (err) {
      alert(err.message || "Status update failed");
    }
  };

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>Leave Management</h1>
          <p>Apply for leaves and track request approvals.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Apply Leave
        </button>
      </header>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Reason</th>
              <th>Dates</th>
              <th>Status</th>
              {user?.role === "admin" && <th>Approve / Reject</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">No leave requests found.</td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l._id || l.reason}>
                  <td className="font-medium">{l.type || "Sick"}</td>
                  <td>{l.reason}</td>
                  <td>{l.startDate} to {l.endDate}</td>
                  <td>
                    <span className={`badge badge-${l.status}`}>
                      {l.status}
                    </span>
                  </td>
                  {user?.role === "admin" && (
                    <td>
                      {l.status === "pending" && (
                        <div className="flex-align gap-2">
                          <button className="btn-success-sm" onClick={() => handleStatusChange(l._id, "approved")}>
                            <Check size={16} />
                          </button>
                          <button className="btn-danger-sm" onClick={() => handleStatusChange(l._id, "rejected")}>
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Apply for Leave</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="form-group">
                <label>Leave Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Vacation">Vacation</option>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea required rows="3" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Reason for leave..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================
   ANNOUNCEMENTS COMPONENT
   ========================================== */
function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fetchAnnouncements = async () => {
    try {
      const data = await api("/announcements");
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    try {
      await api("/announcements", { method: "POST", body: { title, content } });
      setTitle("");
      setContent("");
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || "Failed to post announcement");
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Company Announcements</h1>
        <p>Stay informed on upcoming events and official updates.</p>
      </header>

      {user?.role === "admin" && (
        <div className="card-box mb-6">
          <h3>Post New Announcement</h3>
          <form onSubmit={handlePost} className="mt-4">
            <div className="form-group">
              <label>Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Town Hall Meeting Scheduled" />
            </div>
            <div className="form-group">
              <label>Message Content</label>
              <textarea required rows="3" value={content} onChange={e => setContent(e.target.value)} placeholder="Announcement details..." />
            </div>
            <button type="submit" className="btn-primary">
              <Send size={16} /> Publish Announcement
            </button>
          </form>
        </div>
      )}

      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="empty-card"><p>No announcements posted yet.</p></div>
        ) : (
          announcements.map((ann, i) => (
            <div key={i} className="card-box mb-4">
              <div className="flex-between">
                <h3>{ann.title}</h3>
                <small className="text-muted">{new Date(ann.createdAt || Date.now()).toLocaleDateString()}</small>
              </div>
              <p className="mt-2 text-secondary">{ann.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ==========================================
   LAYOUT WRAPPER & ROUTING
   ========================================== */
function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/leaves" element={<ProtectedRoute><Leaves /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}