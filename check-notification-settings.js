// Check doctor notification settings
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MTg0MjAzMi04NTI4LTQ4YjYtYmE1Ni1iMDM4MzgzNzQ1OTciLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5Njc1NzY4LCJleHAiOjE3Njk3NjIxNjh9.zpghZGTeptLQXYr_5KAs-1gcihDwo8WUdKOrs9d9bL0";

async function checkNotificationSettings() {
    console.log("🔍 Checking doctor notification settings...");
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/settings/doctor/notification', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        console.log("📤 Settings response:", response.status);
        console.log("📤 Settings:", JSON.stringify(result, null, 2));
        
        if (response.ok && result.data) {
            console.log("\n📊 Notification Settings:");
            console.log(`  📅 Appointment Reminders: ${result.data.appointmentReminders}`);
            console.log(`  👥 Patient Updates: ${result.data.patientUpdates}`);
            console.log(`  📞 Call Logs: ${result.data.callLogs}`);
            console.log(`  ✅ Task Deadlines: ${result.data.taskDeadlines}`);
            
            if (!result.data.taskDeadlines) {
                console.log("\n⚠️ Task deadline notifications are DISABLED!");
                console.log("💡 Enable them to receive task deadline notifications.");
            }
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

checkNotificationSettings();
