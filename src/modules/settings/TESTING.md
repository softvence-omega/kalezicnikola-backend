# Settings API Testing Guide

## Quick Test Commands

### 1. Login as Doctor (Get Access Token)
```bash
curl -X POST http://localhost:7000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-doctor-email@example.com",
    "password": "your-password",
    "role": "DOCTOR"
  }'
```

Save the `accessToken` from the response.

### 2. Test Notification Settings
```bash
curl -X GET http://localhost:7000/api/v1/settings/notification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 3. Test Regional Settings
```bash
curl -X GET http://localhost:7000/api/v1/settings/regional \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Test Security Settings
```bash
curl -X GET http://localhost:7000/api/v1/settings/security \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Expected Responses

### Success Response (200)
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
    "createdAt": "2025-12-01T03:46:47.000Z",
    "updatedAt": "2025-12-01T03:46:47.000Z"
  }
}
```

### Unauthorized Response (401)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "UnauthorizedException"
}
```

### Not Found Response (404)
```json
{
  "statusCode": 404,
  "message": "Notification settings not found for this doctor",
  "error": "Not Found"
}
```

## Seeding Verification

Check application logs on startup:
```bash
# Look for these log messages
grep "SeedService" /tmp/nest-startup.log

# Expected output:
# [SeedService] Starting settings seeding process...
# [SeedService] Found X doctor(s). Checking settings...
# [SeedService] === Seeding Summary ===
# [SeedService] Notification Settings - Created: X, Skipped: Y
# [SeedService] Regional Settings - Created: X, Skipped: Y
# [SeedService] Security Settings - Created: X, Skipped: Y
# [SeedService] Settings seeding process completed
```

## Database Verification

Use Prisma Studio to view settings:
```bash
npx prisma studio
```

Navigate to:
- `doctor_notification_settings`
- `doctor_regional_settings`
- `doctor_security_settings`

All doctors should have one record in each table.
