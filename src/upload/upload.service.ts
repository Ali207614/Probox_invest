import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
export type ImageSize = 'small' | 'medium' | 'large';
export type ImageUrls = Record<ImageSize, string>;

export interface UploadImageResult {
  keys: ImageUrls;
  urls: ImageUrls;
}

export interface UploadFileResult {
  key: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export type UploadFolder =
  | 'profiles'
  | 'documents'
  | 'products'
  | 'tasks'
  | 'chats'
  | 'temp'
  | 'bp-profiles';

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT')!;
    const port = this.config.get<string>('MINIO_PORT')!;
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSsl ? 'https' : 'http';

    this.bucket = this.config.get<string>('MINIO_BUCKET')!;

    const accessKeyId = this.config.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretAccessKey = this.config.getOrThrow<string>('MINIO_SECRET_KEY');

    this.client = new S3Client({
      region: 'us-east-1',
      endpoint: `${protocol}://${endpoint}:${port}`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  async deleteImages(keys: string[]): Promise<void> {
    const validKeys: string[] = keys.filter((key: string) => !!key);

    const commands = validKeys.map((key) =>
      this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      ),
    );

    await Promise.all(commands);
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UploadImageResult> {
    if (!file)
      throw new BadRequestException({
        message: 'Rasm yuklanmadi',
        location: 'no_file_uploaded',
      });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      throw new BadRequestException({
        message: 'This file type is not allowed. Allowed file types: jpeg, png, webp.',
        location: 'invalid_file_type',
      });

    return this.uploadImage('profiles', userId, file);
  }

  async uploadBusinessPartnerProfilePicture(
    cardCode: string,
    file: Express.Multer.File,
  ): Promise<UploadImageResult> {
    const safe = cardCode.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!file)
      throw new BadRequestException({
        message: 'Rasm yuklanmadi',
        location: 'no_file_uploaded',
      });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      throw new BadRequestException({
        message: 'This file type is not allowed. Allowed file types: jpeg, png, webp.',
        location: 'invalid_file_type',
      });
    return this.uploadImage('bp-profiles', safe, file);
  }

  async uploadImage(
    folder: UploadFolder,
    entityId: string,
    file: Express.Multer.File,
  ): Promise<UploadImageResult> {
    if (!file) {
      throw new BadRequestException({
        message: 'No file uploaded',
        location: 'no_file_uploaded',
      });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException({
        message: 'This file type is not allowed. Allowed file types: jpeg, png, webp.',
        location: 'invalid_file_type',
      });
    }

    const baseKey = `${folder}/${entityId}/${Date.now()}-${uuidv4().split('-')[0]}`;
    const sizes = { small: 200, medium: 600, large: 1200 } as const;
    const keys: Partial<ImageUrls> = {};

    for (const [size, width] of Object.entries(sizes)) {
      const buffer = await sharp(file.buffer)
        .resize({ width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const key = `${baseKey}-${size}.webp`;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      keys[size as ImageSize] = key;
    }

    const urls: ImageUrls = await this.generateSignedUrls(keys as ImageUrls);
    return { keys: keys as ImageUrls, urls };
  }

  async uploadFile(
    folder: UploadFolder,
    entityId: string,
    file: Express.Multer.File,
    options?: { allowedMimes?: string[]; maxSizeMb?: number },
  ): Promise<UploadFileResult> {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');

    const allowed = options?.allowedMimes ?? [
      // PDF, Excel, Word, ZIP
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowed.includes(file.mimetype))
      throw new BadRequestException(`Ruxsat etilgan formatlar: ${allowed.join(', ')}`);

    if (options?.maxSizeMb && file.size > options.maxSizeMb * 1024 * 1024)
      throw new BadRequestException(`Fayl hajmi ${options.maxSizeMb}MB dan oshmasligi kerak`);

    const ext = extname(file.originalname) || '.bin';
    const key = `${folder}/${entityId}/${Date.now()}-${uuidv4().split('-')[0]}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { originalname: file.originalname },
      }),
    );

    const url = await this.getSignedUrl(key, 60 * 60 * 24); // 24 soat

    return {
      key,
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /** Universal signed URL generator */
  async generateSignedUrls(keys: ImageUrls, expiresIn = 3600): Promise<ImageUrls> {
    const result: Partial<ImageUrls> = {};
    for (const [size, key] of Object.entries(keys)) {
      result[size as ImageSize] = await this.getSignedUrl(key, expiresIn);
    }
    return result as ImageUrls;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url: string = await getSignedUrl(this.client, cmd, { expiresIn });
    return url;
  }

  extractKeyFromUrl(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      return decodeURIComponent(url.pathname.replace(/^\/+/g, ''));
    } catch {
      return fileUrl;
    }
  }
}
