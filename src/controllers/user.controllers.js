import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrorResponse.js" 
import {User} from "../models/user.models.js";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudnary.js"
import { ApiResponse } from "../utils/Apiresponse.js" 
import jwt from "jsonwebtoken";


const generateAccessAndRefereshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        //small check for user existence
    
        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}



const registerUser = asyncHandler( async(req, res)=>{
    //todo
    
    // Debug: Log all field names to check for spaces or typos
    console.log("Request body:", req.body);
    console.log("Field names in request:", Object.keys(req.body));
    
    // Extract fields and handle potential spaces in field names
    let {fullname, email, username, password} = req.body;
    
    // Check if password field has trailing space (common issue in Postman)
    if (!password && req.body['password']) {
        password = req.body['password'];
        console.log("Found password with trailing space, using it:", password);
    }
    
    console.log("Extracted fields:");
    console.log("- fullname:", fullname, "Type:", typeof fullname);
    console.log("- username:", username, "Type:", typeof username);
    console.log("- email:", email, "Type:", typeof email);
    console.log("- password:", password ? '[PROVIDED]' : 'undefined', "Type:", typeof password);

    //validation - check if any field is missing or empty
    if(
        [fullname, username, email, password].some((field) => 
            !field || (typeof field === 'string' && field.trim() === "")
        ) 
    ){
        throw new ApiError(400, "All fields are required")
    }
    
    // Additional specific check for password
    if (!password) {
        throw new ApiError(400, "Password is required")
    }


    //mogondb db sercing if this user exist
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //image handling from multer
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverImage[0]?.path

     //upload o cloudinary
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    
    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // let coverImage = ""
    // if(coverLocalPath){
    //     coverImage = await uploadOnCloudinary(coverLocalPath)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Upload avatar", avatar);
        
    } catch (error) {
        console.log("error uploading avatar", error);
        throw new ApiError(500, "failed to laod avatar")

    }

    let coverImage = null;
    if(coverLocalPath) {
        try {
            coverImage = await uploadOnCloudinary(coverLocalPath)
            console.log("Upload coverImage", coverImage);
        } catch (error) {
            console.log("error uploading coverImage", error);
            // Clean up avatar if cover image upload fails
            if(avatar) {
                await deleteFromCloudinary(avatar.public_id)
            }
            throw new ApiError(500, "failed to upload coverImage")
        }
    }

      

    //creating user
    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select("-password -refreshToken")
    
        //checking if the user gets created or not
        if(!createdUser){
            throw new ApiError(500, "Something went wrong while registering the user")
    
        }
    
        return res
            .status(201)
            .json(new ApiResponse(200, createdUser, "User registered successfully"))
  
    } catch (error) {
        console.log("user creation failed:", error.message);
        
        // Clean up uploaded images if user creation fails
        if(avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
             await deleteFromCloudinary(coverImage.public_id)
        }
        
        // Throw the original error, not a generic message
        throw error

    }
  })



const loginUser = asyncHandler(async(req, res)=>{
    //get data from body
    const {email, username, password} = req.body


    //validaton
    if(!email){
        throw new ApiError(409, "Email is required")
    }

    //check for existing user
    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(409, "User not found")

    }

    //validate password
    const isPasswordvalid = await user.isPasswordCorrect(password)

    if(!isPasswordvalid){
    throw new ApiError(409, "Invalid user credentials")
    }

    const loggedInUser  = await User.findById(user._id)
        .select("-password -refreshToken");
    //check if logged in successfully


    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            {user: loggedInUser, accessToken, refreshToken },
            "User logged in successfully"
        ))
})


const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {new: true}
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json( new ApiResponse(200, {}, "User logged out successfully"))
})


const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required")
    }

    try {
        jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
        await User.findById(decodedToken?._id)

        if(!User){
            throw new ApiError(401, "Invalid refreshtoken")
        }

        //check if the refresh token is valid from db
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Invalid refreshtoken")
        }

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefereshToken(user._id)
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed successfully"
                )
            )
    } 
    catch (error) {
        throw new ApiError(401, "Something went wrong while refreshing access token")
    }
})


const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordvalid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordvalid){
        throw new ApiError(401, "Old password is incorrect!")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password changes successfully"))

})

const getCurrrentUser = asyncHandler(async(req, res)=>{
  return res.status(200).json(new ApiResponse(200, req.user, "Current user details"))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullname, email} = req.body

    if(!fullname || !email){
        throw new ApiError(400, "Fullname and email are required")
    }
   
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },{new: true}
    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "File is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500, "Something went wrong while uploading avatar")
    }

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successdully"))
})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.files?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "File is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(500, "Something went wrong while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200, user, "Cover image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async (req, res)=>{
    const {username} = req.params

    if(!username?.trime()){
        throw new ApiError(400, "Username is required")
    }

    const chanel = await User.aggregate(
        [
           {
            $match: {
                username: username?.toLowerCase()
            }
           },
           {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
                
            }
           },
           {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
           },
           {
            $addFields: {
                subscribersCount:{
                    $size: "$subscriber"
                },

                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
           },
           {
            //project omly the necessary fiels

            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email: 1
            }
           }
        ]
    )

    //log and ifn dwhats going her

    if(channel?.length){
        throw new ApiError(404, "Channel not found!")

    }

    return res.status(200).json( new ApiResponse(
        200,
        channel[0],
        "Channel profile fetched successfully"
    ))

})


const getWatchHistory = asyncHandler(async (req, res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new moongose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
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
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }          
                ]
            }
        }
    ])

    if(!user){
        throw new ApiError(400, "User required to see watch history")
    }

    return res.status(200).json( new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully"))

})

export{
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getWatchHistory,
    getUserChannelProfile,
    
}