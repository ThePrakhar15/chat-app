const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 MongoDB connect
mongoose.connect("mongodb://127.0.0.1:27017/chatapp")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

app.use("/auth", authRoutes);

const server = http.createServer(app);

// 🔌 Socket setup
const io = new Server(server, {
  cors: { origin: "*" },
});

// 🧠 Store users: username → { socketId, publicKey }
const users = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // 🔐 Register user with public key
  socket.on("register_user", ({ username, publicKey }) => {
    users[username] = {
      socketId: socket.id,
      publicKey,
    };
    console.log("✅ Registered:", username);
    console.log("📋 Online users:", Object.keys(users));
  });

  // 🔑 Return receiver's public key BACK to the requester
  socket.on("get_public_key", ({ to, from }) => {
    console.log(`🔑 ${from} wants public key of ${to}`);
    console.log("📋 Current users:", Object.keys(users));

    const targetUser = users[to];

    if (targetUser) {
      // ✅ Emit back to the REQUESTER (socket = the person asking)
      socket.emit("receive_public_key", {
        publicKey: targetUser.publicKey,
      });
      console.log(`✅ Sent ${to}'s public key to ${from}`);
    } else {
      // ✅ Still emit back so frontend doesn't hang
      socket.emit("receive_public_key", { publicKey: null });
      console.log(`❌ User ${to} not found or not online`);
    }
  });

  // 💬 Forward encrypted message to receiver
  socket.on("send_message", ({ user, to, encryptedMessage, encryptedKey }) => {
    console.log(`📨 Message from ${user} → ${to}`);

    const receiver = users[to];

    if (receiver) {
      // ✅ Send to receiver's socket specifically
      io.to(receiver.socketId).emit("receive_message", {
        user,
        encryptedMessage,
        encryptedKey,
      });
      console.log(`✅ Delivered to ${to} (${receiver.socketId})`);
    } else {
      console.log(`❌ ${to} is not connected`);
    }
  });

  // ❌ Cleanup on disconnect
  socket.on("disconnect", () => {
    for (let uname in users) {
      if (users[uname].socketId === socket.id) {
        delete users[uname];
        console.log("🔴 Removed:", uname);
        break;
      }
    }
    console.log("🔴 Disconnected:", socket.id);
  });
});

// 🚀 Start server
server.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
});