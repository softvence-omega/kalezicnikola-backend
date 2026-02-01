// Manual notification test - paste this in browser console
fetch('http://localhost:8000/api/v1/notifications', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYjRmOGI1ZC0yNzY5LTQzNGUtYmQwZS03MGFlYjVlMTA1ZTYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzY5NTkyMzUyLCJleHAiOjE3Njk2Nzg3NTJ9.0OIsGb35ZyCiBUDfuzcFlQbpUUbQo9cNQrmQZEwfFmw'
    },
    body: JSON.stringify({
        type: 'TEST_NOTIFICATION',
        title: 'Browser Test',
        message: 'This is a test notification from browser!'
    })
})
.then(response => response.json())
.then(data => console.log('Notification created:', data));
