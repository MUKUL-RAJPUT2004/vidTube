import { ApiError } from "../utils/ApiErrorResponse.js" 
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/Apiresponse.js" 
import { Video } from "../models/video.models.js"
import mongoose from "mongoose"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, order, userId } = req.query
   
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Page and limit must be greater than 0");
    }

    const pipeline = [];
    const matchStage = {
        isPublished: true  // Only show published videos
    };
    
    // Filter using query
    if(query){
        matchStage.title = { $regex: query, $options: 'i'};
    }

    // Filter by user
    if(userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    pipeline.push({ $match: matchStage });
    
    // Sort
    const sortStage = {};
    const sortField = sortBy || 'createdAt';  // Default to createdAt if no sort specified
    const sortOrder = order || 'desc';

    sortStage[sortField] = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: sortStage });

    // Add owner details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        fullname: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            ]
        }
    });

    // Unwind the owner array
    pipeline.push({
        $addFields: {
            owner: { $first: "$owner" }
        }
    });

    // Paginate
    const options = {
        page: parseInt(page), 
        limit: parseInt(limit), 
    };
    
    const result = await Video.aggregatePaginate(pipeline, options);

    if(result.docs.length === 0){
        throw new ApiError(404, "No videos found");
    }
    
    // Prepare response
    const response = {
        totalVideos: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
        videos: result.docs,
    };

    return res.status(200).json(new ApiResponse(200, response, "Videos fetched successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}