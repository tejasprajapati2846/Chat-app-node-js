const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cookieParser = require("cookie-parser");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    imagePath: { type: String, required: true }
});
const User = mongoose.model("User", UserSchema);

const MessageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", MessageSchema);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.get("/chat", (req, res) => {
    res.render("chat", { error: null });
});

app.post("/signup", upload.single("image"), async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const imagePath = req.file ? req.file.path : null;
        const newUser = new User({ username, password: hashedPassword, email, imagePath });
        await newUser.save();
        res.json({ message: "User created" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
        });
        res.json({ token, username: user.username });
    } catch (error) {
        res.json({ error: "Something went wrong. Try again!" });
    }
});

app.get("/users", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const currentUserEmail = decoded.email;
        const users = await User.find({ email: { $ne: currentUserEmail } });

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/messages/:user1/:user2", async (req, res) => {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
        $or: [
            { sender: user1, receiver: user2 },
            { sender: user2, receiver: user1 }
        ]
    }).sort({ timestamp: 1 });
    res.json(messages);
});

app.get("/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        res.json({ username: decoded.email,name: decoded.name});
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
});

app.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
});

let activeUsers = new Map();

io.on("connection", (socket) => {

    socket.on("userOnline", (username) => {
        activeUsers.set(username, socket.id);
        io.emit("updateUsers");
    });

    socket.on("sendMessage", async ({ sender, receiver, message }) => {
        const newMessage = new Message({ sender, receiver, message });
        await newMessage.save();

        const receiverSocket = activeUsers.get(receiver);
        if (receiverSocket) {
            io.to(receiverSocket).emit("receivedMessage", newMessage);
        }
    });

    socket.on("disconnect", () => {
        activeUsers.forEach((id, user) => {
            if (id === socket.id) activeUsers.delete(user);
        });
        io.emit("updateUsers");
    });
});

server.listen(5000, () => console.log("Server running on port 5000"));
