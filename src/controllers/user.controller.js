import{asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
 import {uploadFileCloudinary} from '../utils/cloudinary.js'
 import{ApiResponse} from '../utils/ApiResponse.js'

 const generateAcessTokenandRefreshToken=async(userId)=>{
    try{
    const user= await User.findById(userId);
    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();
    user.refreshToken=refreshToken;
   await user.save({validateBeforeSave:false})
   return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"something went wrong while generating the access and  refresh token");
    }
 }




const registerUser=asyncHandler(async(req,res)=>{
    //take the  user data from frontend
    // validation not empty
    // check if user alreday exist : username,email
    //check for images ,avatar
    //upload them to cloudinary ,avatar
    //create user object -create entry in db
    //remove password and refresh token field from response
    //check for user creation
    // return res

    //the data is taken by req.body(form data,json data) or req.url
    const {email,fullName,password,username} =req.body;
    
    //check any field is not empty
    if(
        [fullName,email,username].some((filed)=>filed?.trim()==="")
    ){
        throw new ApiError(404,"all fields are required")

    }
   // console.log(req.body)

    //check the user is alredy present
    const existedUser= await User.findOne({
        $or:[{email},{username}]
    }
    )
    if(existedUser){
        throw new ApiError(409,"user with email,username is already exists")
    }
    //multer provide files
    //console.log(req.files);
    

     const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path
    // console.log(coverImageLocalPath)
    // console.log(avatarLocalPath)
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is required")

    }
    const avatar= await uploadFileCloudinary(avatarLocalPath);
    //const coverImage= await uploadFileCloudinary(coverImageLocalPath)
   let coverImage = { url: "" };
 if (coverImageLocalPath) {
    coverImage = await uploadFileCloudinary(coverImageLocalPath);
  }

    //create user
    // db is on another continent and when user talk to db then it may give error then asyncHandler catch the error
     const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })
    //remove password and refreshToken
     const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering")
    }
    res.status(201).json(
        new ApiResponse(200,createdUser,"successfully register")
    )

})
const loginUser=asyncHandler(async (req,res)=>{
    //get data from frontend
    //check the user or email already exists
    //check the authentication
    //access and refresh token
    //send cookies
    //login

    const{username,email,password}=req.body||{}
    if(!username&&!email ){
            throw new ApiError(400,"usename or email is required")
        }

        //check user is exist 
        const user= await User.findOne({
            $or:[{email},{username}]
        }
        )
        if(!user){
            throw new ApiError(404,"user exist");
        }
        const isPasswordValid= await user.isPasswordCorrect(password);
        if(!isPasswordValid){
            throw new ApiError(404,"password is incorect");
        }

        const {accessToken,refreshToken}=await generateAcessTokenandRefreshToken(user._id);

        //the above user not have updated refresh token because the user called bfeore method call 
        //we have two options that update the user or get the user again from databse 
        // because the refresh token is avialable
        //  because we call the function that genarate refresh token 
        // so if we again get the user from database
        // then the user have refresh token also 
        //user have password also  so we do not send password in cookies

        const loggedInUser= await User.findById(user._id).select(
            "-password -refreshToken"
        )
        //cookies can modified by frontend also but after this frontend can not modified the cookies and server can
         const options={
            httpOnly:true,
            secure:true,
         }

         return res
         .status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refreshToken",refreshToken,options)
         .json(
            new ApiResponse(
                200,
                {
                    user:loggedInUser,accessToken,refreshToken,
                },
                "user logged in successfully"
            )
         )
         

    




})
const logoutUser=asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined,
            },
            // $unset:{
            //     refreshToken:1
            // }


        },
        {
            new:true,
        }


    )
    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"logged out"));
    
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(400,"unauthorized");
    }
    try{
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    const user=await User.findById(decodedToken?._id);
    if(!user){
         throw new ApiError(401,"invalid refresh token");

    }
    if(incomingRefreshToken!=user.refreshToken){
        throw new ApiError(401,"refresh token is expired")
    }
    const {accessToken,refreshToken}=generateAcessTokenandRefreshToken(user._id);
    const options={
        httpOnly:true,
        secure:true,
    }
    return res
    .status(200)
    .Cookie("accessToken",accessToken,options)
    .Cookie("refreshToken,refreshToken",options)
    .json(new ApiResponse(200,{accessToken,refreshToken},"new token generated"))
}
catch(error){
    throw new ApiError(401,error?.message||"invalid refresh token ")
}
    
})

const changeCurrentPassword=asyncHandler(async (req,res)=>{
   const {oldPassword,newPassword}=req.body;
   const user= User.findById(req.user?._id)
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password");
   }
   user.password=newPassword;
   await user.save({validateBeforeSave:false});
   return res
   .status(200)
   .json(new ApiResponse(200,{},"password changed successfully"))




})

const getCurrentUser=asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user"))
})

const updateAccountDetails=asyncHandler(async (req,res)=>{
    const {fullName,email}=req.body;
    if(!fullName||!email){
        throw new ApiError(400,"please send fullname and email")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email,
            }

        },
        {
            new :true

        }
    
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"details are updated successfully"))
})

const updateUserAvatar=asyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const avatar=await uploadFileCloudinary(avatarLocalPath)
    if(avatar.url){
        throw new ApiError(400,"file is not uploaded on cloudinary")
    }
    const user=User.findById(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url,

            }

        },
        {
            new:true,
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"avatar is updated successfully"))

})
const updateUserCoverImage=asyncHandler(async (req,res)=>{
    const coverImageLocalPath=req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }
    const coverImage=await uploadFileCloudinary(coverImageLocalPath)
    if(coverImage.url){
        throw new ApiError(400,"file is not uploaded on cloudinary")
    }
    const user=User.findById(
        req.user?._id,
        {
            $set:{
               coverImage:coverImage.url,

            }

        },
        {
            new:true,
        }
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200,user,"coverImage is updated successfully"))
    
})

const getUserProfile=asyncHandler(async(req,res)=>{
    const username=req.params;
    if(!username.trim()===""){
        throw new ApiError(400,"username is missing");
    }

    //User.find({username})//we can find the user by the username and apply pipelines 
    //but we have match field in aggregation so we match the document with username so we will find the user

    const channel =await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase(),
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"-id",
                foreignField:"subscriber",
                as:"subscribedTo"

            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"Subscribers"
                },
                channelSubscribedTo:{
                    $size:"SubcsribedTo"
                }
            },
        
        isSubscribed:{
            $cond:{
                if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                then:true,
                else:false,


            }
        }
    },
    {
        $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
             channelSubscribedTo:1,
             avatar:1,
             coverImage:1,
             



        }
    }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,channel[0]," channel is fetched successfully"))
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await user.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"WatchHistory",
                foreignField:"_id",
                as:"watchHistory",
            },
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        froeignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1,
                                }
                            }
                        ]


                    }
                },
                {
                    $addFields:{
                        $first:"$owner"
                    }
                }
            ]
        }

    ])
    res.status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))


})
export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage, getUserProfile,getWatchHistory}

