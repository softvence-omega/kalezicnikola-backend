// Test script to verify WebSocket functionality
const { io } = require("socket.io-client");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjRmOGI1ZC0yNzY5LTQzNGUtYmQwZS03MGFlYjVlMTA1ZTYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5NTgyMDYyLCJleHAiOjE3Njk2Njg0NjJ9.adf_0Djx_v0MPPoECYE5aqPxTMReELgoVGnuoZJhv4s";

console.log("🔌 Testing WebSocket connection...");

const socket = io("http://localhost:8000/notifications", {
    query: { token },
    transports: ["websocket"]
});

let connected = false;
let notificationReceived = false;

socket.on("connect", () => {
    console.log("✅ Connected to WebSocket");
    console.log("📡 Socket ID:", socket.id);
    connected = true;
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection failed:", err.message);
});

socket.on("new-notification", (data) => {
    console.log("🔔 NOTIFICATION RECEIVED!");
    console.log("Data:", JSON.stringify(data, null, 2));
    notificationReceived = true;
    console.log("✅ SUCCESS: WebSocket is working!");
    setTimeout(() => process.exit(0), 1000);
});

socket.on("unread-notifications", (data) => {
    console.log("📨 Unread notifications received:", data.notifications?.length || 0);
});

socket.on("unread-count", (data) => {
    console.log("📊 Unread count:", data.count);
});

socket.on("error", (data) => {
    console.error("❌ Socket error:", data);
});

// Wait for connection, then test HTTP endpoint
setTimeout(async () => {
    if (!connected) {
        console.log("❌ Failed to connect to WebSocket");
        process.exit(1);
    }
    
    console.log("🧪 Creating test notification via HTTP...");
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'APPOINTMENT_REMINDER',
                title: 'Real-time Test',
                message: 'This should appear in WebSocket immediately',
                metadata: { test: true, timestamp: new Date().toISOString() }
            })
        });

        if (response.ok) {
            console.log("✅ Notification created via HTTP");
            console.log("⏳ Waiting for WebSocket event...");
        } else {
            console.error("❌ Failed to create notification");
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}, 2000);

// Timeout after 10 seconds
setTimeout(() => {
    if (!notificationReceived) {
        console.log("❌ TIMEOUT: No notification received via WebSocket");
        console.log("🔍 The WebSocket connection is not receiving events.");
        console.log("💡 Check server logs for emission errors.");
    }
    process.exit(1);
}, 10000);
