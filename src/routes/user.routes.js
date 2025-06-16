import {Router} from "express";
import { registerUser,
        logoutUser,
        loginUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getWatchHistory,
        getUserChannelProfile,
} from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js";
import{verifyJWT} from "../middlewares/auth.middleware.js";

const router = Router()

// Public routes (no authentication needed)
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)


// Protected routes (authentication required)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/history").get(verifyJWT, getWatchHistory)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)


export default router