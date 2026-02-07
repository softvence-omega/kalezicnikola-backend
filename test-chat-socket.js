const { io } = require("socket.io-client");

console.log("🔗 Testing Chat Socket.IO connection...");

// Test connection to chat namespace
const socket = io("http://localhost:8000/chat", {
    query: { 
        userId: "test-user-123",
        userRole: "DOCTOR"
    },
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("✅ Connected to Chat Socket.IO!");
    console.log(`📡 Socket ID: ${socket.id}`);
    console.log(`🏷️ Namespace: ${socket.nsp.name}`);
    
    // Test joining a conversation
    socket.emit("join_conversation", { conversationId: "test-conversation" }, (response) => {
        console.log("📝 Join conversation response:", response);
    });
    
    // Test sending a message
    socket.emit("send_message", {
        conversationId: "test-conversation",
        message: "Hello from test client!"
    }, (response) => {
        console.log("📨 Send message response:", response);
    });
    
    // Disconnect after 2 seconds
    setTimeout(() => {
        socket.disconnect();
        process.exit(0);
    }, 2000);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected from Chat Socket.IO");
});

socket.on("connect_error", (err) => {
    console.error("❌ Chat connection error:", err.message);
    console.error("🔍 Full error:", err);
    process.exit(1);
});

socket.on("new_message", (data) => {
    console.log("📨 New message received:", data);
});

socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.log("⏱️ Connection timed out");
    process.exit(1);
}, 5000);
