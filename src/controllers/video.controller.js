import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { Like } from "../models/like.model.js";


const getAllVideos=asyncHandler(async(req,res)=>{
    const {userId}=req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }
     if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }
    // const videos=await Video.find({owner:userId})
    const videos=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId),
                published:true,
            }
        },
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
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $project: {
                owner: 1,
                title: 1,
                thumbnail: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1
            }
        },
        {
            $sort: { createdAt: -1 } // Sort by createdAt descending (newest first)
        },
        {
            $skip: (page - 1) * limit // Skip documents for pagination
        },
        {
            $limit: parseInt(limit) // Limit documents per page
        }
        
        
    ])
    // if (videos.length > 0 && !videos[0].owner) {
    //     throw new ApiError(404, "User not found");
    // }
    //get the video count
    //const totalVideos = await Video.countDocuments({ owner: userId, published: true });
    return res
    .status(200)
    .json(new ApiResponse(200,videos,"videos are successfully fetched"));
    
})

const publishVideo=asyncHandler(async(req,res)=>{
    const {title,description}=req.body;
    const videoLocalPath=req.files?.video[0].path;
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    if(! videoLocalPath){
        throw new ApiError(400,"video is required");
    }
   const video= await uploadOnCloudinary(videoLocalPath);
   const thumbnailLocalPath=req.files?.thumbnail[0].path;
   if(!thumbnailLocalPath){
    throw new ApiError(400,"thumbnail is required");
   }
   const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);
   

   const videos=await Video.create({
    title,
    thumbnail:thumbnail.url,
    description,
    video:video.url,
    owner:req.user?._id,
    duration:video.duration,



   })
   return res
   .status(200)
   .json(new ApiResponse(200,videos,"video create successfully"))

})

const getVideo=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    // const video=await Video.findById(videoId);
    // if(!video){
    //     throw new ApiError(404,"video is not found");
    // }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const video=await Video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            },
           
        },
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
        },
            

        },
        {
             $lookup:{
                from:"subscriptions",
                localField:"owner",
                foreignField:"channel",
                as:"subscribers",
                //we are no taking subscribers detail beacuse it can be expnesive 
                //because subscribers may be very high 
                pipeline:[

                 {
                     $lookup:{
                        from:"users",
                        localField:"subscriber",
                        foreignField:"_id",
                         as:"subscribersDetails",
                    
                     pipeline:[
                         {
                             $project:{
                                 username:1,
                                 avatar:1,
                            
                             }
                         }
                     ]
                 }
                 }
             ]

        },
            
        },
        {
        $unwind: {
                path: "$subscribersDetails",
                preserveNullAndEmptyArrays: true
            },
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"

            }
        },
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"comments",
                pipeline:[
                    {
                        $lookup:{
                          from:"users",
                          localField:"owner",
                           foreignField:"_id",
                           as:"commentOwner",
                           pipeline:[
                            {
                                $project:{
                                    username:1,
                                    avatar:1,
                                }
                            }
                           ]

                        }

                    }
                ]

            }

        },
        
        
        {
            $addFields:{
                likesCount:{
                    $size:"$likes",
                },
                isLiked:{
                    $cond:{
                        if:{$in:[req.user?._id,"$likes.likedBy"]},
                        then:true,
                        else:false,

                    }
                },
                 isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                },
                subscribersCount:{
                    $size:"$subscribers"
                },
                owner:{
                    $first:"$owner"
                },
                

            }
        },
        {
            $project:{
                owner:1,
                subscribersCount:1,
                likesCount:1,
                video:1,
                thumbnail:1,
                title:1,
                description:1,
                duration:1,
                views:1,
                isLiked:1,
                subscribers:1,
                 isSubscribed:1,
                 comments:1,

            }
        }
    ])








    return res
    .status(200)
    .json(new ApiResponse(200,video,"video fetched successfully"))
    
})
const updateVideo=asyncHandler(async(req,res)=>{
    const {videoId} =req.params;
    const {title,description,thumbnail}=req.body;
    if(title.trim()===""||description.trim()===""){
        throw new ApiError(400,"titel and description is required");
    }
    const thumbnailLocalPath=req.file?.path;
    if(!thumbnailLocalPath){
        throw new ApiError(400,"thumbnail is required")
    }
    
    const thumbnailurl= await uploadOnCloudinary(thumbnailLocalPath);
     const existedVideo= await Video.findById(videoId);
     if(!existedVideo){
        throw new ApiError(404,"video is not found")
     }
     if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError( 400, "You can't delete this video as you are not the owner"

        )}

     const video= await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail:thumbnailurl.url
            }
        },
        {
            new:true,
        }

    )
    return res
    .status(200)
    .json(new ApiResponse(200,video,"video is updated successfully"))
    
})

const deleteVideo=asyncHandler(async(req,res)=>{
    const {videoId} =req.params;
    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"video is not found");
    }
    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError( 400, "You can't delete this video as you are not the owner"
 ) }
   await  video.deleteOne();
   await Like.deleteMany({
    video:videoId,
   })
   await Comment.deleteMany({
    video:videoId,
   })


    return res
    .status(200)
    .json(200,{},"video deleted successfully")

})
const togglePublishStatus=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    const video= await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"video is not found");
    }
    video.isPublished=!video.isPublished;
    await video.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(200,video,`video is ${video.isPublished?"published":"not published" } successfully`)

})
