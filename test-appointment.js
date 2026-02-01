// Simple test to trigger appointment creation and see server logs
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjRmOGI1ZC0yNzY5LTQzNGUtYmQwZS03MGFlYjVlMTA1ZTYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5NTgyMDYyLCJleHAiOjE3Njk2Njg0NjJ9.adf_0Djx_v0MPPoECYE5aqPxTMReELgoVGnuoZJhv4s";

async function createTestAppointment() {
    console.log("🧪 Creating test appointment to trigger notification...");
    
    try {
        const response = await fetch('http://localhost:8000/api/v1/appointment/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                patientId: "2ee54327-2539-4cd8-9f18-d6d7bf5db12f",
                insuranceId: "1234567881",
                firstName: "Test",
                lastName: "Patient",
                email: "test.patient@example.com",
                phone: "+1234567890",
                dob: "1990-05-15",
                gender: "MALE",
                bloodGroup: "O_POS",
                appointmentDate: "2026-03-13",
                startTime: "11:00",
                appointmentTypeId: "8cac8b23-380c-4cff-a28e-930cccddff5c",
                appointmentDetails: "Test appointment for WebSocket debugging",
                address: "123 Test St"
            })
        });

        const result = await response.json();
        console.log("📤 Appointment creation response:", response.status);
        console.log("📤 Response:", JSON.stringify(result, null, 2));
        
        if (response.ok) {
            console.log("✅ Appointment created successfully!");
            console.log("🔍 Check server logs for Socket.IO emission details");
        } else {
            console.error("❌ Failed to create appointment:", result);
        }
    } catch (error) {
        console.error("❌ Error creating appointment:", error.message);
    }
}

createTestAppointment();
