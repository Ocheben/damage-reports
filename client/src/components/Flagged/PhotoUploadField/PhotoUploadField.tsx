"use client";

import { Camera } from "lucide-react";

import { FeatureGate } from "@/lib/flags/FeatureGate";
import { FLAG_KEYS } from "@/lib/flags/types";

import { MAX_PHOTOS, type Photo } from "../constants";
import { usePhotoDraft } from "../hooks/usePhotoDraft";

export function PhotoUploadField({
  value,
  onChange,
}: {
  value: Photo[];
  onChange: (next: Photo[]) => void;
}) {
  const draft = usePhotoDraft({ onCommit: (p) => onChange([...value, p]) });
  const atLimit = value.length >= MAX_PHOTOS;

  return (
    <FeatureGate flag={FLAG_KEYS.reportPhotos}>
      <div className="space-y-3">
        <UploadDropzone
          adding={draft.adding}
          atLimit={atLimit}
          onStart={draft.startAdding}
        >
          {draft.adding && (
            <PhotoDraftForm
              url={draft.url}
              caption={draft.caption}
              onUrlChange={draft.setUrl}
              onCaptionChange={draft.setCaption}
              onCancel={draft.cancel}
              onCommit={draft.commit}
            />
          )}
        </UploadDropzone>

        {value.length > 0 && (
          <PhotoList
            photos={value}
            onRemove={(idx) => onChange(value.filter((_, i) => i !== idx))}
          />
        )}
      </div>
    </FeatureGate>
  );
}

function UploadDropzone({
  adding,
  atLimit,
  onStart,
  children,
}: {
  adding: boolean;
  atLimit: boolean;
  onStart: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
      <Camera className="mx-auto h-6 w-6 text-slate-400" />
      <p className="mt-3 text-sm font-medium text-slate-700">
        Drop photos of the damage here
      </p>
      <p className="mt-1 text-xs text-slate-500">
        JPG, PNG up to 10MB · max {MAX_PHOTOS} files
      </p>
      {!adding && (
        <button type="button" className="btn mt-4" onClick={onStart} disabled={atLimit}>
          Browse files
        </button>
      )}
      {children}
    </div>
  );
}

function PhotoDraftForm({
  url,
  caption,
  onUrlChange,
  onCaptionChange,
  onCancel,
  onCommit,
}: {
  url: string;
  caption: string;
  onUrlChange: (next: string) => void;
  onCaptionChange: (next: string) => void;
  onCancel: () => void;
  onCommit: () => void;
}) {
  return (
    <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 text-left">
      <input
        className="input"
        placeholder="https://… (demo accepts a URL)"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        autoFocus
      />
      <input
        className="input"
        placeholder="Caption (optional)"
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={onCommit} disabled={!url}>
          Add photo
        </button>
      </div>
    </div>
  );
}

function PhotoList({
  photos,
  onRemove,
}: {
  photos: Photo[];
  onRemove: (index: number) => void;
}) {
  return (
    <ul className="space-y-1.5 text-sm">
      {photos.map((p, i) => (
        <PhotoListItem key={i} photo={p} onRemove={() => onRemove(i)} />
      ))}
    </ul>
  );
}

function PhotoListItem({
  photo,
  onRemove,
}: {
  photo: Photo;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className="truncate text-slate-700">{photo.url}</span>
      {photo.caption && (
        <span className="truncate text-xs text-slate-500">— {photo.caption}</span>
      )}
      <button
        type="button"
        className="ml-auto text-xs font-medium text-red-600 hover:underline"
        onClick={onRemove}
      >
        Remove
      </button>
    </li>
  );
}
