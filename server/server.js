const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "../public")));

const server = http.createServer(app);
const io = new Server(server);

let users = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("register", (username) => {
        users[username] = socket.id;
        socket.username = username;
        console.log(username, "registered");
    });

    socket.on("start-call", ({ from }) => {
        socket.broadcast.emit("incoming-call", { from });
    });

    socket.on("offer", ({ offer, to }) => {
        io.to(users[to]).emit("offer", { offer, from: socket.username });
    });

    socket.on("answer", ({ answer, to }) => {
        io.to(users[to]).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ candidate, to }) => {
        io.to(users[to]).emit("ice-candidate", { candidate });
    });

    socket.on("disconnect", () => {
        delete users[socket.username];
        console.log("User disconnected:", socket.username);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
