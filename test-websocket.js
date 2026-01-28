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
    
    // Test creating a notification via HTTP API
    console.log("🧪 Testing notification creation...");
    testNotificationCreation();
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
    process.exit(1);
});

socket.on("new-notification", (data) => {
    console.log("🔔 Received new-notification:", JSON.stringify(data, null, 2));
    console.log("✅ Test successful! WebSocket is working.");
    process.exit(0);
});

socket.on("unread-count", (data) => {
    console.log("📊 Unread count updated:", data);
});

socket.on("error", (data) => {
    console.error("❌ Socket error:", data);
});

async function testNotificationCreation() {
    try {
        const response = await fetch('http://localhost:8000/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'APPOINTMENT_REMINDER',
                title: 'Test Notification',
                message: 'This is a test notification from WebSocket test script',
                metadata: {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            })
        });

        const result = await response.json();
        console.log("📤 HTTP Response:", JSON.stringify(result, null, 2));
        
        if (!response.ok) {
            console.error("❌ Failed to create notification:", result);
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error creating notification:", error.message);
        process.exit(1);
    }
}

setTimeout(() => {
    console.log("⏱️ Test timed out after 30 seconds");
    process.exit(1);
}, 30000);
