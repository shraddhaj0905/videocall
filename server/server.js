const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "../public")));

const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // roomId -> [socketIds]

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(socket.id);

        // Notify existing users in the room
        socket.to(roomId).emit("user-joined", { id: socket.id });

        // Send existing users to the new user
        const otherUsers = rooms[roomId].filter(id => id !== socket.id);
        socket.emit("existing-users", { users: otherUsers });

        socket.on("offer", ({ offer, to }) => {
            io.to(to).emit("offer", { offer, from: socket.id });
        });

        socket.on("answer", ({ answer, to }) => {
            io.to(to).emit("answer", { answer, from: socket.id });
        });

        socket.on("ice-candidate", ({ candidate, to }) => {
            io.to(to).emit("ice-candidate", { candidate, from: socket.id });
        });

        socket.on("disconnect", () => {
            rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
            socket.to(roomId).emit("user-left", { id: socket.id });
        });
    });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
