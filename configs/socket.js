const { Server } = require("socket.io");

const initSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  return io;
};

module.exports = { initSocketIO };
