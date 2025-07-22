import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const getUserChannelSubscribers=asyncHandler(async(req,res)=>{
    const {channelId} =req.params;
    const channel=await User.findById(channelId);
    if(!channel){
        throw new ApiError(400,"channel is not availbale");
    }
    // const subscribers=await Subscription.find({channel:channel._id})
    const subscribers=await Subscription.aggregate([
        {
            $match:{
                channel:new mongoose.Types.ObjectId(channelId),
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribers",
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
             $lookup:{
                from:"users",
                localField:"subscribers",
                foreignField:"_id",
                as:"subscribedTo",
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
                subscribedToCount:{
                    $size:"$subscribedTo"
                },

            }
        },
        {
            $project:{
                isSubscribed:1,
                subscribersCount:1,
                subscribedToCount:1,


            }
        }

    ])
    return res
    .status(200)
    .json(new ApiResponse(200,subscribers,"subscribers are fetched successfully"))


})

const getSubscribedChannels=asyncHandler(async(req,res)=>{
    const {channelId}=req.params;
    const channel=await User.findById(channelId);
    if(!channel){
        throw new ApiError(400,"channel is not available");
    }
    const subscribedTo=await Subscription.find({subscriber:channel._id})

    return res
    .status(200)
    .json(new ApiResponse(200,subscribedTo,"channels are fetched successfully"))
})