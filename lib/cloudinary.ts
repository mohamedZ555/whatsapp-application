import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  resourceType: string;
}

export async function uploadToCloudinary(
  source: string | Buffer,
  folder: string
): Promise<UploadResult> {
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    if (typeof source === 'string') {
      // URL or base64
      cloudinary.uploader
        .upload(source, { folder, resource_type: 'auto' })
        .then(resolve)
        .catch(reject);
    } else {
      uploadStream.end(source);
    }
  });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    resourceType: result.resource_type,
  };
}

export async function deleteFromCloudinary(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
