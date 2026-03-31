"use client";

import { useRef, useState } from "react";
import { uploadSubmission } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ScanUploader({ assignmentId }: { assignmentId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { id } = await uploadSubmission(assignmentId, file);
      router.push(`/submissions/${id}`);
    } catch (e) {
      setError(String(e));
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
          dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-300"
        }`}
      >
        {uploading ? (
          <p className="text-gray-500 text-sm">Uploading and processing pages…</p>
        ) : (
          <>
            <p className="text-4xl mb-3">📄</p>
            <p className="font-medium text-gray-700">
              Drop a scan here or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">JPG, PNG or PDF</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
      )}
    </div>
  );
}
