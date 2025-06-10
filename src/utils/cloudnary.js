import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from "fs";
import dotenv from "dotenv"

dotenv.config()

// Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });

    const uploadOnCloudinary = async(localFilePAth) => {
        try {
            if(!localFilePAth)  return null
            const response = await cloudinary.uploader.upload(
                localFilePAth, {
                    resource_type: "auto",
                }
            )
            console.log("File uploaded on cloudinary. File src:" + response.url);
            //once the file is uploaded, we would like to delete it from our server
            fs.unlinkSync(localFilePAth)
            return response
            


        } catch (error) {
            console.log("Error on Cloudinary", error);
            
            fs.unlinkSync(localFilePAth)
            return null
        }
    }

    const deleteFromCloudinary = async (publicId) => {
        try {
            const result = await cloudinary.uploader.destroy(publicId)
            console.log("Deleted from cloudinary. Public id:", publicId);
            return result
        } catch (error) {
            console.log("Error deleting from cloudinary:", error);
            return null
        }
    }
export {uploadOnCloudinary, deleteFromCloudinary}