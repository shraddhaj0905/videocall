const socket = io();

let myName;
let peerConnection;
let localStream;
let remoteUsername;

// Register user
document.getElementById("registerBtn").onclick = () => {
    myName = document.getElementById("username").value.trim();
    if (!myName) return alert("Enter your name");
    socket.emit("register", myName);
    document.getElementById("startCallBtn").disabled = false;
    alert("Registered as " + myName);
};

// Start call
document.getElementById("startCallBtn").onclick = () => {
    socket.emit("start-call", { from: myName });
};

// Incoming call
socket.on("incoming-call", (data) => {
    remoteUsername = data.from;
    document.getElementById("callerName").innerText = data.from;
    document.getElementById("callNotification").style.display = "block";
});

// Accept call
document.getElementById("acceptBtn").onclick = () => {
    document.getElementById("callNotification").style.display = "none";
    startCall(true); // answerer
};

// Start WebRTC call
async function startCall(isAnswer = false) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;

    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "turn:numb.viagenie.ca", username: "webrtc@live.com", credential: "muazkh" }
        ]
    });

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && remoteUsername) {
            socket.emit("ice-candidate", { candidate: event.candidate, to: remoteUsername });
        }
    };

    if (!isAnswer) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", { offer, to: remoteUsername });
    }
}

// Receive offer
socket.on("offer", async (data) => {
    remoteUsername = data.from;
    await startCall(true);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", { answer, to: data.from });
});

// Receive answer
socket.on("answer", async (data) => {
    if (peerConnection && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

// ICE candidates
socket.on("ice-candidate", async (data) => {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});
