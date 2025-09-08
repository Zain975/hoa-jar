import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Check if required environment variables are set
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME) {
      throw new Error('AWS S3 configuration is missing. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME environment variables.');
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  /**
   * Upload a file to S3
   * @param file Buffer content
   * @param key S3 object key
   * @param contentType MIME type of the file
   * @returns S3 URL of the uploaded file
   */
  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        ACL: 'private', // Make files private by default
      });

      await this.s3Client.send(command);
      
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (error) {
      throw new BadRequestException(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Upload file buffer to S3
   * @param fileBuffer File buffer from multer
   * @param key S3 object key
   * @returns S3 URL of the uploaded file
   */
  async uploadFileBuffer(fileBuffer: Express.Multer.File, key: string): Promise<string> {
    try {
      return await this.uploadFile(fileBuffer.buffer, key, fileBuffer.mimetype);
    } catch (error) {
      throw new BadRequestException(`Failed to upload file buffer: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   * @param key S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Generate a unique key for S3 upload
   * @param objectName Object Name
   * @param userId User ID
   * @param originalName Original filename
   * @returns Unique S3 key
   */
  generateS3Key(objectName: string, userId: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop() || 'pdf';
    return `${objectName}/${userId}/${timestamp}.${extension}`;
  }

  /**
   * Generate a presigned URL for file download (if needed)
   * @param key S3 object key
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      throw new BadRequestException(`Failed to generate presigned URL: ${error.message}`);
    }
  }
}
