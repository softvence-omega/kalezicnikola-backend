// Enable task deadline notifications
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MTg0MjAzMi04NTI4LTQ4YjYtYmE1Ni1iMDM4MzgzNzQ1OTciLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5Njc1NzY4LCJleHAiOjE3Njk3NjIxNjh9.zpghZGTeptLQXYr_5KAs-1gcihDwo8WUdKOrs9d9bL0";

async function enableTaskDeadlineNotifications() {
    console.log("🔧 Enabling task deadline notifications...");
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/settings/doctor/notification-update', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                taskDeadlines: true
            })
        });

        const result = await response.json();
        console.log("📤 Update response:", response.status);
        console.log("📤 Response:", JSON.stringify(result, null, 2));
        
        if (response.ok) {
            console.log("✅ Task deadline notifications ENABLED!");
            
            // Verify the change
            console.log("\n🔍 Verifying settings...");
            const verifyResponse = await fetch('http://localhost:8000/api/v1/settings/doctor/notification', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const verifyResult = await verifyResponse.json();
            if (verifyResult.data) {
                console.log(`✅ Task Deadlines: ${verifyResult.data.taskDeadlines}`);
            }
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

enableTaskDeadlineNotifications();
