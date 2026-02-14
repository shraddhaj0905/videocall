const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

// Serve public folder
app.use(express.static(path.join(__dirname, "../public")));

const server = http.createServer(app);
const io = new Server(server);

let users = {}; // store connected users

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // register username
    socket.on("register", (username) => {
        users[username] = socket.id;
        socket.username = username;
        console.log(username, "registered");
    });

    // start call (broadcast to all except self)
    socket.on("start-call", () => {
        console.log(socket.username, "started call");
        socket.broadcast.emit("incoming-call", { from: socket.username });
    });

    // WebRTC offer
    socket.on("offer", ({ offer, to }) => {
        io.to(users[to]).emit("offer", { offer, from: socket.username });
    });

    // WebRTC answer
    socket.on("answer", ({ answer, to }) => {
        io.to(users[to]).emit("answer", { answer });
    });

    // ICE candidates
    socket.on("ice-candidate", ({ candidate, to }) => {
        io.to(users[to]).emit("ice-candidate", { candidate });
    });

    socket.on("disconnect", () => {
        delete users[socket.username];
        console.log("User disconnected:", socket.username);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
