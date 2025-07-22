import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
const app=express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    cridentials:true
}))
 app.use(express.json({limit:"16kb"}))//put the data into req.body
 app.use(express.urlencoded({extended:true,limit:"16kb"}))//parse form data 
 app.use(express.static("public"))//user can see the files from frontend
app.use(cookieParser())
// routes

import userRouter from './routes/user.routes.js'
app.use('/api/v1/users',userRouter)//'/user
export {app};