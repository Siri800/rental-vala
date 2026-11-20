'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export function CategoryImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div
        className="flex h-28 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400"
        aria-label={`${alt} image unavailable`}
      >
        <ImageOff className="h-7 w-7" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src ?? ''}
      alt={alt}
      className="h-28 w-full rounded-xl object-cover"
      onError={() => setFailed(true)}
    />
  );
}
