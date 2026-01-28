const { io } = require("socket.io-client");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjRmOGI1ZC0yNzY5LTQzNGUtYmQwZS03MGFlYjVlMTA1ZTYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5NTkyMzUyLCJleHAiOjE3Njk2Nzg3NTJ9.0OIsGb35ZyCiBUDfuzcFlQbpUUbQo9cNQrmQZEwfFmw";

console.log("🔗 Connecting to Socket.IO server...");

const socket = io("http://localhost:8000/notifications", {
    query: { token },
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("✅ Connected to Socket.IO!");
    console.log(`📡 Socket ID: ${socket.id}`);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected from Socket.IO");
});

socket.on("new-notification", (data) => {
    console.log("\n🔔 NEW NOTIFICATION RECEIVED:");
    console.log("📋 Title:", data.title);
    console.log("📝 Message:", data.message);
    console.log("🏷️ Type:", data.type);
    console.log("📊 Data:", JSON.stringify(data, null, 2));
    console.log("─".repeat(50));
});

socket.on("unread-count", (data) => {
    console.log(`📊 Unread count updated: ${data.count}`);
});

socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
});

// Keep the process running
process.on('SIGINT', () => {
    console.log("\n👋 Disconnecting...");
    socket.disconnect();
    process.exit(0);
});

console.log("⏳ Waiting for notifications... (Create an appointment to test)");
