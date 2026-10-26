import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { 
  Users, 
  Calendar, 
  CheckSquare, 
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
  Briefcase,
  FileText
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "https://staffsync-backend-0iiy.onrender.com/api";

/* ------------ Local Storage Helper ------------ */
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

/* ------------ API Fetch Wrapper ------------ */
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

/* ------------ Auth Context ------------ */
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

/* ------------ Navigation Bar / Sidebar ------------ */
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

/* ------------ Login Page Component ------------ */
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
      setError(err.message || "Failed to login");
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

/* ------------ Main Dashboard Component ------------ */
function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ present: 0, pendingLeaves: 0, trainings: 0 });

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Good afternoon, {user?.name || "User"}</h1>
        <p>Welcome to your HR management overview.</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.present}</span>
          <span className="stat-label">Days Present This Month</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.pendingLeaves}</span>
          <span className="stat-label">My Pending Leaves</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.trainings}</span>
          <span className="stat-label">Upcoming Trainings</span>
        </div>
      </div>

      <section className="dashboard-section">
        <h3>Latest Announcements</h3>
        <div className="empty-card">
          <p>No announcements posted yet.</p>
        </div>
      </section>
    </div>
  );
}

/* ------------ Placeholder Pages ------------ */
function Employees() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Employees Directory</h1>
        <p>Manage staff profiles and team structures.</p>
      </header>
      <div className="empty-card"><p>Employee data list rendering here...</p></div>
    </div>
  );
}

function Attendance() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Attendance Tracking</h1>
        <p>View daily check-ins and monthly logs.</p>
      </header>
      <div className="empty-card"><p>Attendance logs loading...</p></div>
    </div>
  );
}

function Leaves() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Leave Requests</h1>
        <p>Apply or approve pending leave applications.</p>
      </header>
      <div className="empty-card"><p>No leave requests found.</p></div>
    </div>
  );
}

function Announcements() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Announcements</h1>
        <p>Company news and notifications.</p>
      </header>
      <div className="empty-card"><p>No announcements right now.</p></div>
    </div>
  );
}

/* ------------ Layout Wrapper ------------ */
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

/* ------------ Protected Route Wrapper ------------ */
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

/* ------------ App Entry Point ------------ */
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