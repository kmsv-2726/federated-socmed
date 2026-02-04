import express from "express"
import dotenv from "dotenv"
import mongoose from "mongoose"
import authRoute from "./routes/authRoute.js"
import postRoute from "./routes/postRoute.js"
import postRoute from "./routes/postRoute.js"
import channelRoute from "./routes/channelRoute.js"

dotenv.config()

const app = express()

app.use(express.json())

mongoose.connect(process.env.MONGO_URL).then(()=>{
  console.log("Connected to MongoDB")
}).catch((err)=>{
  console.log("Error connecting to MongoDB:", err)
})


const PORT = process.env.PORT || 5000;

app.use("/api/auth", authRoute)
app.use("/api/posts", postRoute)
app.use("/api/posts", postRoute)
app.use("/api/channels", channelRoute)

app.use((err,req,res,next)=>{
    const errorStatus = err.status || 500
    const errorMessage = err.message || "Something went wrong!!"
    return res.status(errorStatus).json({
        success : false,
        status : errorStatus,
        message: errorMessage,
        stack: err.stack,
    }) 
})



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

console.log("Backend server is running")

export default app