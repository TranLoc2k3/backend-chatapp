const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createServer } = require("node:http");

const connectDB = require("./configs/connectDB");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const conversation = require("./routes/conversation");
const friendRequest = require("./routes/friendRequest");
const message = require("./routes/message");
const map = require("./routes/map");
const port = 8080;

const app = express();
const server = createServer(app);
// Socket IO
const io = require("./configs/socket").initSocketIO(server);
const socketController = require("./controllers/socketController");
const WebRTCController = require("./controllers/WebRTCController");

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
connectDB();

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/conversation", conversation);
app.use("/friend-request", friendRequest);
app.use("/message", message);
app.use("/map", map);

io.on("connection", (socket) => {
  console.log("a user connected with id: ", socket.id);

  socketController.handleUserOnline(socket);
  socketController.handleSendFriendRequest(io, socket);

  socketController.handleLoadConversation(io, socket);
  socketController.handleCreatGroupConversation(io, socket);
  socketController.handleAddMemberToGroup(io, socket);
  socketController.handleRemoveMemberFromGroup(io, socket);
  socketController.handleDeleteGroup(io, socket);
  socketController.handleChangeOwnerGroup(io, socket);

  socketController.handleSendMessage(io, socket);
  socketController.handleChangeStateMessage(io, socket);
  socketController.hadlePassMessage(io, socket);
  socketController.handleReplyMessage(io, socket);
  socketController.handleTestSocket(io, socket);

  socketController.handleLoadMemberOfGroup(io, socket);
  socketController.getConversationByUserFriend(io, socket);
  socketController.handleBlockFriend(io, socket);
  socketController.handleUnBlockFriend(io, socket);

  WebRTCController.handleCall(io, socket);

});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);

});
