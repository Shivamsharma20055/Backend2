import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js";

const createTweet=asyncHandler(async(req,res)=>{
    const {content}=req.body;
    if(!content){
        throw new ApiError(400,"content is required")
    }
    const tweet=await Tweet.create(
        {
        content,
        owner:req.user?._id
  })

  return res
  .status(200)
  .json(new ApiResponse(200,tweet,"tweet is successfully created"));
  })
const getUserTweets=asyncHandler(async(req,res)=>{
    // const tweets=await Tweet.find({owner:req.user?._id})
    // .sort({ createdAt: -1 })
    // .populate("owner", "username avatar");
    const{userId}=req.params;

    const tweets=await Tweet.aggregate([
      {
        $match:{
          owner:new mongoose.Types.ObjectId(userId),
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
      },

      },
     
    {
        $lookup:{
          from:"likes",
          localField:"_id",
          foreignField:"tweet",
          as:"likes"

        }
    },
    {
      $addFields:{
        likesCount:{
          $size:"$likes"
        },
        owner:{
          $first:"$owner"
        },
          isLiked:{
                    $cond:{
                        if:{$in:[req.user?._id,"$likes.likedBy"]},
                        then:true,
                        else:false,

                    }
                }
      }
    },
    {
      $project:{
        content:1,
        owner:1,
        likesCount:1,
        isLiked:1,
        createdAt:1,

      }
    }
       
    
      
      


    ])
    return res
    .status(200)
    .json(new ApiResponse(200,tweets,"tweets are successfully fetched"))
})
const updateTweet=asyncHandler(async(req,res)=>{
    const {tweetId} =req.params;
    const {content}=req.body;
    if(!content){
        throw new ApiError(400,"content is required");
    }
     if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
   

    const tweet=await Tweet.findById(tweetId);
   
    if(!tweet){
        throw new ApiError(400,"tweet is not available")
    }
     if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to update this tweet");
  }
    // const updatedTweet=await Tweet.findByIdAndUpdate(
    //     tweetId,
    //     {
    //         $set:{
    //             content:content,

    //         }

    //     },
    //     {
    //         new :true,
    //     }
    // );

    tweet.content=content;
    await tweet.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new ApiResponse(200,tweet,"tweet is successfully updated"))
    

})
const deleteTweet=asyncHandler(async(req,res)=>{
     const {tweetId} =req.params;
      if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
     const tweet=await Tweet.findById(tweetId);
    

    if(!tweet){
        throw new ApiError(400,"tweet is not available")
    }
     if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this tweet");
  }
   

    await tweet.deleteOne()
    await Like.deleteMany({
      tweet:tweetId,
    })
     return res
    .status(200)
    .json(new ApiResponse(200,{},"tweet is successfully deleted"))


})