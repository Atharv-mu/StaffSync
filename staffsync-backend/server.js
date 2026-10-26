require("dotenv").config(); // npm install dotenv (local .env ke liye)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Leave = require("./models/Leave");
const Announcement = require("./models/Announcement");

const app = express();
app.use(cors());
app.use(express.json());

// Secrets sirf environment se aayenge (Render > Environment, local > .env)
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
if (!JWT_SECRET || !MONGO_URI) {
  console.error("JWT_SECRET and MONGO_URI must be set in environment variables.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected Successfully!"))
  .catch((err) => console.error("MongoDB Error:", err));

// ---------- User model ----------
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "employee" },
  department: { type: String, default: "General" },
  position: { type: String, default: "Employee" },
  phone: String,
  address: String,
  emergency: String,
});
const User = mongoose.model("User", userSchema);

// ---------- Middleware ----------
const isAdminRole = (role) => ["admin", "hr"].includes(String(role || "").toLowerCase());

const auth = (req, res, next) => {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ message: "Not logged in" });
  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Session expired, login again" });
  }
};

const adminOnly = (req, res, next) =>
  isAdminRole(req.user.role) ? next() : res.status(403).json({ message: "Admins only" });

// ---------- Auth ----------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Frontend login ke baad /profile call karta hai
app.get("/api/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Employees ----------
app.get("/api/employees", auth, async (req, res) => {
  try {
    res.json(await User.find({}).select("-password"));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/employees", auth, adminOnly, async (req, res) => {
  try {
    const { name, email, department, position, role, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password || "123456", 10);
    const newUser = await User.create({
      name,
      email,
      department: department || "General",
      position: position || "Employee",
      role: (role || "employee").toLowerCase(),
      password: hashed,
    });

    const data = newUser.toObject();
    delete data.password;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete("/api/employees/:id", auth, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: "You cannot delete your own account" });
    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Leaves ----------
app.get("/api/leaves", auth, async (req, res) => {
  try {
    const filter = isAdminRole(req.user.role) ? {} : { applicant: req.user.id };
    const leaves = await Leave.find(filter).populate("applicant", "name email").sort({ createdAt: -1 });
    res.json(leaves.map((l) => ({ ...l.toObject(), employee: l.applicant?.name })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/leaves", auth, async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    if (new Date(endDate) < new Date(startDate))
      return res.status(400).json({ message: "End date cannot be before start date" });
    const leave = await Leave.create({ applicant: req.user.id, type, startDate, endDate, reason });
    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put("/api/leaves/:id", auth, adminOnly, async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ---------- Announcements ----------
app.get("/api/announcements", auth, async (req, res) => {
  try {
    res.json(await Announcement.find({}).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/announcements", auth, adminOnly, async (req, res) => {
  try {
    const { title, content } = req.body;
    const ann = await Announcement.create({ title, content, author: req.user.id });
    res.status(201).json({ success: true, data: ann });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ---------- Placeholders ----------
app.get("/api/attendance", auth, (req, res) => res.json([]));
app.use("/api/trainings", require("./routes/trainings")(auth, adminOnly));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
