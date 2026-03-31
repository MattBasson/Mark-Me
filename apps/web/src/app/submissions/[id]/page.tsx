"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { getSubmission } from "@/lib/api";
import { Submission } from "@/types";
import ReviewWorkspace from "@/components/ReviewWorkspace";

export default function SubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: submission } = useSWR<Submission>(
    `submission-nav:${id}`,
    () => getSubmission(id)
  );

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-3">
        <button
          onClick={() =>
            router.push(
              submission?.assignment_id
                ? `/assignments/${submission.assignment_id}`
                : "/assignments"
            )
          }
          className="text-sm text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1"
        >
          ← Back to assignment
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ReviewWorkspace submissionId={id} />
      </div>
    </div>
  );
}
