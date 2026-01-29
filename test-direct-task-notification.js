// Direct test of task deadline notification
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjRmOGI1ZC0yNzY5LTQzNGUtYmQwZS03MGFlYjVlMTA1ZTYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5NjY3NDY2LCJleHAiOjE3Njk3NTM4NjZ9.huwGOvwlmiq8Pww_5Z19D8ksQjToVI7F-BPVSNU0cDg";

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
