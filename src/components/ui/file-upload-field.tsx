"use client";

import Image from "next/image";
import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { uploadMasterImage } from "@/lib/supabase/storage-upload";

export function FileUploadField({
  label,
  hint,
  accept = "image/png,image/jpeg,image/jpg,image/gif,image/webp",
  value,
  onChange,
  previewWide,
  required,
  disabled,
  folder = "covers",
}: {
  label: string;
  hint?: string;
  accept?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  previewWide?: boolean;
  required?: boolean;
  disabled?: boolean;
  folder?: string;
}) {
  const { show } = useToast();
  const [uploading, setUploading] = useState(false);
  const isImageAccept = accept.includes("image/");

  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {hint && <p className="mt-1 text-xs text-red-600">{hint}</p>}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
        <label
          className={cn(
            "inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700",
            disabled || uploading
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:bg-stone-50"
          )}
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </span>
          ) : (
            "Choose File"
          )}
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              if (disabled || uploading) return;
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              if (!isImageAccept) {
                const reader = new FileReader();
                reader.onload = () => onChange(reader.result as string);
                reader.readAsDataURL(file);
                return;
              }
              setUploading(true);
              void uploadMasterImage(file, folder)
                .then((url) => onChange(url))
                .catch((err) => {
                  const message =
                    err instanceof Error ? err.message : "Image upload failed";
                  show(message);
                })
                .finally(() => setUploading(false));
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            className="text-xs text-stone-500 underline"
            onClick={() => onChange(null)}
          >
            Remove
          </button>
        )}
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-200 bg-stone-50",
            previewWide ? "h-12 min-w-[170px] px-3" : "h-16 w-16"
          )}
        >
          {value ? (
            <Image
              src={value}
              alt=""
              width={previewWide ? 170 : 64}
              height={previewWide ? 36 : 64}
              unoptimized
              className={cn("object-contain", previewWide ? "max-h-10 w-auto" : "h-14 w-14")}
            />
          ) : (
            <span className="text-xs text-stone-400">No file</span>
          )}
        </div>
      </div>
    </div>
  );
}

function fileLabelFromValue(value: string | null): string {
  if (!value) return "";
  if (value.startsWith("data:")) return "Uploaded file";
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
}

export function PdfUploadField({
  label,
  hint,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {hint && <p className="mt-1 text-xs text-red-600">{hint}</p>}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
          Choose PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onChange(reader.result as string);
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button type="button" className="text-xs text-stone-500 underline" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2">
          <FileText className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="truncate text-sm text-stone-600">
            {value ? fileLabelFromValue(value) : "No PDF uploaded"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CoverImageUploadField({
  label,
  hint,
  value,
  onChange,
  required,
  disabled,
  folder = "hotels",
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  folder?: string;
}) {
  return (
    <FileUploadField
      label={label}
      hint={hint}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      folder={folder}
      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
    />
  );
}
