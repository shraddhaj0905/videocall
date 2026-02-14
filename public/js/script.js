const socket = io();

let myName;
let peerConnection;
let localStream;
let remoteUsername;

// Register user
document.getElementById("registerBtn").onclick = async () => {
    myName = document.getElementById("username").value.trim();
    if (!myName) return alert("Enter your name");

    // Get local video/audio
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;

    socket.emit("register", myName);
    document.getElementById("startCallBtn").disabled = false;
    alert("Registered as " + myName);
};

// Start call: notify other users
document.getElementById("startCallBtn").onclick = () => {
    socket.emit("start-call");
};

// Incoming call
socket.on("incoming-call", (data) => {
    remoteUsername = data.from;
    document.getElementById("callerName").innerText = data.from;
    document.getElementById("callNotification").style.display = "block";
});

// Accept call
document.getElementById("acceptBtn").onclick = async () => {
    document.getElementById("callNotification").style.display = "none";
    // Tell caller we accepted
    socket.emit("accept-call", { to: remoteUsername });
    await startCall(true);
};

// Caller receives that someone accepted
socket.on("call-accepted", async (data) => {
    remoteUsername = data.from;
    await startCall(false); // start call as caller
});

// Start WebRTC
async function startCall(isAnswer = false) {
    peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // STUN
    {
      urls: "turn:numb.viagenie.ca",          // public TURN server
      username: "webrtc@live.com",
      credential: "muazkh"
    }
  ]
});


    // Add local tracks
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Remote stream
    peerConnection.ontrack = (event) => {
        document.getElementById("remoteVideo").srcObject = event.streams[0];
    };

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && remoteUsername) {
            socket.emit("ice-candidate", { candidate: event.candidate, to: remoteUsername });
        }
    };

    if (!isAnswer) {
        // Caller creates offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", { offer, to: remoteUsername });
    }
}

// Receive offer
socket.on("offer", async (data) => {
    remoteUsername = data.from;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", { answer, to: data.from });
});

// Receive answer
socket.on("answer", async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// ICE candidates
socket.on("ice-candidate", async (data) => {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});
