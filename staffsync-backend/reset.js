const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const uri = "mongodb+srv://en24it3010020_db_user:IsBlZ6Bi8XZWqI28@cluster0.rqa2jp6.mongodb.net/staffsync?retryWrites=true&w=majority";

async function run() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    
    const hash = await bcrypt.hash("123456", 10);
    const usersCollection = mongoose.connection.collection("users");

    // Upsert = agar user mile to update, nahi mile to NAYA create kar do!
    const res = await usersCollection.updateOne(
      { email: "sana@staffsync.io" },
      { 
        $set: { 
          password: hash,
          name: "Sana",
          role: "admin",
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log("✅ SUCCESS! User 'sana@staffsync.io' is now set up with password: 123456");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database Error:", err.message);
    process.exit(1);
  }
}

run();