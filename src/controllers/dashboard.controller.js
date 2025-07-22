import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats=asyncHandler(async(req,res)=>{
    const subscribers=await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        // {
        //     addFields:{
        //         subscribersCount:{
        //             $size:"totalSubscribers"
                    
        //         }
        //     }

        // },

        // OR
        {
            $group:{
                _id:null,
                totalSubscribers:{
                   
                        $sum:1,
                   
                }


            }
        }

    ])
    const video=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(req.user?._id),
            }
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
            $project:{
                totalLikes:{
                    $size:"$likes",
                },
                totalViews:"$views",
                

            }
        },
        {
            $group:{
                _id:null,
                totalLikes:{
                    $sum:"$totalLikes"
                },
                totalViews:{
                    $sum:"$totalViews"
                },
                totalVideos:{
                    $sum:1,
                }
            }
        }

    ])

    const channelStats={
        subscribers:subscribers[0].totalSubscribers||0,
        totalLikes:video[0].totalLikes||0,
        totalViews:video[0].totalViews||0,
        totalVideos:video[0].totalVideos||0,
    }

})
const getChannelVideos=asyncHandler(async(req,res)=>{
    const videos=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(req.user?._id),
                isPublished:true,
            }
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
            addFields:{
                likesCount:{
                    $size:"$likes",
                }
            }
        },
        {
            $sort:{
                createdAt:-1,
            }
        },
        {
            $project:{
                _id:1,
                title:1,
                thumbnail:1,
                createdAt:{
                    year:{
                        $year:"$createdAt",
                        
                    },
                    month:{
                        $month:"$createdAt",
                    },
                    day:{
                        $day:"$createdAt",
                    }

                },
                isPublished:1,
                likesCount:1,
                likes:1,


            }
        }

    ])
    return res
    .status(200)
    .json(new ApiResponse(200,videos,"videos are successfully fetched"));
})
