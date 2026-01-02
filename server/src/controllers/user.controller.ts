import type { Request, Response } from 'express';
import cloudinary from '../lib/cloudinary.js';
import UserServices from '../services/user.service.js';
import envConfig from '../config/env.config.js';

async function uploadImage(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Image is required',
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `${envConfig.cloudinary_upload_path}/avatar`,
                    transformation: [
                        {
                            width: 500,
                            height: 500,
                            crop: 'fill',
                            gravity: 'face',
                        },
                    ],
                },
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
            uploadStream.end(file.buffer);
        });

        await UserServices.uploadImageInDB({
            imageUrl: uploadResult.secure_url,
            headers: req.headers as unknown as Headers,
        });

        return res.status(200).json({
            success: true,
            message: 'Profile image updated successfully.',
            data: {
                imageUrl: uploadResult.secure_url,
            },
        });
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({
            success: false,
            message: (error as Error).message || 'Something went wrong',
        });
    }
}

const UserControllers = {
    uploadImage,
};

export default UserControllers;
