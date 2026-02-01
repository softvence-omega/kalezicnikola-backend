const { io } = require("socket.io-client");

// Use a real token from your database
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjRmOGI1ZC0yNzY5LTQzNGUtYmQwZS03MGFlYjVlMTA1ZTYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5NTgyMDYyLCJleHAiOjE3Njk2Njg0NjJ9.adf_0Djx_v0MPPoECYE5aqPxTMReELgoVGnuoZJhv4s";

console.log("🔌 Connecting to WebSocket...");

const socket = io("http://localhost:8000/notifications", {
    query: { token },
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("✅ Successfully connected to /notifications namespace");
    console.log("📡 Socket ID:", socket.id);
    console.log("⏳ Waiting for notifications...");
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
    process.exit(1);
});

socket.on("new-notification", (data) => {
    console.log("🔔 Received new-notification:", JSON.stringify(data, null, 2));
    console.log("✅ Test successful! WebSocket is working.");
});

socket.on("unread-count", (data) => {
    console.log("📊 Unread count updated:", data);
});

socket.on("unread-notifications", (data) => {
    console.log("📨 Unread notifications:", data.notifications?.length || 0);
});

socket.on("error", (data) => {
    console.error("❌ Socket error:", data);
});

socket.on("disconnect", () => {
    console.log("🔌 Disconnected from WebSocket");
});

// Test creating a notification via HTTP API after 2 seconds
setTimeout(async () => {
    console.log("🧪 Testing notification creation...");
    try {
        const response = await fetch('http://localhost:8000/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'APPOINTMENT_REMINDER',
                title: 'WebSocket Test Notification',
                message: 'This notification should appear in real-time via WebSocket',
                metadata: {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            })
        });

        const result = await response.json();
        console.log("📤 HTTP Response:", response.status, result.message);
        
        if (!response.ok) {
            console.error("❌ Failed to create notification:", result);
        }
    } catch (error) {
        console.error("❌ Error creating notification:", error.message);
    }
}, 2000);

// Keep the connection open for 10 seconds
setTimeout(() => {
    console.log("⏱️ Test completed. Closing connection.");
    socket.disconnect();
    process.exit(0);
}, 10000);
