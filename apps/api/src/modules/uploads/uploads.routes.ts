import {
  BucketLocationConstraint,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';

const presignSchema = z.object({
  fileName: z.string().trim().min(1).max(255).refine(
    (value) => !/[\\/:*?"<>|\u0000-\u001f]/.test(value),
    'File name contains unsupported characters.'
  ),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  folder: z.enum(['listings', 'kyc']),
});

const extensionByContentType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const isLocalS3Endpoint = ['localhost', '127.0.0.1'].includes(
  new URL(env.S3_ENDPOINT).hostname
);
const regionLocationConstraint = Object.values(BucketLocationConstraint).find(
  (region) => region === env.S3_REGION
);
const s3Client =
  env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
    ? new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: isLocalS3Endpoint ? 'us-east-1' : env.S3_REGION,
        forcePathStyle: true,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      })
    : null;

let bucketSetup: Promise<void> | undefined;

async function ensureMediaBucket(): Promise<S3Client> {
  if (!s3Client) {
    throw new ApiError(503, 'Image storage is not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.');
  }

  if (!bucketSetup) {
    bucketSetup = (async () => {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_MEDIA }));
      } catch (error) {
        const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode;
        const errorName = (error as { name?: string }).name;
        if (statusCode !== 404 && errorName !== 'NotFound' && errorName !== 'NoSuchBucket') {
          throw error;
        }
        if (!isLocalS3Endpoint && !regionLocationConstraint) {
          throw new ApiError(503, `Unsupported S3 bucket region "${env.S3_REGION}".`);
        }
        try {
          await s3Client.send(
            new CreateBucketCommand({
              Bucket: env.S3_BUCKET_MEDIA,
              ...(!isLocalS3Endpoint && regionLocationConstraint
                ? { CreateBucketConfiguration: { LocationConstraint: regionLocationConstraint } }
                : {}),
            })
          );
        } catch (createError) {
          if ((createError as { name?: string }).name !== 'BucketAlreadyOwnedByYou') {
            throw createError;
          }
        }
      }

      const listingReadPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: `arn:aws:s3:::${env.S3_BUCKET_MEDIA}/listings/*`,
          },
        ],
      });
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: env.S3_BUCKET_MEDIA,
          Policy: listingReadPolicy,
        })
      );

      await s3Client.send(
        new PutBucketCorsCommand({
          Bucket: env.S3_BUCKET_MEDIA,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: [...new Set([env.APP_URL, 'http://localhost:3000'])],
                AllowedMethods: ['PUT', 'GET', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        })
      );
    })().catch((error: unknown) => {
      bucketSetup = undefined;
      throw error;
    });
  }

  await bucketSetup;
  return s3Client;
}

function publicUrlFor(key: string): string {
  const baseUrl = (
    env.S3_MEDIA_PUBLIC_URL || `${env.S3_ENDPOINT.replace(/\/+$/, '')}/${env.S3_BUCKET_MEDIA}`
  ).replace(/\/+$/, '');
  return `${baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export const uploadsRouter = Router();

uploadsRouter.post(
  '/presign',
  authenticate,
  authorize('PROVIDER', 'ADMIN'),
  async (req, res, next) => {
    try {
      const { fileName, contentType, folder } = presignSchema.parse(req.body);
      const client = await ensureMediaBucket();
      const baseName = fileName.replace(/\.[^.]+$/, '');
      const safeFileName = baseName.replace(/[^A-Za-z0-9_-]/g, '-').slice(-100) || 'image';
      const key = `${folder}/${req.user!.userId}/${randomUUID()}-${safeFileName}.${extensionByContentType[contentType]}`;
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: env.S3_BUCKET_MEDIA,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: 300 }
      );

      res.json({
        success: true,
        data: { uploadUrl, publicUrl: publicUrlFor(key), key },
      });
    } catch (error) {
      next(error);
    }
  }
);
