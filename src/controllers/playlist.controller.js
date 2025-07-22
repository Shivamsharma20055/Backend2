import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPlaylist=asyncHandler(async(req,res)=>{
    const {name,description}=req.body;
    if(!name||!description){
        throw new ApiError(400,"name and description is required");
    }
    const playlist=await Playlist.create({
        name,
        description,
        owner:req.user?._id
    })
    if(!playlist){
        throw new ApiError(500,"playlist is failed to create")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlist is successfully created"));
})
const updatePlaylist=asyncHandler(async(req,res)=>{
    const {name,description}=req.body;
    const {playlistId}=req.params;
    if(!name||!description){
        throw new ApiError(400,"name and description is required");
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }
    const playlist=await Playlist.findById(playlistId);
     if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if(playlist.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"owner can only edit the playlist");
    }

    const newPlaylist=await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set:{
                name,
                description,

            }

        },
        {
            new:true,
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(200,newPlaylist,"playlist is successfully updated"))
})
const deletePlaylist=asyncHandler(async(req,res)=>{
     const {playlistId}=req.params;
      if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }
    const playlist=await Playlist.findById(playlistId);
     if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if(playlist.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"owner can only edit the playlist");
    }
    await Playlist.findByIdAndDelete(playlist?._id);

    return res
    .status(200)
    .json(new ApiResponse(200,{},"playlist is successfully delted"));

})

const addVideoToPlaylist=asyncHandler(async(req,res)=>{
    const {playlistId,videoId}=req.params;
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }
    const playlist=await Playlist.findById(playlistId);
    const video =await Video.findById(videoId)
    if(!playlist){
        throw new ApiError(400,"playlist does not exist")
    }
    if(!video){
        throw new ApiError(400,"video is not available")

    }
    if(playlist.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"owner can only edit the playlist");
    }
    const newPlaylist=await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet:{
                video:videoId
            }

        },
        {
            new:true,
        }
    )
    return res
    .status(200)
    .json(new ApiResponse(200,newPlaylist,"video is successfully added in playlist"))

})
const removeVideoFromPlaylist=asyncHandler(async(req,res)=>{
    const{playlistId,videoId}=req.params;
     if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }
    const playlist=await Playlist.findById(playlistId);
    const video =await Video.findById(videoId)
    if(!playlist){
        throw new ApiError(400,"playlist does not exist")
    }
    if(!video){
        throw new ApiError(400,"video does not exist")
    }
    if(playlist.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"owner can only edit the playlist");
    }
    const newPlaylist=await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull:{
                video:videoId,
            }
        },
        {
            new:true,
        }
    )
    return res
    .status(200)
    .json(new ApiResponse(200,newPlaylist,"video is successfully removed from playlist"))

})

const getUserPlaylist=asyncHandler(async(req,res)=>{
    const {userId}=req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }
    const playlist=await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            addFields:{
                totalVideos:{
                    $size:"$videos",
                },
                totalViews:{
                    $sum:"$videos.views"
                }
            }
        },
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                totalVideos:1,
                totalViews:1,
                updatedAt:1,
            }
        }

    ])
    return res
    .status(200)
    .json(new ApiResponse(200,getUserPlaylist,"user playlists are fetched successfully"))

})

 const getPlaylistById=asyncHandler(async(req,res)=>{
    const {playlistId}=req.params;
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }
    const playlist=await Playlist.findById(playlistId);
     if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    const getPlaylist=await Playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId),
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
                pipeline:[
                    {
                        $match:{
                            isPublished:true,
                        }
                    },
                    {
                        $lookup:{
                             from:"users",
                             localField:"owner",
                              foreignField:"_id",
                              as:"owner",

                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"playlistOwner"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos",
                },
                totalViews:{
                    $sum:"videos.views"
                },
                playlistOwner:{
                    $first:"$playlistOwner"
                }
                

            }
        },
        
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                createdAt:1,
                updatedAt:1,
                totalVideos:1,
                totalViews:1,
                videos:{
                    _id:1,
                    title:1,
                    description:1,
                    duration:1,
                    createdAt:1,
                    duration:1,
                    views:1,
                    owner:{
                        username:1,
                        avatar:1,
                    }
                },
                playlistOwner:{
                    username:1,
                    avatar:1,
                }
            }
        }


    ])
    return res
    .status(200)
    .json(new ApiResponse(200,getPlaylist,"playlist is successfully fetched"))
})












