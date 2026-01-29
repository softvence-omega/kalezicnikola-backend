// Test task creation to trigger deadline notifications
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MTg0MjAzMi04NTI4LTQ4YjYtYmE1Ni1iMDM4MzgzNzQ1OTciLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5Njc1NzY4LCJleHAiOjE3Njk3NjIxNjh9.zpghZGTeptLQXYr_5KAs-1gcihDwo8WUdKOrs9d9bL0";

async function createTestTask() {
    console.log("🧪 Creating test task to trigger deadline notification...");
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/doctor/task/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: "Review lab results",
                description: "Review and sign off on pending lab results",
                status: "TODO",
                priority: "HIGH",
                dueDate: "2026-01-30", 
                time: "17:00",
                patientId: "2ee54327-2539-4cd8-9f18-d6d7bf5db12f",
                insuranceId: "1234567881"
            })
        });

        const result = await response.json();
        console.log("📤 Task creation response:", response.status);
        console.log("📤 Response:", JSON.stringify(result, null, 2));
        
        if (response.ok) {
            console.log("✅ Task created successfully!");
            console.log("🔍 Check server logs and browser for Socket.IO deadline notification");
        } else {
            console.error("❌ Failed to create task:", result);
        }
    } catch (error) {
        console.error("❌ Error creating task:", error.message);
    }
}

createTestTask();
