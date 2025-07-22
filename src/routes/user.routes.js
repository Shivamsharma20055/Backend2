import {Router} from 'express'
import { registerUser,loginUser,logoutUser,refreshAccessToken, changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage, getUserProfile,getWatchHistory} from '../controllers/user.controller.js';
import{verifyJwtToken} from '../middlewares/auth.middleware.js'
import {upload} from '../middlewares/multer.middleware.js'
const router=Router();
router.route("/register").post(
    upload.fields(
     [
        {
            name:'avatar',
            maxCount:1,
        },
         {
             name:'coverImage',
             maxCount:1
         }

    ]
)
    
    ,registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJwtToken,logoutUser)
router.route("/refresh-Token").post(refreshAccessToken)
router.route("/change-password").post(verifyJwtToken,changeCurrentPassword)
router.route("/current-user").get(verifyJwtToken,getCurrentUser)
router.route("/update-details").patch(verifyJwtToken,updateAccountDetails);
router.route("/avatar").patch(verifyJwtToken,upload.single("avatar"),updateUserAvatar);
router.route("/cover-image").patch(verifyJwtToken,upload.single("coverImage"),updateUserCoverImage);
router.route("/c/:username").get(verifyJwtToken, getUserProfile);
router.route("/history").get(verifyJwtToken,getWatchHistory);


export default router;