const { io } = require("socket.io-client");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZGlkOWI1NS1lNWZiLTRjYjgtYWJiMy0zM2Y4NzA3ZTIxN2IiLCJyb2xlIjoiRE9DVE9SIn0.v0MPPoEC"; // Dummy token from user screenshot
const socket = io("http://localhost:8000/notifications", {
    query: { token },
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("✅ Successfully connected to /notifications namespace");
    process.exit(0);
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log("⏱️ Connection timed out");
    process.exit(1);
}, 5000);
