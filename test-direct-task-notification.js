// Direct test of task deadline notification
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MTg0MjAzMi04NTI4LTQ4YjYtYmE1Ni1iMDM4MzgzNzQ1OTciLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5Njc1NzY4LCJleHAiOjE3Njk3NjIxNjh9.zpghZGTeptLQXYr_5KAs-1gcihDwo8WUdKOrs9d9bL0";

async function testTaskDeadlineNotification() {
    console.log("🧪 Testing task deadline notification directly...");
    
    try {
        // Create a notification directly via the notification endpoint
        const response = await fetch('http://localhost:8000/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: 'TASK_DEADLINE',
                title: 'Task Deadline Approaching',
                message: 'Task "Review lab results" is due on 1/30/2026, 12:00:00 AM',
                metadata: {
                    taskId: 'bb2223a1-c39d-403e-843c-4d02b73bd63a',
                    taskTitle: 'Review lab results',
                    deadline: '2026-01-30T00:00:00.000Z',
                    priority: 'HIGH'
                }
            })
        });

        const result = await response.json();
        console.log("📤 Direct notification response:", response.status);
        console.log("📤 Response:", JSON.stringify(result, null, 2));
        
        if (response.ok) {
            console.log("✅ Task deadline notification created successfully!");
        } else {
            console.error("❌ Failed to create notification:", result);
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

testTaskDeadlineNotification();
