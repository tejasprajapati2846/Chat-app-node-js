# Chat Application

A real-time chat application using Node.js, Express, Socket.io, and EJS. Users can log in with their email, view a list of available users, and chat with selected users in real-time.

## Features
- Display a list of online users
- Real-time messaging using Socket.io
- Simple and responsive UI with EJS templates

## Technologies Used
- Node.js
- Express.js
- Socket.io
- EJS (Embedded JavaScript)
- CSS (for basic styling)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tejasprajapati2846/Chat-app-node-js.git
   cd Chat-app-node-js
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the server:**
   ```bash
   node index.js
   ```

4. **Access the app:**
   Open a browser and go to `http://localhost:5000`

## File Structure
```
chat-app/
│-- public/
│   │   │-- script.js    # Frontend socket handling
│   │   │-- style.css    # Basic styling
│-- views/
│   │-- chat.ejs        # Chat page
│   │-- signup.ejs      # Register page
│   │-- login.ejs       # Login page
│-- index.js            # Main backend logic
│-- package.json        # Dependencies and scripts
```

## How It Works
1. **User Login**
   - Users enter their email to log in.
   - User details are stored in a session.

2. **User List**
   - After login, users see a list of online users.
   - Users can select a user to start chatting.

3. **Chat Functionality**
   - Messages are sent and received in real-time using Socket.io.
   - Each message appears instantly without reloading the page.
   - User authentication with passwords
   - Message history with database storage

## WebSockets with Socket.io
- The server listens for incoming messages and broadcasts them to the correct recipient.
- Example of handling a message in `index.js`:
  ```javascript
  io.on("connection", (socket) => {
      socket.on("sendMessage", ({ recipientId, message }) => {
          io.to(recipientId).emit("receiveMessage", { message, senderId: socket.id });
      });
  });
  ```
  
## License
This project is open-source and available under the MIT License.

