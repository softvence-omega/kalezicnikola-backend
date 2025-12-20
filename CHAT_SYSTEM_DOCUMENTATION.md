# Chat System - Complete Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [WebSocket Connection](#websocket-connection)
4. [REST API Endpoints](#rest-api-endpoints)
5. [WebSocket Events](#websocket-events)
6. [Data Structures](#data-structures)
7. [Frontend Implementation Steps](#frontend-implementation-steps)
8. [Code Examples](#code-examples)
9. [Error Handling](#error-handling)
10. [Testing Guide](#testing-guide)

---

## 🎯 Overview

This is a real-time bidirectional chat system between Admins and Doctors using:
- **Backend**: NestJS + Socket.IO + Prisma + PostgreSQL
- **Frontend**: Any framework (React, Vue, Angular, or Vanilla JS)
- **Real-time**: WebSocket for instant messaging
- **Features**: File upload, typing indicators, online/offline status, message read receipts

**Base URL**: `http://localhost:7000/api/v1` (Production: Replace with your domain)

---

## 🔐 Authentication

### Step 1: Login to Get User Credentials

#### Admin Login
```javascript
POST /auth/admin/login
Headers: {
  "Content-Type": "application/json"
}
Body: {
  "email": "admin@example.com",
  "password": "password123"
}

Response: {
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "firstName": "John",
      "lastName": "Doe",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

#### Doctor Login
```javascript
POST /auth/doctor/login
Headers: {
  "Content-Type": "application/json"
}
Body: {
  "email": "doctor@example.com",
  "password": "password123"
}

Response: {
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "email": "doctor@example.com",
      "role": "DOCTOR"
    }
  }
}
```

### Step 2: Store User Information

After successful login, store these details:

```javascript
const currentUser = {
  chatUserId: response.data.user.id,  // UUID for chat system
  name: `${response.data.user.firstName} ${response.data.user.lastName}`,
  email: response.data.user.email,
  role: response.data.user.role,  // 'ADMIN' or 'DOCTOR'
  token: response.data.accessToken,
  refreshToken: response.data.refreshToken
};

// Store in localStorage or state management
localStorage.setItem('currentUser', JSON.stringify(currentUser));
```

---

## 🔌 WebSocket Connection

### Initialize Socket.IO Connection

```javascript
import io from 'socket.io-client';

const baseUrl = 'http://localhost:7000'; // Your backend URL without /api/v1

const socket = io(`${baseUrl}/chat`, {
  query: {
    userId: currentUser.chatUserId,
    userRole: currentUser.role
  },
  auth: {
    token: currentUser.token
  }
});

// Connection event handlers
socket.on('connect', () => {
  console.log('✅ Connected to chat server');
  // Update UI to show online status
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from chat server');
  // Update UI to show offline status
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  // Show error message to user
});
```

---

## 📡 REST API Endpoints

### 1. Get All Conversations (Admin Only)

```javascript
GET /chat/conversations

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: {
  "data": [
    {
      "id": "conversation-uuid",
      "userId": "user-uuid",
      "adminId": "admin-uuid",
      "subject": "Support Request",
      "status": "OPEN",
      "createdAt": "2025-12-08T10:00:00.000Z",
      "updatedAt": "2025-12-08T10:30:00.000Z",
      "user": {
        "admin": {
          "id": "admin-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "admin@example.com",
          "photo": "/uploads/photo.jpg"
        },
        "doctor": {
          "id": "doctor-uuid",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "doctor@example.com",
          "photo": "/uploads/doctor.jpg"
        }
      },
      "messages": [
        {
          "id": "message-uuid",
          "conversationId": "conversation-uuid",
          "senderId": "user-uuid",
          "message": "Hello, I need help",
          "imageUrl": null,
          "isRead": false,
          "createdAt": "2025-12-08T10:30:00.000Z"
        }
      ]
    }
  ]
}
```

### 2. Get User's Conversations (Doctor)

```javascript
GET /chat/conversations/user/:userId

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: Same structure as above
```

### 3. Get Conversation by ID

```javascript
GET /chat/conversations/:conversationId

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: {
  "data": {
    "conversation": { /* conversation object */ },
    "messages": [ /* array of messages */ ]
  }
}
```

### 4. Create New Conversation

```javascript
POST /chat/conversations

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}

Body: {
  "userId": "user-chat-uuid",
  "userRole": "ADMIN" | "DOCTOR",
  "subject": "Support Request" // optional
}

Response: {
  "data": {
    "id": "new-conversation-uuid",
    "userId": "user-uuid",
    "subject": "Support Request",
    "status": "OPEN",
    "createdAt": "2025-12-08T10:00:00.000Z"
  }
}
```

### 5. Upload File

```javascript
POST /chat/upload

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "multipart/form-data"
}

Body (FormData): {
  file: File,  // Any file type, max 5MB
  conversationId: "conversation-uuid"
}

Response: {
  "data": {
    "fileUrl": "/uploads/1733670123456-789012345.pdf"
  }
}
```

### 6. Get All Doctors (Admin Only)

```javascript
GET /doctor/list

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: {
  "data": [
    {
      "id": "doctor-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "doctor@example.com",
      "photo": "/uploads/doctor.jpg",
      "specialization": "Cardiology"
    }
  ]
}
```

### 7. Search Doctors (Admin Only)

```javascript
GET /doctor/search?query=jane

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: {
  "data": [ /* filtered doctors array */ ]
}
```

### 8. Get Unread Message Count

```javascript
GET /chat/unread/:userId

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: {
  "count": 5
}
```

### 9. Mark Messages as Read

```javascript
PATCH /chat/conversations/:conversationId/read

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

Response: {
  "success": true,
  "updated": 3
}
```

### 10. Update Conversation Status

```javascript
PUT /chat/conversations/:conversationId

Headers: {
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}

Body: {
  "status": "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
}

Response: {
  "data": { /* updated conversation */ }
}
```

---

## 🔄 WebSocket Events

### Events to EMIT (Send to Server)

#### 1. Join Conversation
```javascript
socket.emit('join_conversation', { 
  conversationId: 'conversation-uuid' 
}, (response) => {
  if (response.success) {
    console.log('Joined conversation');
    // response.conversation contains all messages
    displayMessages(response.conversation.messages);
  }
});
```

#### 2. Send Message
```javascript
socket.emit('send_message', {
  conversationId: 'conversation-uuid',
  message: 'Hello, how can I help?',
  imageUrl: '/uploads/file.pdf'  // optional
}, (response) => {
  if (response.success) {
    console.log('Message sent');
  } else {
    console.error('Failed:', response.error);
  }
});
```

#### 3. Typing Indicator
```javascript
// User started typing
socket.emit('typing', {
  conversationId: 'conversation-uuid',
  isTyping: true
});

// User stopped typing
socket.emit('typing', {
  conversationId: 'conversation-uuid',
  isTyping: false
});
```

#### 4. Mark as Read
```javascript
socket.emit('mark_as_read', {
  conversationId: 'conversation-uuid'
});
```

### Events to LISTEN (Receive from Server)

#### 1. New Message
```javascript
socket.on('new_message', (data) => {
  console.log('New message received:', data);
  /*
  data = {
    conversationId: 'uuid',
    message: {
      id: 'message-uuid',
      senderId: 'sender-uuid',
      message: 'text content',
      imageUrl: '/uploads/file.pdf',
      createdAt: '2025-12-08T10:00:00.000Z',
      sender: {
        admin: { firstName, lastName, photo },
        doctor: { firstName, lastName, photo }
      }
    }
  }
  */
  
  // If viewing this conversation, append message
  if (currentConversation?.id === data.conversationId) {
    appendMessageToUI(data.message);
  }
  
  // Update conversation list
  refreshConversationList();
});
```

#### 2. User Typing
```javascript
socket.on('user_typing', ({ userId, conversationId, isTyping }) => {
  if (currentConversation?.id === conversationId && userId !== currentUser.chatUserId) {
    if (isTyping) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  }
});
```

#### 3. User Online
```javascript
socket.on('user_online', ({ userId }) => {
  console.log('User came online:', userId);
  
  // Add to online users set
  onlineUsers.add(userId);
  
  // Update UI to show green dot
  updateUserStatus(userId, 'online');
});
```

#### 4. User Offline
```javascript
socket.on('user_offline', ({ userId }) => {
  console.log('User went offline:', userId);
  
  // Remove from online users
  onlineUsers.delete(userId);
  
  // Update UI to show offline status
  updateUserStatus(userId, 'offline');
});
```

#### 5. Messages Read
```javascript
socket.on('messages_read', ({ conversationId, userId }) => {
  console.log('Messages marked as read by:', userId);
  
  // Update UI to show read receipts (blue checkmarks)
  updateReadReceipts(conversationId);
});
```

#### 6. Unread Count
```javascript
socket.on('unread_count', ({ count }) => {
  console.log('Unread messages:', count);
  
  // Update badge/notification count
  updateUnreadBadge(count);
});
```

---

## 📊 Data Structures

### User Object
```typescript
{
  chatUserId: string;      // UUID for chat system
  name: string;            // Full name
  email: string;           // Email address
  role: 'ADMIN' | 'DOCTOR'; // User role
  token: string;           // JWT access token
  refreshToken: string;    // JWT refresh token
}
```

### Conversation Object
```typescript
{
  id: string;              // Conversation UUID
  userId: string;          // Chat user UUID
  adminId: string | null;  // Admin UUID (if assigned)
  subject: string;         // Conversation subject
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  user: {
    admin?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      photo: string | null;
    };
    doctor?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      photo: string | null;
    };
  };
  messages: Message[];     // Array of messages
}
```

### Message Object
```typescript
{
  id: string;              // Message UUID
  conversationId: string;  // Conversation UUID
  senderId: string;        // Sender's chat user UUID
  message: string;         // Message text
  imageUrl: string | null; // File URL (if any)
  isRead: boolean;         // Read status
  createdAt: string;       // ISO timestamp
  sender?: {
    admin?: {
      firstName: string;
      lastName: string;
      photo: string | null;
    };
    doctor?: {
      firstName: string;
      lastName: string;
      photo: string | null;
    };
  };
}
```

---

## 🛠 Frontend Implementation Steps

### Step 1: Project Setup

```bash
# Install Socket.IO client
npm install socket.io-client

# For React
npm install socket.io-client axios

# For Vue
npm install socket.io-client axios

# For Angular
npm install socket.io-client
```

### Step 2: Create API Service

```javascript
// api.service.js
const API_BASE_URL = 'http://localhost:7000/api/v1';

export const authAPI = {
  loginAdmin: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  },
  
  loginDoctor: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  }
};

export const chatAPI = {
  getConversations: async (token, userId = null) => {
    const url = userId 
      ? `${API_BASE_URL}/chat/conversations/user/${userId}`
      : `${API_BASE_URL}/chat/conversations`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  },
  
  getConversationById: async (token, conversationId) => {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  },
  
  createConversation: async (token, userId, userRole, subject) => {
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, userRole, subject })
    });
    return await response.json();
  },
  
  uploadFile: async (token, file, conversationId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    
    const response = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return await response.json();
  },
  
  getUnreadCount: async (token, userId) => {
    const response = await fetch(`${API_BASE_URL}/chat/unread/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  },
  
  markAsRead: async (token, conversationId) => {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  }
};

export const doctorAPI = {
  getAllDoctors: async (token) => {
    const response = await fetch(`${API_BASE_URL}/doctor/list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  },
  
  searchDoctors: async (token, query) => {
    const response = await fetch(`${API_BASE_URL}/doctor/search?query=${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  }
};
```

### Step 3: Create Socket Service

```javascript
// socket.service.js
import io from 'socket.io-client';

class SocketService {
  socket = null;
  
  connect(userId, userRole, token) {
    this.socket = io('http://localhost:7000/chat', {
      query: { userId, userRole },
      auth: { token }
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Connected to chat');
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from chat');
    });
    
    return this.socket;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  joinConversation(conversationId, callback) {
    this.socket.emit('join_conversation', { conversationId }, callback);
  }
  
  sendMessage(conversationId, message, imageUrl, callback) {
    this.socket.emit('send_message', {
      conversationId,
      message,
      imageUrl
    }, callback);
  }
  
  emitTyping(conversationId, isTyping) {
    this.socket.emit('typing', { conversationId, isTyping });
  }
  
  markAsRead(conversationId) {
    this.socket.emit('mark_as_read', { conversationId });
  }
  
  onNewMessage(callback) {
    this.socket.on('new_message', callback);
  }
  
  onUserTyping(callback) {
    this.socket.on('user_typing', callback);
  }
  
  onUserOnline(callback) {
    this.socket.on('user_online', callback);
  }
  
  onUserOffline(callback) {
    this.socket.on('user_offline', callback);
  }
  
  onMessagesRead(callback) {
    this.socket.on('messages_read', callback);
  }
  
  onUnreadCount(callback) {
    this.socket.on('unread_count', callback);
  }
}

export default new SocketService();
```

### Step 4: React Component Example

```jsx
// ChatApp.jsx
import React, { useState, useEffect } from 'react';
import socketService from './socket.service';
import { chatAPI, authAPI } from './api.service';

function ChatApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  // Login
  const handleLogin = async (email, password, role) => {
    try {
      const response = role === 'admin' 
        ? await authAPI.loginAdmin(email, password)
        : await authAPI.loginDoctor(email, password);
      
      const user = {
        chatUserId: response.data.user.id,
        name: `${response.data.user.firstName} ${response.data.user.lastName}`,
        email: response.data.user.email,
        role: response.data.user.role,
        token: response.data.accessToken
      };
      
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Connect to socket
      const socket = socketService.connect(user.chatUserId, user.role, user.token);
      
      // Setup socket listeners
      socketService.onNewMessage((data) => {
        if (selectedConversation?.id === data.conversationId) {
          setMessages(prev => [...prev, data.message]);
        }
        loadConversations();
      });
      
      socketService.onUserOnline((data) => {
        setOnlineUsers(prev => new Set(prev).add(data.userId));
      });
      
      socketService.onUserOffline((data) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });
      
      // Load conversations
      loadConversations();
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed');
    }
  };
  
  // Load conversations
  const loadConversations = async () => {
    try {
      const response = currentUser.role === 'DOCTOR'
        ? await chatAPI.getConversations(currentUser.token, currentUser.chatUserId)
        : await chatAPI.getConversations(currentUser.token);
      
      setConversations(response.data || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };
  
  // Select conversation
  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    
    socketService.joinConversation(conversation.id, (response) => {
      if (response.success) {
        setMessages(response.conversation.messages || []);
      }
    });
  };
  
  // Send message
  const sendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    socketService.sendMessage(
      selectedConversation.id,
      messageText,
      null,
      (response) => {
        if (response.success) {
          setMessageText('');
        } else {
          alert('Failed to send message');
        }
      }
    );
  };
  
  // Upload file
  const handleFileUpload = async (file) => {
    try {
      const response = await chatAPI.uploadFile(
        currentUser.token,
        file,
        selectedConversation.id
      );
      
      socketService.sendMessage(
        selectedConversation.id,
        '📎 File',
        response.data.fileUrl,
        (response) => {
          if (response.success) {
            console.log('File sent');
          }
        }
      );
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    }
  };
  
  return (
    <div className="chat-app">
      {!currentUser ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div className="chat-container">
          <ConversationList 
            conversations={conversations}
            onSelect={selectConversation}
            onlineUsers={onlineUsers}
          />
          
          {selectedConversation && (
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              messageText={messageText}
              onMessageChange={setMessageText}
              onSend={sendMessage}
              onFileUpload={handleFileUpload}
              currentUser={currentUser}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ChatApp;
```

---

## 🎨 Code Examples

### Check if Message is Sent by Current User

```javascript
const isSent = message.senderId === currentUser.chatUserId;

// Apply different styling
const messageClass = isSent ? 'message-sent' : 'message-received';
const messageAlign = isSent ? 'right' : 'left';
const backgroundColor = isSent ? '#dcfce7' : '#ffffff';
```

### Display File Attachments

```javascript
function renderFileAttachment(message) {
  if (!message.imageUrl) return null;
  
  // Check if it's an image
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(message.imageUrl);
  
  if (isImage) {
    return (
      <img 
        src={message.imageUrl} 
        alt="Attachment"
        onClick={() => openPreview(message.imageUrl)}
        style={{ maxWidth: '300px', cursor: 'pointer' }}
      />
    );
  } else {
    // Show download link for other files
    const fileName = message.imageUrl.split('/').pop();
    return (
      <a 
        href={message.imageUrl} 
        download 
        target="_blank"
        className="file-download"
      >
        📎 {fileName}
      </a>
    );
  }
}
```

### Format Doctor Name

```javascript
function formatDoctorName(firstName, lastName) {
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Don't add "Dr." if already present
  if (fullName.toLowerCase().startsWith('dr.') || 
      fullName.toLowerCase().startsWith('dr ')) {
    return fullName;
  }
  
  return `Dr. ${fullName}`;
}
```

### Typing Indicator with Debounce

```javascript
let typingTimeout = null;

function handleTyping(conversationId) {
  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  // Emit typing = true
  socketService.emitTyping(conversationId, true);
  
  // Set timeout to emit typing = false after 3 seconds
  typingTimeout = setTimeout(() => {
    socketService.emitTyping(conversationId, false);
  }, 3000);
}

// In input onChange
<input 
  onChange={(e) => {
    setMessageText(e.target.value);
    handleTyping(selectedConversation.id);
  }}
/>
```

### Show Last Message in Conversation List

```javascript
function getLastMessagePreview(conversation) {
  const lastMessage = conversation.messages?.[0];
  
  if (!lastMessage) {
    return 'No messages yet';
  }
  
  // If has file attachment
  if (lastMessage.imageUrl) {
    return lastMessage.message 
      ? `📎 ${lastMessage.message.substring(0, 30)}...`
      : '📎 File';
  }
  
  // Text message
  const text = lastMessage.message;
  return text.length > 40 ? text.substring(0, 40) + '...' : text;
}
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

#### 1. WebSocket Connection Failed
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  
  // Check if token expired
  if (error.message.includes('token') || error.message.includes('auth')) {
    // Refresh token or logout
    refreshToken();
  }
});
```

#### 2. Message Send Failed
```javascript
socketService.sendMessage(conversationId, message, null, (response) => {
  if (!response.success) {
    // Show error to user
    showErrorNotification(`Failed to send: ${response.error}`);
    
    // Retry logic
    setTimeout(() => {
      retrySendMessage(conversationId, message);
    }, 2000);
  }
});
```

#### 3. File Upload Too Large
```javascript
async function handleFileUpload(file) {
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }
  
  try {
    const response = await chatAPI.uploadFile(token, file, conversationId);
    // Continue...
  } catch (error) {
    if (error.message.includes('size')) {
      alert('File is too large');
    } else {
      alert('Upload failed. Please try again.');
    }
  }
}
```

#### 4. Token Expired
```javascript
async function makeAuthenticatedRequest(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${currentUser.token}`
    }
  });
  
  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
    } else {
      // Logout user
      logout();
    }
  }
  
  return response;
}
```

---

## 🧪 Testing Guide

### Test Scenarios

#### 1. Basic Chat Flow
1. Login as Admin
2. Load conversation list
3. Select a doctor
4. Create new conversation
5. Send text message
6. Receive response

#### 2. File Upload
1. Select conversation
2. Click attach file button
3. Choose file (under 5MB)
4. Add optional text caption
5. Click send
6. Verify file appears in chat
7. Click file to download

#### 3. Online/Offline Status
1. Login as Admin in Browser 1
2. Login as Doctor in Browser 2
3. Verify green dot shows "Online" for Doctor
4. Close Browser 2
5. Verify Admin sees Doctor go "Offline"

#### 4. Typing Indicator
1. Admin opens conversation with Doctor
2. Doctor starts typing
3. Admin should see "Doctor is typing..." indicator
4. Doctor stops typing (3 seconds)
5. Indicator should disappear

#### 5. Unread Count
1. Doctor sends message to Admin
2. Admin should see unread badge increase
3. Admin opens conversation
4. Unread count should decrease

### Testing with Multiple Users

**Browser 1 (Admin)**
```
Email: admin@example.com
Password: admin123
```

**Browser 2 (Doctor)**
```
Email: doctor@example.com
Password: doctor123
```

**Browser 3 (Another Doctor)**
```
Email: doctor2@example.com
Password: doctor456
```

### API Testing with Postman

#### 1. Login
```
POST http://localhost:7000/api/v1/auth/admin/login
Body: { "email": "admin@example.com", "password": "admin123" }
```

#### 2. Get Conversations (use token from step 1)
```
GET http://localhost:7000/api/v1/chat/conversations
Headers: Authorization: Bearer <token>
```

#### 3. Upload File
```
POST http://localhost:7000/api/v1/chat/upload
Headers: Authorization: Bearer <token>
Body (form-data):
  - file: [choose file]
  - conversationId: [conversation-uuid]
```

---

## 📱 Mobile Responsive Considerations

```css
/* Example responsive CSS */
@media (max-width: 768px) {
  .chat-container {
    grid-template-columns: 1fr; /* Single column on mobile */
  }
  
  .conversation-list {
    height: 50vh; /* Half screen for list */
  }
  
  .chat-window {
    height: 50vh; /* Half screen for chat */
  }
  
  .message {
    max-width: 85%; /* More space on mobile */
  }
}
```

---

## 🚀 Production Deployment

### Environment Variables

```env
# Backend
PORT=7000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRATION=7d

# Frontend
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_SOCKET_URL=https://api.yourdomain.com
```

### CORS Configuration

Backend must allow your frontend domain:

```typescript
// main.ts
app.enableCors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true
});
```

### WebSocket Configuration for Production

```javascript
// Use secure WebSocket (wss://)
const socket = io('https://api.yourdomain.com/chat', {
  secure: true,
  rejectUnauthorized: true,
  transports: ['websocket', 'polling']
});
```

---

## 📞 Support

For questions or issues:
- **Backend Developer**: Check server logs and WebSocket connection
- **Database Issues**: Verify Prisma migrations and PostgreSQL connection
- **Frontend Integration**: Use browser DevTools Network tab to debug API calls

---

## ✅ Implementation Checklist

- [ ] Install Socket.IO client library
- [ ] Create API service functions
- [ ] Create Socket service functions
- [ ] Implement login flow
- [ ] Store user credentials securely
- [ ] Initialize WebSocket connection after login
- [ ] Display conversation list
- [ ] Handle conversation selection
- [ ] Display messages in chat window
- [ ] Implement send message functionality
- [ ] Implement file upload
- [ ] Add typing indicator
- [ ] Add online/offline status
- [ ] Add unread message count
- [ ] Add message read receipts
- [ ] Test with multiple users
- [ ] Add error handling
- [ ] Add loading states
- [ ] Make responsive for mobile
- [ ] Deploy to production
- [ ] Update API URLs for production

---

**Last Updated**: December 8, 2025
**Version**: 1.0.0
