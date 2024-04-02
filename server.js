const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const { createServer } = require("node:http");

const connectDB = require("./configs/connectDB");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

const port = 8080;

const app = express();
const server = createServer(app);
// Socket IO
const io = require("./configs/socket").initSocketIO(server);
const socketController = require("./controllers/socketController");

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
connectDB();

app.use("/auth", authRoutes);
app.use("/user", userRoutes);

let onlineUsers = [];

const addNewUser = (phone, socketId) => {
  !onlineUsers.some((user) => user.phone === phone) &&
    onlineUsers.push({ phone, socketId });
};

const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter((item) => item.socketId !== socketId);
};

const getUser = (phone) => {
  return onlineUsers.find((user) => user.phone === phone);
};

io.on("connection", (socket) => {
  console.log("a user connected with id: ", socket.id);

  socket.on("new user connect", (phone) => {
    addNewUser(phone, socket.id);
    io.emit("get online users", onlineUsers);
  });

  socket.on("disconnect", () => {
    console.log("disconnect");
    removeUser(socket.id);
  });

  socketController.handleSendFriendRequest(socket);
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
