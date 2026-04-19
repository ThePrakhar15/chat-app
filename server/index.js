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

mongoose.connect("mongodb://127.0.0.1:27017/chatapp")
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.log(err));

app.use("/auth", authRoutes);

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


const users = {};

io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);

  
  socket.on("register_user", ({ username, publicKey }) => {
    users[username] = {
      socketId: socket.id,
      publicKey,
    };
    console.log(" Registered:", username);
    console.log(" Online users:", Object.keys(users));
  });

 
  socket.on("get_public_key", ({ to, from }) => {
    console.log(` ${from} wants public key of ${to}`);
    console.log(" Current users:", Object.keys(users));

    const targetUser = users[to];

    if (targetUser) {
      
      socket.emit("receive_public_key", {
        publicKey: targetUser.publicKey,
      });
      console.log(` Sent ${to}'s public key to ${from}`);
    } else {
      
      socket.emit("receive_public_key", { publicKey: null });
      console.log(` User ${to} not found or not online`);
    }
  });

 
  socket.on("send_message", ({ user, to, encryptedMessage, encryptedKey }) => {
    console.log(` Message from ${user} → ${to}`);

    const receiver = users[to];

    if (receiver) {
      
      io.to(receiver.socketId).emit("receive_message", {
        user,
        encryptedMessage,
        encryptedKey,
      });
      console.log(` Delivered to ${to} (${receiver.socketId})`);
    } else {
      console.log(` ${to} is not connected`);
    }
  });

 
  socket.on("disconnect", () => {
    for (let uname in users) {
      if (users[uname].socketId === socket.id) {
        delete users[uname];
        console.log(" Removed:", uname);
        break;
      }
    }
    console.log(" Disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log(" Server running on port 3001");
});