"use client";

import { exportUrl } from "@/lib/api";

export default function ExportButton({ submissionId }: { submissionId: string }) {
  return (
    <a
      href={exportUrl(submissionId)}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
    >
      Export PDF
    </a>
  );
}
