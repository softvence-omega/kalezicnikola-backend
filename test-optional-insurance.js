// Test script to verify optional insuranceId functionality
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on different port

// Test data
const testAppointmentWithInsurance = {
  appointmentTypeId: "test-appointment-type-id", // You'll need to use a valid ID
  appointmentDate: "2026-02-08",
  startTime: "10:00",
  insuranceId: "INS123456",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  email: "john.doe@example.com",
  dob: "1990-01-01",
  gender: "MALE",
  bloodGroup: "O_POSITIVE"
};

const testAppointmentWithoutInsurance = {
  appointmentTypeId: "test-appointment-type-id", // You'll need to use a valid ID
  appointmentDate: "2026-02-08",
  startTime: "11:00",
  firstName: "Jane",
  lastName: "Smith",
  phone: "+1234567891",
  email: "jane.smith@example.com",
  dob: "1992-05-15",
  gender: "FEMALE",
  bloodGroup: "A_POSITIVE"
};

async function testAppointmentCreation() {
  console.log('Testing appointment creation with optional insuranceId...\n');

  try {
    // Test 1: Create appointment WITH insuranceId
    console.log('Test 1: Creating appointment WITH insuranceId');
    const response1 = await axios.post(`${BASE_URL}/appointment/create`, testAppointmentWithInsurance, {
      headers: {
        'Authorization': 'Bearer YOUR_VALID_TOKEN_HERE', // Replace with valid token
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success: Appointment created with insuranceId');
    console.log('Response:', response1.data);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('⚠️  Expected error (invalid token/test data):', error.response.data.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // Test 2: Create appointment WITHOUT insuranceId
    console.log('Test 2: Creating appointment WITHOUT insuranceId');
    const response2 = await axios.post(`${BASE_URL}/appointment/create`, testAppointmentWithoutInsurance, {
      headers: {
        'Authorization': 'Bearer YOUR_VALID_TOKEN_HERE', // Replace with valid token
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success: Appointment created without insuranceId');
    console.log('Response:', response2.data);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('⚠️  Expected error (invalid token/test data):', error.response.data.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // Test 3: Create appointment WITHOUT insuranceId and missing patient details (should fail)
    console.log('Test 3: Creating appointment WITHOUT insuranceId and missing patient details (should fail)');
    const invalidData = { ...testAppointmentWithoutInsurance };
    delete invalidData.firstName;
    delete invalidData.lastName;
    
    const response3 = await axios.post(`${BASE_URL}/appointment/create`, invalidData, {
      headers: {
        'Authorization': 'Bearer YOUR_VALID_TOKEN_HERE', // Replace with valid token
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ Unexpected success: Should have failed with missing patient details');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Expected error: Patient details required when insurance ID is not provided');
      console.log('Error message:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\nTest completed!');
}

// Run the test
testAppointmentCreation();
