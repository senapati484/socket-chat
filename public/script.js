/* ===================================================================
   SOCKET.IO CHAT APPLICATION - CLIENT SIDE
   ===================================================================
   This script handles all the client-side logic for the chat app.
   It manages sending/receiving messages, joining/leaving rooms,
   and updating the UI based on real-time socket events.
   Supports both text messages and file sharing.
   =================================================================== */

// Initialize Socket.IO connection to the server
const socket = io();

// Store the current user's username and room name
let currentUsername = '';
let currentRoom = '';

/* ===================================================================
   JOIN ROOM FUNCTION
   ===================================================================
   Purpose: Allow user to join a chat room with a username
   
   How it works:
   1. Get the username and room name from input fields
   2. Validate that both fields are filled
   3. Store the values locally for later use
   4. Emit a 'joinRoom' event to the server with username and room
   5. Update UI to hide join section and show chat/input areas
   6. Focus on the message input field for immediate typing
   =================================================================== */
function joinRoom() {
    // Get the username from the input field and trim whitespace
    const username = document.getElementById("username").value.trim();
    // Get the room name from the input field and trim whitespace
    const room = document.getElementById("room").value.trim();

    // Validate: username and room cannot be empty
    if (!username || !room) {
        alert("Please enter both username and room name");
        return;
    }

    // Store current user info in variables for later reference
    currentUsername = username;
    currentRoom = room;

    // Send join request to server with username and room
    // The server will handle adding this socket to the room
    socket.emit("joinRoom", { username, room });

    // Update UI: Hide the join section since user is now in a room
    document.getElementById("joinSection").style.display = "none";
    // Show the chat area where messages will appear
    document.getElementById("chatArea").classList.add("active");
    // Show the message input and file upload controls
    document.getElementById("inputControls").classList.add("active");
    // Update room info in header
    document.getElementById("roomInfo").textContent = `Room: ${room} | User: ${username}`;
    // Clear previous chat messages if room is reused
    document.getElementById("chat").innerHTML = "";
    // Focus on message input so user can start typing immediately
    document.getElementById("message").focus();
}

/* ===================================================================
   SEND MESSAGE FUNCTION
   ===================================================================
   Purpose: Send a text message to all users in the current room
   
   How it works:
   1. Get the message text from the input field
   2. Check if message is not empty
   3. Emit the message to the server via 'chatMessage' event
   4. Clear the input field for next message
   5. Focus back on input field for continued typing
   =================================================================== */
function sendMessage() {
    // Get the message text from the input field and trim whitespace
    const message = document.getElementById("message").value.trim();

    // Only send if message is not empty
    if (!message) {
        return;
    }

    // Send the message to the server
    // The server broadcasts it to all users in the same room
    socket.emit("chatMessage", message);

    // Clear the input field after sending
    document.getElementById("message").value = "";
    // Focus back on input field for immediate next message
    document.getElementById("message").focus();
}

/* ===================================================================
   SEND FILE FUNCTION
   ===================================================================
   Purpose: Send a file to all users in the current room
   
   How it works:
   1. Get the selected file from the file input element
   2. Validate file exists and check file size (max 10MB)
   3. Read file as base64 data URL
   4. Extract file metadata (name, size, type)
   5. Emit file data to server with complete metadata
   6. Reset file input and display selected file name
   7. Auto-clear file selection after 3 seconds
   =================================================================== */
function sendFile() {
    // Get the file input element
    const fileInput = document.getElementById("fileInput");
    // Get the first selected file
    const file = fileInput.files[0];

    // If no file is selected, return early
    if (!file) {
        return;
    }

    // Validate file size - max 10MB (10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert("File size must be less than 10MB");
        fileInput.value = ""; // Reset file input
        return;
    }

    // Display the selected file name to user
    document.getElementById("fileName").textContent = `Sending: ${file.name}...`;

    // Create a FileReader to read the file as base64
    const reader = new FileReader();

    // When file finishes reading
    reader.onload = (event) => {
        // Extract base64 data from the read result
        const fileData = event.target.result;

        // Emit file event to server with complete file information
        socket.emit("fileMessage", {
            fileName: file.name,       // Filename for display and download
            fileSize: file.size,       // File size in bytes
            fileType: file.type,       // MIME type
            fileData: fileData          // Complete base64 encoded file data
        });

        // Reset the file input element
        fileInput.value = "";
        // Clear file name display after 2 seconds
        setTimeout(() => {
            document.getElementById("fileName").textContent = "";
        }, 2000);

        // Focus back on message input
        document.getElementById("message").focus();
    };

    // Handle read errors
    reader.onerror = () => {
        alert("Error reading file. Please try again.");
        fileInput.value = "";
        document.getElementById("fileName").textContent = "";
    };

    // Start reading the file as a data URL (base64)
    // This converts the entire file into a string we can transmit
    reader.readAsDataURL(file);
}

/* ===================================================================
   LEAVE ROOM FUNCTION
   ===================================================================
   Purpose: Allow user to leave the current chat room
   
   How it works:
   1. Disconnect from the current room (server handles via disconnect event)
   2. Reconnect immediately so user can join another room
   3. Reset UI to show join section again
   4. Clear all chat messages
   5. Reset user info variables
   =================================================================== */
function leaveRoom() {
    // Disconnect the socket - this triggers 'disconnect' event on server
    socket.disconnect();
    // Reconnect immediately so user can join another room
    socket.connect();

    // Reset UI: Show join section again
    document.getElementById("joinSection").style.display = "block";
    // Hide chat area
    document.getElementById("chatArea").classList.remove("active");
    // Hide input controls
    document.getElementById("inputControls").classList.remove("active");
    // Clear room info from header
    document.getElementById("roomInfo").textContent = "";
    // Clear all messages from chat display
    document.getElementById("chat").innerHTML = "";
    // Clear input fields
    document.getElementById("username").value = "";
    document.getElementById("room").value = "";
    document.getElementById("message").value = "";
    document.getElementById("fileName").textContent = "";
    // Reset file input
    document.getElementById("fileInput").value = "";
    // Reset stored user info
    currentUsername = "";
    currentRoom = "";
}

/* ===================================================================
   MESSAGE RECEIVED EVENT LISTENER
   ===================================================================
   Purpose: Display incoming text messages from other users
   
   How it works:
   1. Listen for 'message' events sent by the server
   2. For each message received, create a new message element
   3. Determine if it's own message, other user's message, or system message
   4. Style accordingly (different colors/alignment)
   5. Append to chat display
   6. Auto-scroll to latest message
   =================================================================== */
socket.on("message", (data) => {
    // Get the chat messages container where we'll add the new message
    const chatMessages = document.getElementById("chat");

    // Create a new div element to hold the message
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";

    // Determine message type and style accordingly
    if (data.user === "System") {
        // System messages (user joined/left room)
        messageDiv.classList.add("system");
        messageDiv.textContent = data.text;
    } else if (data.user === currentUsername) {
        // Messages sent by current user (shown on right with black background)
        messageDiv.classList.add("own");
        messageDiv.innerHTML = `<div class="message-user">You</div>${data.text}`;
    } else {
        // Messages from other users (shown on left with gray background)
        messageDiv.classList.add("other");
        messageDiv.innerHTML = `<div class="message-user">${data.user}</div>${data.text}`;
    }

    // Add the message to the chat display
    chatMessages.appendChild(messageDiv);

    // Auto-scroll to the latest message
    // This ensures user always sees the newest messages at the bottom
    chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
});

/* ===================================================================
   FILE MESSAGE RECEIVED EVENT LISTENER
   ===================================================================
   Purpose: Display incoming files from other users
   
   How it works:
   1. Listen for 'fileMessage' events sent by the server
   2. Create a file message element with file information
   3. Add a download button that uses data URL to download
   4. Style based on whether it's own file or other user's file
   5. Display file name and size in a readable format
   6. Auto-scroll to latest message
   =================================================================== */
socket.on("fileMessage", (data) => {
    // Get the chat messages container
    const chatMessages = document.getElementById("chat");

    // Create a new div element for the file message
    const messageDiv = document.createElement("div");
    messageDiv.className = "message file";

    // Add appropriate styling based on message source
    if (data.user === currentUsername) {
        messageDiv.classList.add("own");
    } else {
        messageDiv.classList.add("other");
    }

    // Format file size to human-readable format (bytes, KB, MB)
    const fileSize = data.fileSize;
    let fileSizeStr = fileSize + " B";
    if (fileSize > 1024 * 1024) {
        fileSizeStr = (fileSize / (1024 * 1024)).toFixed(2) + " MB";
    } else if (fileSize > 1024) {
        fileSizeStr = (fileSize / 1024).toFixed(2) + " KB";
    }

    // Determine sender display name
    const senderName = data.user === currentUsername ? "You" : data.user;

    // Create the HTML content for file message
    messageDiv.innerHTML = `
        <div class="message-user">${senderName}</div>
        <div class="file-content">
            <div class="file-info">
                <div class="file-name">📄 ${data.fileName}</div>
                <div class="file-size">${fileSizeStr}</div>
            </div>
            <button class="file-download-btn" onclick="downloadFile('${data.fileData.replace(/'/g, "\\'")}', '${data.fileName.replace(/'/g, "\\'")}')">Download</button>
        </div>
    `;

    // Add the file message to the chat display
    chatMessages.appendChild(messageDiv);

    // Auto-scroll to the latest message
    chatMessages.parentElement.scrollTop = chatMessages.parentElement.scrollHeight;
});

/* ===================================================================
   DOWNLOAD FILE FUNCTION
   ===================================================================
   Purpose: Download a file that was shared in the chat
   
   How it works:
   1. Receive base64 file data and filename
   2. Create an anchor element (invisible link)
   3. Set the href to the file data (data URL)
   4. Set the download attribute with the filename
   5. Trigger automatic download
   6. Clean up the temporary anchor element
   =================================================================== */
function downloadFile(fileData, fileName) {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    // Set the file data as the link href
    link.href = fileData;
    // Set the download attribute with the filename
    link.download = fileName;
    // Append to document (required for some browsers)
    document.body.appendChild(link);
    // Trigger the download by clicking the link
    link.click();
    // Remove the temporary link from document
    document.body.removeChild(link);
}

/* ===================================================================
   ENTER KEY HANDLER FOR MESSAGE INPUT
   ===================================================================
   Purpose: Allow users to send messages by pressing Enter key
   
   How it works:
   1. Listen for keypress events on the message input field
   2. Check if the Enter key was pressed
   3. If Enter is pressed, send the message
   4. Prevent default Enter behavior (creating new line)
   =================================================================== */
// Wait for DOM to be fully loaded before attaching event listeners
document.addEventListener("DOMContentLoaded", () => {
    // Get the message input element
    const messageInput = document.getElementById("message");
    
    if (messageInput) {
        // When user presses a key in the message input field
        messageInput.addEventListener("keypress", (event) => {
            // Check if Enter key was pressed (not Shift+Enter)
            if (event.key === "Enter" && !event.shiftKey) {
                // Send the message
                sendMessage();
                // Prevent default Enter behavior (which would add a newline)
                event.preventDefault();
            }
        });
    }
});
