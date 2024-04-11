const { Server } = require("socket.io");

const initSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    maxHttpBufferSize: 1e9
  });
  return io;
};

module.exports = { initSocketIO };
