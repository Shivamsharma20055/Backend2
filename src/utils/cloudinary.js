import{v2 as cloudinary} from 'cloudinary'
import fs from 'fs';
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// const uploadFileCloudinary=async (localFilePath)=>{
//     try{
//     if(!localFilePath){
//         return  null;
//     }
//     await cloudinary.uploader.upload(localFilePath,{ resource_type:"auto"});
 
//       fs.unlinkSync(localFilePath);
    
//     return response;
// }
// catch(error){
    
//       fs.unlinkSync(localFilePath);
    
//     return null;
// }

// }


import path from "path";

export const uploadFileCloudinary = async (localFilePath) => {
  try {
    if (!fs.existsSync(localFilePath)) {
      console.warn("File not found at:", localFilePath);
      return null; // Or throw if you want to fail
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Safe deletion
    fs.unlinkSync(localFilePath);
    console.log(response)

    return response;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
};

//export {uploadFileCloudinary};

