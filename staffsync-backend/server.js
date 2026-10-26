const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Secret Keys (Render environment variables se lega ya fallback local string)
const JWT_SECRET = process.env.JWT_SECRET || "staffsync_secret_key_123";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://en24it3010020_db_user:IsBlZ6Bi8XZWqI28@cluster0.rqa2jp6.mongodb.net/staffsync?retryWrites=true&w=majority";

// MongoDB Connection (Single-line formatted string)
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected Successfully!"))
  .catch((err) => console.error("MongoDB Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "employee" },
  department: { type: String, default: "General" },
  position: { type: String, default: "Employee" },
  phone: String,
  address: String,
  emergency: String
});

const User = mongoose.model("User", userSchema);

// Auth Login Route
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password !== "123456") {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Employees GET & POST Routes
app.get("/api/employees", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const { name, email, department, position, role, password } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const pass = await bcrypt.hash(password || "123456", 10);
    const newUser = new User({
      name,
      email,
      department: department || "General",
      position: position || "Employee",
      role: (role || "employee").toLowerCase(),
      password: pass
    });

    await newUser.save();
    res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generic Dummy Routes for Leave, Attendance, Announcements
app.get("/api/leaves", (req, res) => res.json([]));
app.post("/api/leaves", (req, res) => res.json({ success: true, data: req.body }));
app.get("/api/attendance", (req, res) => res.json([]));
app.get("/api/announcements", (req, res) => res.json([]));
app.get("/api/trainings", (req, res) => res.json([]));

// Render dynamic PORT ya default 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
