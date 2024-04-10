const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createServer } = require("node:http");

const connectDB = require("./configs/connectDB");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const conversation = require("./routes/conversation");
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
app.use("/conversation", conversation);

io.on("connection", (socket) => {
  console.log("a user connected with id: ", socket.id);

  socketController.handleUserOnline(socket);
  socketController.handleSendFriendRequest(io, socket);
  socketController.handleLoadConversation(io, socket);
  socketController.handleTestSocket(io, socket);
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
