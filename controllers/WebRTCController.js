const socketController = require("./socketController");

const handleCall = (io, socket) => {
    // Event socket for offer call
    socket.on("pre-offer-single", (data) => {
        // IDCaller = SDT người gọi
        // IDCallee = SDT người nhận cuộc gọi
        const { IDCaller, IDCallee, callType } = data;

        const connectedPeer = socketController.getUser(IDCallee);
        const socketIDConnectedPeer = connectedPeer?.socketId;

        if (connectedPeer) {
            const data = {
                IDCaller,
                socketIDCaller: socket.id,
                IDCallee,
                socketIDCallee: socketIDConnectedPeer,
                callType,
            };
            io.to(socketIDConnectedPeer).emit("pre-offer-single", data);
        } else {
            const data = {
                preOfferAnswer: "CALLEE_NOT_FOUND", // Callee không online
            };
            io.to(socket.id).emit("pre-offer-single-answer", data);
        }
    });

    // Event socket for answer call
    //data = {IDCaller: SDT người gọi,  : "CALL_ACCEPTED" hoặc "CALL_REJECTED" hoặc "CALL_UNAVAILABLE"}
    socket.on("pre-offer-single-answer", (data) => {
        // const { IDCaller } = data;
        const { IDCaller, socketIDCaller, IDCallee, socketIDCallee, preOfferAnswer } = data;

        // Kiểm tra lại một lần nữa để tránh ngắt kết nối trong lúc gọi
        const connectedPeer = socketController.getUser(IDCaller);
        const socketIDConnectedPeer = connectedPeer?.socketId;

        if (connectedPeer) {
            io.to(socketIDConnectedPeer).emit("pre-offer-single-answer", data);
        } else {
            const data = {
                preOfferAnswer: "CALLER_NOT_FOUND",// Người gọi mất online
            };
            io.to(socket.id).emit("pre-offer-single-answer", data);
        }
    });

    // Event socket for call
    socket.on("webRTC-signaling", (data) => {
        // data = {connectedUserSocketId: SDT người nhận signaling, signaling: signaling}
        const { connectedUserSocketId } = data;

        const connectedPeer = socketController.getUserBySocketId(connectedUserSocketId);

        if (connectedPeer) {
            io.to(connectedUserSocketId).emit("webRTC-signaling", data);
        }
    });
}

module.exports = {
    handleCall
}