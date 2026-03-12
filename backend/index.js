import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
import cors from "cors"

import { createServer } from "http"
import { Server } from "socket.io"
import authRoute from "./routes/authRoute.js"
import postRoute from "./routes/postRoute.js"
import channelRoute from "./routes/channelRoute.js"
import userRoute from "./routes/userRoute.js"
import reportRoute from "./routes/reportRoute.js"
import federationRout from "./routes/federationRoute.js"
import serverConfigRoute from "./routes/serverConfigRoute.js"
import messageRoute from "./routes/messageRoute.js"
import ServerConfig from "./models/ServerConfig.js"
import muteRoute from "./routes/muteRoute.js"
import blockRoute from "./routes/blockRoute.js"
import searchRoute from "./routes/searchRoute.js"
import serverRoute from "./routes/serverRoute.js"
import activityRoute from "./routes/activityRoute.js"
dotenv.config()

const app = express()
const httpServer = createServer(app)
export const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "https://heartfelt-cocada-80540c.netlify.app"],
    credentials: true
  }
})

// Store online users
export const onlineUsers = new Map()

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`)

  socket.on("register", (userId) => {
    onlineUsers.set(userId, socket.id)
    console.log(`User ${userId} registered with socket ${socket.id}`)
  })

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`)
    for (let [key, value] of onlineUsers.entries()) {
      if (value === socket.id) {
        onlineUsers.delete(key)
        break
      }
    }
  })
})

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "https://heartfelt-cocada-80540c.netlify.app"],
  credentials: true
}))

app.use(express.json({ limit: '50mb' })) // to allow image upload sizes larger than the default 100kb previously

const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoute)
app.use("/api/posts", postRoute)
app.use("/api/user", userRoute)
app.use("/api/channels", channelRoute)
app.use("/api/reports", reportRoute)
app.use("/api/federation", federationRout)
app.use("/api/server-config", serverConfigRoute)
app.use("/api/messages", messageRoute)
app.use("/api/mutes", muteRoute)
app.use("/api/blocks", blockRoute)
app.use("/api/search", searchRoute)
app.use("/api/servers", serverRoute)
app.use("/api/activities", activityRoute)

app.use((err, req, res, next) => {
  const errorStatus = err.status || 500
  const errorMessage = err.message || "Something went wrong!!"
  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: err.stack,
  })
})

mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("Connected to MongoDB")

    // Initialize server config
    try {
      let config = await ServerConfig.findOne({ serverName: process.env.SERVER_NAME });
      if (!config) {
        config = new ServerConfig({ serverName: process.env.SERVER_NAME });
        await config.save();
        console.log(`Initialized default config for server: ${process.env.SERVER_NAME}`);
      }
    } catch (err) {
      console.error("Failed to initialize server config:", err);
    }

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err)
    process.exit(1)
  })

export default app