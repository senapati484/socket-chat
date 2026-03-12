/* ===================================================================
   SOCKET.IO CHAT APPLICATION - SERVER SIDE
   ===================================================================
   This server handles real-time chat using Socket.IO
   It manages client connections, room management, message broadcasting,
   and now supports file sharing between users in the same room.
   =================================================================== */

// Import required Node.js modules
const express = require('express');      // Web framework for serving HTTP requests
const http = require('http');             // Core Node.js HTTP module
const { Server } = require('socket.io');  // Real-time communication library

// Create an Express application instance
const app = express();
// Create an HTTP server that Express will use
const server = http.createServer(app);
// Attach Socket.IO to the HTTP server for real-time communication
const io = new Server(server);

/* ===================================================================
   MIDDLEWARE & STATIC FILES
   ===================================================================
   Purpose: Serve static files (HTML, CSS, JS) to clients
   
   How it works:
   - Express serves files from the 'public' folder
   - Clients can access index.html and script.js from browser
   =================================================================== */
app.use(express.static('public'));

/* ===================================================================
   SOCKET.IO CONNECTION HANDLER
   ===================================================================
   Purpose: Handle client connections and socket events
   
   How it works:
   - When a client connects, this callback is triggered
   - We set up listeners for various socket events
   - Each event is handled with appropriate server-side logic
   =================================================================== */
io.on('connection', (socket) => {
    // Log when a new user connects
    // socket.id is a unique identifier for this connection
    console.log("User connected:", socket.id);

    /* ===============================================================
       JOIN ROOM EVENT
       ===============================================================
       Purpose: Allow user to join a room and announce their arrival
       
       How it works:
       1. Receive username and room name from client
       2. Add socket to the room (all future messages will go to this room)
       3. Store username and room in socket object for later reference
       4. Send 'joined room' system message to all users in that room
       5. The joining user sees the message but is not included in initial broadcast
       =============================================================== */
    socket.on("joinRoom", ({ username, room }) => {
        // Join this socket to the specified room
        // Socket.IO automatically manages room membership
        socket.join(room);
        
        // Store username on this socket for later use
        socket.username = username;
        // Store room name on this socket for later use
        socket.room = room;

        // Broadcast a system message to all users in the room
        // Using socket.to(room) means the message goes only to that room
        socket.to(room).emit("message", {
            user: "System",  // Mark as system message
            text: `${username} joined the room`
        });
        
        console.log(`${username} joined room: ${room}`);
    });

    /* ===============================================================
       CHAT MESSAGE EVENT
       ===============================================================
       Purpose: Receive message from client and broadcast to all users in room
       
       How it works:
       1. Receive plain text message from client
       2. Get the room and username from socket object
       3. Broadcast message to all users in that room (including sender)
       4. Include username so recipients know who sent it
       =============================================================== */
    socket.on("chatMessage", (msg) => {
        // Broadcast the message to all users in the room
        // io.to(room) ensures only users in that room receive it
        io.to(socket.room).emit("message", {
            user: socket.username,  // Include who sent the message
            text: msg               // The actual message content
        });
        
        console.log(`Message from ${socket.username} in ${socket.room}: ${msg}`);
    });

    /* ===============================================================
       FILE MESSAGE EVENT
       ===============================================================
       Purpose: Receive file from client and broadcast to all users in room
       
       How it works:
       1. Receive file data (base64 encoded) along with metadata
       2. Extract file information: name, size, type, data
       3. Get the room and username from socket object
       4. Broadcast file to all users in that room (including sender)
       5. File data remains as base64 for compatibility
       
       File metadata includes:
       - fileName: original filename for download
       - fileSize: file size in bytes for validation
       - fileType: MIME type for proper handling
       - fileData: complete base64 encoded file content
       =============================================================== */
    socket.on("fileMessage", (fileInfo) => {
        // Broadcast the file to all users in the room
        // includes complete file metadata for proper handling
        io.to(socket.room).emit("fileMessage", {
            user: socket.username,          // Who sent the file
            fileName: fileInfo.fileName,    // Filename for download
            fileSize: fileInfo.fileSize,    // File size in bytes
            fileType: fileInfo.fileType,    // MIME type
            fileData: fileInfo.fileData     // Complete base64 file data
        });
        
        console.log(`File from ${socket.username} in ${socket.room}: ${fileInfo.fileName} (${fileInfo.fileSize} bytes)`);
    });

    /* ===============================================================
       DISCONNECT EVENT
       ===============================================================
       Purpose: Handle user disconnection and announce departure
       
       How it works:
       1. Check if user was in a room (socket.room exists)
       2. Send goodbye system message to remaining users in that room
       3. Socket.IO automatically removes from room on disconnect
       4. Log the disconnection for debugging purposes
       =============================================================== */
    socket.on("disconnect", () => {
        // Only send message if user was actually in a room
        // (prevents errors if disconnect happens before joining any room)
        if (socket.room) {
            // Broadcast user departure message to all remaining users in room
            io.to(socket.room).emit("message", {
                user: "System",  // Mark as system message
                text: `${socket.username} left the room`
            });
            
            console.log(`${socket.username} left room: ${socket.room}`);
        }
        console.log("User disconnected:", socket.id);
    });
});

/* ===================================================================
   START SERVER
   ===================================================================
   Purpose: Listen on port 3000 and accept incoming connections
   
   How it works:
   - Server listens on localhost:3000
   - Clients can connect via http://localhost:3000
   - Server waits for connections and handles them with Socket.IO
   =================================================================== */
server.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
    console.log("💬 Ready for chat connections...");
    console.log("📁 File sharing enabled (max 10MB per file)");
});
