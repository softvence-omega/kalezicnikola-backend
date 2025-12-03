# Settings API - Complete Testing Guide

## Overview
This guide covers testing all settings endpoints (GET and PATCH) for notification, regional, and security settings.

## Prerequisites

1. **Get Access Token**: Login as a doctor first
```bash
curl -X POST http://localhost:7000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "your-password",
    "role": "DOCTOR"
  }'
```

Save the `accessToken` from the response and use it in all subsequent requests.

---

## 1. Notification Settings

### GET Notification Settings
```bash
curl -X GET http://localhost:7000/api/v1/settings/doctor/notification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "message": "Notification settings retrieved successfully",
  "data": {
    "id": "uuid",
    "doctorId": "uuid",
    "appointmentReminders": true,
    "patientUpdates": false,
    "callLogs": true,
    "taskDeadlines": false,
    "securityAlerts": true,
    "emailNotifications": true,
    "createdAt": "2025-12-01T...",
    "updatedAt": "2025-12-01T..."
  }
}
```

### UPDATE Notification Settings
```bash
curl -X PATCH http://localhost:7000/api/v1/settings/doctor/notification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentReminders": false,
    "patientUpdates": true,
    "emailNotifications": false
  }'
```

**Notes:**
- All fields are optional
- Only send the fields you want to update
- Boolean values: `true` or `false`

**Available Fields:**
- `appointmentReminders` (boolean)
- `patientUpdates` (boolean)
- `callLogs` (boolean)
- `taskDeadlines` (boolean)
- `securityAlerts` (boolean)
- `emailNotifications` (boolean)

---

## 2. Regional Settings

### GET Regional Settings
```bash
curl -X GET http://localhost:7000/api/v1/settings/doctor/regional \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "message": "Regional settings retrieved successfully",
  "data": {
    "id": "uuid",
    "doctorId": "uuid",
    "timezone": "Asia_Dhaka",
    "dateFormat": "DD_MM_YYYY",
    "timeFormat": "HOUR_24",
    "language": "English",
    "defaultCalendarView": "DayView",
    "defaultAppointmentDuration": "Minutes_20",
    "allowOnlineBooking": true,
    "requireApprovalForBooking": false,
    "sendAppointmentReminders": false,
    "reminderTime": "Minutes_30_Before",
    "bufferTimeBetween": "Minutes_10",
    "createdAt": "2025-12-01T...",
    "updatedAt": "2025-12-01T..."
  }
}
```

### UPDATE Regional Settings
```bash
curl -X PATCH http://localhost:7000/api/v1/settings/doctor/regional \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "America_New_York",
    "dateFormat": "MM_DD_YYYY",
    "language": "English",
    "allowOnlineBooking": false
  }'
```

**Available Fields & Enum Values:**

**Timezone:**
- `UTC`, `Africa_Cairo`, `Africa_Johannesburg`
- `America_New_York`, `America_Chicago`, `America_Denver`, `America_Los_Angeles`
- `America_Toronto`, `America_Sao_Paulo`
- `Asia_Dhaka`, `Asia_Dubai`, `Asia_Riyadh`, `Asia_Singapore`, `Asia_Kuala_Lumpur`, `Asia_Tokyo`
- `Europe_London`, `Europe_Berlin`, `Europe_Paris`, `Europe_Madrid`, `Europe_Rome`
- `Australia_Sydney`

**DateFormat:**
- `DD_MM_YYYY` (31-12-2025)
- `MM_DD_YYYY` (12-31-2025)
- `YYYY_MM_DD` (2025-12-31)
- `DD_MMM_YYYY` (31 Dec 2025)
- `MMM_DD_YYYY` (Dec 31 2025)

**TimeFormat:**
- `HOUR_12` (03:30 PM)
- `HOUR_24` (15:30)

**Language:**
- `English`, `Arabic`, `Bengali`, `French`, `German`, `Spanish`, `Italian`, `Hindi`, `Chinese`

**CalendarView:**
- `DayView`, `WeekView`, `MonthView`, `AgendaView`

**AppointmentDuration:**
- `Minutes_10`, `Minutes_15`, `Minutes_20`, `Minutes_30`, `Minutes_45`, `Minutes_60`

**ReminderTime:**
- `Minutes_10_Before`, `Minutes_30_Before`, `Hour_1_Before`, `Hours_2_Before`, `Hours_6_Before`, `Hours_12_Before`, `Hours_24_Before`

**BufferTime:**
- `Minutes_5`, `Minutes_10`, `Minutes_15`, `Minutes_20`, `Minutes_30`

**Boolean Fields:**
- `allowOnlineBooking`
- `requireApprovalForBooking`
- `sendAppointmentReminders`

---

## 3. Security Settings

### GET Security Settings
```bash
curl -X GET http://localhost:7000/api/v1/settings/doctor/security \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "message": "Security settings retrieved successfully",
  "data": {
    "id": "uuid",
    "doctorId": "uuid",
    "enforceTwoFA": true,
    "sessionTimeoutMinutes": 30,
    "maxLoginAttempts": 5,
    "encryptSensitiveData": true,
    "enableAuditLogs": true,
    "createdAt": "2025-12-01T...",
    "updatedAt": "2025-12-01T..."
  }
}
```

### UPDATE Security Settings
```bash
curl -X PATCH http://localhost:7000/api/v1/settings/doctor/security \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enforceTwoFA": false,
    "sessionTimeoutMinutes": 60,
    "maxLoginAttempts": 3
  }'
```

**Available Fields & Validation:**

- `enforceTwoFA` (boolean)
- `sessionTimeoutMinutes` (number, min: 5, max: 1440)
- `maxLoginAttempts` (number, min: 1, max: 10)
- `encryptSensitiveData` (boolean)
- `enableAuditLogs` (boolean)

---

## Error Responses

### 401 Unauthorized (Missing/Invalid Token)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "UnauthorizedException"
}
```

### 404 Not Found (Settings Don't Exist)
```json
{
  "statusCode": 404,
  "message": "Notification settings not found for this doctor",
  "error": "Not Found"
}
```

### 400 Bad Request (Validation Error)
```json
{
  "statusCode": 400,
  "message": ["sessionTimeoutMinutes must not be greater than 1440"],
  "error": "Bad Request"
}
```

---

## Quick Test Script

Save this as `test-settings.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:7000/api/v1"
TOKEN="YOUR_ACCESS_TOKEN_HERE"

echo "=== Testing Settings API ==="
echo ""

# Test GET endpoints
echo "1. GET Notification Settings"
curl -s -X GET "$BASE_URL/settings/doctor/notification" \
  -H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "2. GET Regional Settings"
curl -s -X GET "$BASE_URL/settings/doctor/regional" \
  -H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "3. GET Security Settings"
curl -s -X GET "$BASE_URL/settings/doctor/security" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test PATCH endpoints
echo ""
echo "4. UPDATE Notification Settings"
curl -s -X PATCH "$BASE_URL/settings/doctor/notification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appointmentReminders": false}' | jq

echo ""
echo "5. UPDATE Regional Settings"
curl -s -X PATCH "$BASE_URL/settings/doctor/regional" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "America_New_York"}' | jq

echo ""
echo "6. UPDATE Security Settings"
curl -s -X PATCH "$BASE_URL/settings/doctor/security" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionTimeoutMinutes": 60}' | jq

echo ""
echo "=== Testing Complete ==="
```

Run with: `chmod +x test-settings.sh && ./test-settings.sh`

---

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Settings API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:7000/api/v1"
    },
    {
      "key": "token",
      "value": "YOUR_ACCESS_TOKEN"
    }
  ],
  "item": [
    {
      "name": "Notification Settings",
      "item": [
        {
          "name": "Get Notification Settings",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": "{{baseUrl}}/settings/doctor/notification"
          }
        },
        {
          "name": "Update Notification Settings",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"appointmentReminders\": false,\n  \"emailNotifications\": true\n}"
            },
            "url": "{{baseUrl}}/settings/doctor/notification"
          }
        }
      ]
    }
  ]
}
```
