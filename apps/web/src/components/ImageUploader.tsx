'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface UploadedImage {
  publicUrl: string;
  key: string;
  fileName: string;
}

interface PresignedUpload {
  data: {
    uploadUrl: string;
    publicUrl: string;
    key: string;
  };
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error(`Image upload failed with status ${request.status}.`));
      }
    };
    request.onerror = () => reject(new Error('Could not connect to image storage.'));
    request.onabort = () => reject(new Error('Image upload was cancelled.'));
    request.send(file);
  });
}

export function ImageUploader({ images, onChange, onUploadingChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{ fileName: string; percent: number } | null>(null);
  const [error, setError] = useState('');

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setError('');

    if (images.length + files.length > 20) {
      setError('You can upload a maximum of 20 listing images.');
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024
    );
    if (invalidFile) {
      setError('Choose JPEG, PNG, or WebP images no larger than 10 MB each.');
      return;
    }

    setIsUploading(true);
    onUploadingChange(true);
    const completed = [...images];
    try {
      for (const file of files) {
        setProgress({ fileName: file.name, percent: 0 });
        const presigned = await apiFetch<PresignedUpload>('/uploads/presign', {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            folder: 'listings',
          }),
        });
        await uploadFile(presigned.data.uploadUrl, file, (percent) =>
          setProgress({ fileName: file.name, percent })
        );
        completed.push({
          publicUrl: presigned.data.publicUrl,
          key: presigned.data.key,
          fileName: file.name,
        });
      }
      onChange(completed);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
      onChange(completed);
    } finally {
      setIsUploading(false);
      onUploadingChange(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        Listing photos (JPEG, PNG, or WebP; up to 10 MB each)
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={isUploading || images.length >= 20}
        onChange={handleFiles}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
      />
      {progress && (
        <div aria-live="polite" className="text-sm text-slate-600">
          Uploading {progress.fileName} ({progress.percent}%)
          <progress className="block w-full" max={100} value={progress.percent} />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((image) => (
            <div key={image.key} className="relative overflow-hidden rounded-lg border border-slate-200">
              <img src={image.publicUrl} alt={image.fileName} className="h-28 w-full object-cover" />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => onChange(images.filter((item) => item.key !== image.key))}
                className="w-full truncate px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-50"
                aria-label={`Remove ${image.fileName}`}
              >
                Remove · {image.fileName}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
