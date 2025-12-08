# Chat System API Documentation

## Overview
Real-time chat system between Admins and Doctors using WebSocket (Socket.IO) and REST API.

## Database Schema

### Tables Created:
- **users** - Unified user table for chat participants
- **admin_conversations** - Conversation threads
- **support_messages** - Individual messages

## REST API Endpoints

### 1. Create/Get Conversation
**POST** `/chat/conversations`
```json
{
  "userId": "doctor-id",
  "userRole": "DOCTOR",
  "subject": "Need help with patient records",
  "adminId": "admin-id" // optional
}
```

**Response:**
```json
{
  "id": "conversation-id",
  "userId": "doctor-id",
  "userRole": "DOCTOR",
  "adminId": "admin-id",
  "status": "OPEN",
  "subject": "Need help with patient records",
  "createdAt": "2025-12-08T...",
  "updatedAt": "2025-12-08T...",
  "messages": []
}
```

### 2. Get All Conversations (Admin)
**GET** `/chat/conversations?adminId=admin-id`

Returns all conversations, optionally filtered by adminId.

### 3. Get User Conversations
**GET** `/chat/conversations/user/:userId`

Returns all conversations for a specific doctor/user.

### 4. Get Conversation Details
**GET** `/chat/conversations/:id`

Returns full conversation with all messages.

### 5. Update Conversation
**PUT** `/chat/conversations/:id`
```json
{
  "status": "IN_PROGRESS",
  "adminId": "admin-id"
}
```

### 6. Send Message (REST)
**POST** `/chat/messages`
```json
{
  "senderId": "user-id",
  "conversationId": "conversation-id",
  "message": "Hello, I need help",
  "attachments": ["url1", "url2"] // optional
}
```

### 7. Mark as Read
**PUT** `/chat/conversations/:id/read`
```json
{
  "userId": "user-id"
}
```

### 8. Get Unread Count
**GET** `/chat/unread/:userId`

Returns:
```json
{
  "count": 5
}
```

---

## WebSocket Connection

### Connection URL
```javascript
const socket = io('http://your-backend-url/chat', {
  query: {
    userId: 'user-id',
    userRole: 'DOCTOR' // or 'ADMIN'
  }
});
```

### Events to Listen To

#### 1. `unread_count`
Received immediately after connection
```javascript
socket.on('unread_count', (data) => {
  console.log('Unread messages:', data.count);
});
```

#### 2. `new_message`
Received when a new message arrives
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
  console.log('Conversation:', data.conversation);
  // Update UI with new message
});
```

#### 3. `user_typing`
Received when someone is typing
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data.userId, data.isTyping);
  // Show typing indicator
});
```

#### 4. `messages_read`
Received when messages are marked as read
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read in:', data.conversationId);
  // Update message read status
});
```

---

### Events to Emit

#### 1. `send_message`
Send a new message
```javascript
socket.emit('send_message', {
  conversationId: 'conversation-id',
  message: 'Hello!',
  attachments: [] // optional
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  }
});
```

#### 2. `join_conversation`
Join a conversation room
```javascript
socket.emit('join_conversation', {
  conversationId: 'conversation-id'
}, (response) => {
  if (response.success) {
    console.log('Joined conversation:', response.conversation);
  }
});
```

#### 3. `leave_conversation`
Leave a conversation room
```javascript
socket.emit('leave_conversation', {
  conversationId: 'conversation-id'
});
```

#### 4. `typing`
Indicate typing status
```javascript
socket.emit('typing', {
  conversationId: 'conversation-id',
  isTyping: true
});
```

#### 5. `mark_as_read`
Mark messages as read
```javascript
socket.emit('mark_as_read', {
  conversationId: 'conversation-id'
});
```

---

## Frontend Implementation Example (React)

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatComponent({ userId, userRole }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3000/chat', {
      query: { userId, userRole }
    });

    // Listen for new messages
    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    // Listen for typing
    newSocket.on('user_typing', (data) => {
      setTyping(data.isTyping);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [userId, userRole]);

  const sendMessage = (conversationId, message) => {
    socket.emit('send_message', {
      conversationId,
      message
    });
  };

  const joinConversation = (conversationId) => {
    socket.emit('join_conversation', { conversationId });
  };

  const handleTyping = (conversationId, isTyping) => {
    socket.emit('typing', { conversationId, isTyping });
  };

  return (
    // Your chat UI here
  );
}
```

---

## Conversation Status Values
- `OPEN` - New conversation, not yet assigned
- `IN_PROGRESS` - Admin is working on it
- `RESOLVED` - Issue resolved
- `CLOSED` - Conversation closed

## User Roles
- `ADMIN` - Administrator
- `DOCTOR` - Doctor user

---

## Testing WebSocket with Postman/ThunderClient

1. Create a WebSocket connection to: `ws://localhost:3000/chat?userId=YOUR_USER_ID&userRole=ADMIN`
2. Send events in JSON format:
```json
{
  "event": "send_message",
  "data": {
    "conversationId": "conv-id",
    "message": "Test message"
  }
}
```

---

## Notes for Frontend Team

1. **Authentication**: You'll need to add proper authentication to the WebSocket connection (JWT token in handshake)
2. **Reconnection**: Implement auto-reconnection logic for dropped connections
3. **Message Queue**: Handle messages sent while offline
4. **Notifications**: Use browser notifications for new messages
5. **File Upload**: Implement file upload for attachments before sending
6. **Error Handling**: Handle WebSocket errors and connection issues

---

## Next Steps

1. Add JWT authentication to WebSocket gateway
2. Implement file upload for attachments
3. Add message reactions/emoji support
4. Add voice/video call integration (WebRTC)
5. Add message search functionality
6. Add conversation archiving
