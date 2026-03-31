"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import ScanUploader from "@/components/ScanUploader";

function UploadContent() {
  const params = useSearchParams();
  const router = useRouter();
  const assignmentId = params.get("assignment");

  if (!assignmentId) {
    return (
      <p className="text-red-500 text-sm">
        No assignment specified. Go back and try again.
      </p>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => router.push(`/assignments/${assignmentId}`)}
        className="text-sm text-gray-500 hover:text-indigo-600 mb-6 inline-flex items-center gap-1"
      >
        ← Back to assignment
      </button>
      <h1 className="text-2xl font-bold mb-6">Upload Scans</h1>
      <ScanUploader assignmentId={assignmentId} />
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 text-sm">Loading…</p>}>
      <UploadContent />
    </Suspense>
  );
}
