import { v2 as cloudinary } from 'cloudinary';
import envConfig from '../config/env.config.js';

const { cloudinary_api_key, cloudinary_name, cloudinary_secret } = envConfig;

cloudinary.config({
    cloud_name: cloudinary_name,
    api_key: cloudinary_api_key,
    api_secret: cloudinary_secret,
});

export default cloudinary;
