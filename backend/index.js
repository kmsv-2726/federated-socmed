import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
import cors from "cors"
import authRoute from "./routes/authRoute.js"
import postRoute from "./routes/postRoute.js"
import channelRoute from "./routes/channelRoute.js"
import userRoute from "./routes/userRoute.js"
import reportRoute from "./routes/reportRoute.js"
import federationRout from "./routes/federationRoute.js"
import searchRoute from "./routes/searchRoute.js"

dotenv.config()

const app = express()

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}))

app.use(express.json())

mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("Connected to MongoDB")
}).catch((err) => {
  console.log("Error connecting to MongoDB:", err)
})


const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoute)
app.use("/api/posts", postRoute)
app.use("/api/user", userRoute)
app.use("/api/channels", channelRoute)
app.use("/api/reports", reportRoute)
app.use("/api/federation", federationRout)
app.use("/api/search", searchRoute)

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



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

console.log("Backend server is running")

export default app
