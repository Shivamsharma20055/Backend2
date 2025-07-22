import{asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {Comment} from "../models/comment.model.js"
import {User} from '../models/user.model.js'
import {User, Video} from '../models/video.model.js'
 import {uploadFileCloudinary} from '../utils/cloudinary.js'
 import{ApiResponse} from '../utils/ApiResponse.js'
 import { Like } from "../models/like.model.js";

 const getAllcomments=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    const {page,limit}=req.query;
    const video=await Video.findById(videoId);



    //  const page = parseInt(req.query.page) || 1;
    //  const limit = parseInt(req.query.limit) || 10;

    //  const skip = (page - 1) * limit;
    if(!video){
        throw new ApiError(400,"video is not available");
    }
    // const comments=await Comment.find({video:videoId})
    // .sort({createdAt:-1})
    // .populate("owner","username avatar")
    // .skip(skip)
    // .limit(limit)

    const commentsAggregate=Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId),
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
                from :"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes",
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
               owner: {
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
            $sort:{
                createdAt:-1,
            }
        },

        {
            $project:{
                content:1,
                createdAt:1,
                likesCount:1,
                owner:1,
                isLiked:1,

            }
        }
        


    ])
    const options={
        page:parseInt(page,10),
        limit:parseInt(limit,10),
    }
    const comments=await Comment.aggregatePaginate(
       commentsAggregate,
       options,

       

    )

    return res
    .status(200)
    .json(new ApiResponse(200,comments,"comments are successfully fetched"));

 })


 const addComment=asyncHandler(async(req,res)=>{
    const {content}=req.body;
    if(!content){
        throw new ApiError(400,"comment is required");
    }
    const {videoId}=req.params;
    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"video is required");
    }
    
    const comment=await Comment.create({
        content,
        video:video._id,
        owner:req.user?._id,



    })
    return res
    .status(200)
    .json(new ApiResponse(200,comment,"comment is added successfully"))


 })

 const updateComment=asyncHandler(async(req,res)=>{
    const {content}=req.body;
     if(!content){
        throw new ApiError(400,"comment is required");
    }
    const {videoId,commentId}=req.params;
   
    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"video is required");
    }
    const comment=await Comment.findById(commentId);
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this comment");
      }
    
    
    const updatedComment=await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content,
                
            }
        },
        {
            new:true,
        }


    )
    return res
    .status(200)
    .json(new ApiResponse(200,updatedComment,"comment is updated successfully"))
 })

 const deleteComment=asyncHandler(async(req,res)=>{
    const {videoId,commentId}=req.params;
    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"video is required");
    }
    const comment=await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(400,"comment is not available");
    }
    
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this comment");
      }
    await comment.deleteOne();
    // delete the like made by currentuser
    //so we should delete all the likes made on comment because comment is deleted
    await Like.deleteMany({
        comment:commentId,
        //likedBy:req.user,
    })
    return res
    .status(200)
    .json(new ApiResponse(200,{},"comment is successfully deleted"))


 })