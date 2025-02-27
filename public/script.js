let currentUser;
let selectedUser;
const socket = io('/');

async function checkAuth() {
    const res = await fetch(`/me`, { credentials: "include" });

    if (res.ok) {
        const data = await res.json();
        currentUser = data.username;
        var span = document.getElementById("currentUser");
        span.textContent = localStorage.getItem('username');
        socket.emit("userOnline", currentUser);
        fetchUsers();
    } else {
        window.location.href = "/login";
    }
}

async function logout() {
    await fetch(`/logout`, { method: "POST", credentials: "include" });
    localStorage.removeItem("currentUser");
    window.location.href = "/login";
}

async function fetchUsers() {
    const res = await fetch(`/users`);
    const users = await res.json();
    const userList = document.getElementById("userList");
    userList.innerHTML = "";

    users.forEach(user => {
        if (user.email !== currentUser) {
            const li = document.createElement("li");
            li.classList.add("user-item");
            const img = document.createElement("img");
            img.src = `/${user.imagePath}`;
            img.alt = user.username;
            img.classList.add("user-avatar");
            const userInfo = document.createElement("span");
            userInfo.innerHTML = `${user.username} <small>(${user.email})</small>`;
            userInfo.classList.add("user-info");
            li.appendChild(img);
            li.appendChild(userInfo);
            li.onclick = () => openChat(user);
            userList.appendChild(li);
        }
    });
}

async function openChat(user) {
    selectedUser = user;
    document.getElementById("chatUser").innerHTML = `
    <li class="user-item-navbar">
        <img src="${user.imagePath}" 
             alt="${user.username}" 
             class="user-avatar">
        <span class="user-info">
            ${user.username}
        </span>
    </li>`;

    const res = await fetch(`/messages/${currentUser}/${user.email}`);
    const messages = await res.json();

    const chatBox = document.getElementById("chatMessages");
    chatBox.innerHTML = "";

    messages.forEach(msg => {
        const msgElement = document.createElement("p");
        msgElement.innerText = `${msg.message}`;
        msgElement.classList.add(msg.sender === currentUser ? "sent" : "received");
        chatBox.appendChild(msgElement);
    });
}

async function sendMessage() {
    if (!selectedUser) {
        alert("Select a user first!");
        return;
    }
        
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();
    if (message === "") return;

    const chatBox = document.getElementById("chatMessages");
    const msgElement = document.createElement("p");
    msgElement.innerText = `${message}`;
    msgElement.classList.add("sent");
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
    try {
        socket.emit("sendMessage", { sender: currentUser, receiver: selectedUser.email, message });
        messageInput.value = "";
        openChat(selectedUser);
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
    }
}

socket.on("receivedMessage", (msg) => {
    const chatBox = document.getElementById("chatMessages");
    const msgElement = document.createElement("p");
    msgElement.innerText = msg.message;

    if (msg.sender === currentUser) {
        msgElement.classList.add("sent");
    } else {
        msgElement.classList.add("received");
    }
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

checkAuth();
