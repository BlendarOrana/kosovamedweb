import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) { 
  console.error('Missing required AWS environment variables (REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY, or BUCKET_NAME)');
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getContentType = (buffer, filename) => {
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    };
    if (contentTypes[ext]) {
      return contentTypes[ext];
    }
  }
  if (buffer && buffer.length > 0) {
    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8) return 'image/jpeg';
    if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) return 'image/png';
    if (firstBytes[0] === 0x25 && firstBytes[1] === 0x50 && firstBytes[2] === 0x44 && firstBytes[3] === 0x46) return 'application/pdf';
    if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) return 'image/gif';
    // WebP magic number check
    if (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46) {
      const webpBytes = buffer.slice(8, 12);
      if (webpBytes[0] === 0x57 && webpBytes[1] === 0x45 && webpBytes[2] === 0x42 && webpBytes[3] === 0x50) {
        return 'image/webp';
      }
    }
  }
  return 'application/octet-stream';
};

/**
 * Check if buffer contains an image
 */
const isImage = (buffer, filename) => {
  const contentType = getContentType(buffer, filename);
  return contentType.startsWith('image/');
};

/**
 * Process image with Sharp for optimization
 */
export const processImageWithSharp = async (buffer, filename = null, options = {}) => {
  try {
    // Default options for image processing
    const defaultOptions = {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 85,
      format: 'webp', // Default to WebP for best compression
      progressive: true,
      effort: 4, // Higher effort for better compression
      withoutEnlargement: true
    };

    const config = { ...defaultOptions, ...options };

    // Get original image metadata
    const metadata = await sharp(buffer).metadata();

    // Calculate optimal dimensions
    let { width, height } = metadata;
    
    if (width > config.maxWidth) {
      height = Math.round((height * config.maxWidth) / width);
      width = config.maxWidth;
    }
    if (height > config.maxHeight) {
      width = Math.round((width * config.maxHeight) / height);
      height = config.maxHeight;
    }

    // Create Sharp pipeline
    let sharpPipeline = sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: config.withoutEnlargement
      });

    // Apply format-specific optimizations
    switch (config.format.toLowerCase()) {
      case 'webp':
        sharpPipeline = sharpPipeline.webp({
          quality: config.quality,
          effort: config.effort,
          progressive: config.progressive
        });
        break;
      case 'jpeg':
      case 'jpg':
        sharpPipeline = sharpPipeline.jpeg({
          quality: config.quality,
          progressive: config.progressive,
          mozjpeg: true // Use mozjpeg encoder for better compression
        });
        break;
      case 'png':
        sharpPipeline = sharpPipeline.png({
          quality: config.quality,
          progressive: config.progressive,
          compressionLevel: 9
        });
        break;
      default:
        // Keep original format if not specified
        break;
    }

    const processedBuffer = await sharpPipeline.toBuffer();

    const compressionRatio = ((buffer.length - processedBuffer.length) / buffer.length * 100).toFixed(2);

    // Update filename with new extension if format changed
    let newFilename = filename;
    if (filename && config.format !== 'original') {
      newFilename = filename.replace(/\.[^/.]+$/, `.${config.format}`);
    }

    return {
      buffer: processedBuffer,
      filename: newFilename,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: parseFloat(compressionRatio),
      format: config.format,
      dimensions: { width, height }
    };
  } catch (error) {
    console.error(`Error processing image with Sharp: ${error.message}`);
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Upload file to S3 with optional Sharp processing for images
 */
export const uploadToS3 = async (buffer, filePathInS3, filename = null, contentType = null, processImages = true, sharpOptions = {}) => {
  let finalBuffer = buffer;
  let finalContentType = contentType || getContentType(buffer, filename);
  let finalFilename = filename;
  let processingStats = null;

  // Validate input
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer is empty or invalid');
  }
  
  if (!filePathInS3) {
    throw new Error('File path in S3 is required');
  }

  // Process images with Sharp if enabled and it's an image
  if (processImages && isImage(buffer, filename)) {
    try {
      const processed = await processImageWithSharp(buffer, filename, sharpOptions);
      finalBuffer = processed.buffer;
      finalFilename = processed.filename;
      finalContentType = getContentType(processed.buffer, processed.filename);
      processingStats = {
        originalSize: processed.originalSize,
        processedSize: processed.processedSize,
        compressionRatio: processed.compressionRatio,
        format: processed.format,
        dimensions: processed.dimensions
      };
      
      // Update S3 key if filename changed
      if (processed.filename !== filename) {
        const pathParts = filePathInS3.split('/');
        pathParts[pathParts.length - 1] = pathParts[pathParts.length - 1].replace(/[^/]*$/, processed.filename.split('/').pop());
        filePathInS3 = pathParts.join('/');
      }
    } catch (processError) {
      console.warn(`Image processing failed, uploading original: ${processError.message}`);
      // Continue with original buffer if processing fails
    }
  }

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filePathInS3,
    Body: finalBuffer,
    ContentType: finalContentType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'upload-time': new Date().toISOString(),
      'original-filename': filename || 'unknown',
      ...(processingStats && {
        'original-size': processingStats.originalSize.toString(),
        'processed-size': processingStats.processedSize.toString(),
        'compression-ratio': processingStats.compressionRatio.toString(),
        'processed-format': processingStats.format
      })
    }
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    
    
    return {
      Location: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePathInS3}`,
      CloudFrontUrl: process.env.CLOUDFRONT_DOMAIN ? `https://${process.env.CLOUDFRONT_DOMAIN}/${filePathInS3}` : null,
      ETag: data.ETag,
      Key: filePathInS3,
      ContentType: finalContentType,
      ...(processingStats && { ProcessingStats: processingStats })
    };
  } catch (err) {
    console.error('Error uploading to S3:', err);
    console.error('Upload params:', JSON.stringify({...uploadParams, Body: '[Buffer]'}, null, 2));
    throw new Error(`Error uploading to S3: ${err.message}`);
  }
};

/**
 * Upload multiple images with batch processing
 */
export const uploadMultipleImages = async (files, folderPath, sharpOptions = {}) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Files array is required and cannot be empty');
  }

  
  const uploadPromises = files.map(async (file, index) => {
    try {
      const key = `${folderPath}/${Date.now()}-${index}-${file.originalname || `file-${index}`}`;
      const result = await uploadToS3(file.buffer, key, file.originalname, file.mimetype, true, sharpOptions);
      return {
        success: true,
        key: result.Key,
        url: result.CloudFrontUrl || result.Location,
        stats: result.ProcessingStats
      };
    } catch (error) {
      console.error(`Failed to upload file ${index}:`, error.message);
      return {
        success: false,
        error: error.message,
        filename: file.originalname || `file-${index}`
      };
    }
  });

  const results = await Promise.all(uploadPromises);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  
  return {
    successful,
    failed,
    totalUploaded: successful.length,
    totalFailed: failed.length
  };
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (filePathInS3) => {
  if (!filePathInS3) {
    console.warn('No file path provided for deletion');
    return null;
  }

  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filePathInS3,
  };

  try {
    const data = await s3.send(new DeleteObjectCommand(deleteParams));
    return data;
  } catch (err) {
    console.error(`Error deleting key "${filePathInS3}" from S3:`, err.message);
    // Don't throw error to avoid breaking main operations
    return null;
  }
};

/**
 * Test S3 connection
 */
export const testS3Connection = async () => {
  try {
    const command = new HeadBucketCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
    });
    
    await s3.send(command);
    return true;
  } catch (err) {
    console.error('S3 connection failed:', err.message);
    return false;
  }
};

/**
 * Generate CloudFront URL for public access (recommended)
 */
export const getCloudFrontUrl = (key) => {
  if (!key || !process.env.CLOUDFRONT_DOMAIN) {
    return null;
  }
  return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
};

/**
 * Generate pre-signed URL for temporary direct S3 access (fallback)
 */
export const getPresignedUrl = async (key, expiresIn = 3600) => {
  if (!key) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  try {
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });
    return signedUrl;
  } catch (err) {
    console.error(`Error generating pre-signed URL for key "${key}":`, err.message);
    return null;
  }
};

/**
 * Get the best URL for accessing a file (CloudFront preferred, pre-signed as fallback)
 */
export const getFileUrl = async (key) => {
  if (!key) {
    return null;
  }

  // Try CloudFront first (for public access)
  const cloudFrontUrl = getCloudFrontUrl(key);
  if (cloudFrontUrl) {
    return {
      url: cloudFrontUrl,
      type: 'cloudfront',
      expires: null // CloudFront URLs don't expire
    };
  }

  // Fallback to pre-signed URL
  const presignedUrl = await getPresignedUrl(key);
  if (presignedUrl) {
    return {
      url: presignedUrl,
      type: 'presigned',
      expires: new Date(Date.now() + 3600 * 1000) // 1 hour from now
    };
  }

  return null;
};