import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleVideoLike=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const liked=await Like.findOne({
        video:videoId,
        likedBy:req.user?._id,

    })
    if(liked){
        await Like.findByIdAndDelete(liked._id);
        return res
        .status(200)
        .json(new ApiResponse(200,false,"user do not like the video"))
  
    }
    const like=Like.create({
        video:videoId,
        likedBy:req.user?._id,
    })
     return res
        .status(200)
        .json(new ApiResponse(200,true,"user like the video"))


})
const toogleCommentLike=asyncHandler(async(req,res)=>{
    const {commentId}=req.params;
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    const liked=await Like.findOne({
        comment:commentId,
        likedBy: req.user?._id,
    })
    if(liked){
        await Like.findByIdAndDelete(liked._id);
        return res
        .status(200)
        .json(new ApiResponse(200,false,"user do not like the comment"))
    }
    const like=await Like.create({
        comment:commentId,
        likedBy:req.user?._id
    })
    return res
    .status(200)
    .json(new ApiResponse(200,true,"user like the comment"));
})

const toggleTweetLike=asyncHandler(async(req,res)=>{
    const {tweetId}=req.params;
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweeet ID");
    }
    const liked=await Like.findOne({
        tweet:tweetId,
        likedBy:req.user?._id,
    })
    if(liked){
         await Like.findByIdAndDelete(liked._id);
        return res
        .status(200)
        .json(new ApiResponse(200,false,"user do not like the comment"))

    }
    const like=await Like.create({
        tweet:tweetId,
        likedBy:req.user?._id
    })
    return res
    .status(200)
    .json(new ApiResponse(200,true,"user like the tweet"))
    
})
const getLikedVideos=asyncHandler(async(req,res)=>{
    const likedVideos=await Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                    addFields:{
                       owner:{
                        $first:"$owner"
                        
                        }
                    }

                    },
                     {
                        $project:{
                            thumbnail:1,
                             title:1,
                             description:1,
                             duration:1,
                             views:1,
                             owner:1,
                        }
                    },
                ],
                
                   

                

            }
        },
        {
            $unwind: "$likedVideos"
        },

        
    ])
    return res
    .status(200)
    .json(new ApiResponse(200,likedVideos,"all liked videos are fetched successfully"))
})