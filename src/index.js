
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path: './.env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`the Server is running on ${process.env.PORT}`)
    })
}).catch((error)=>{
    console.log("there is something wrong")
})



// const app=express();
// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",()=>{
//             console.log("error:".error)
//             throw err;
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listening on port number ${process.env.PORT}`)
//         })

//     }
//     catch(error){
//         console.error("error:",error);
//         throw error;
//     }

// })()