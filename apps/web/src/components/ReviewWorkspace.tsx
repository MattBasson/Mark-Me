"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { getMarks, getPages, getSubmission, approveSubmission } from "@/lib/api";
import { Mark, Page, Submission } from "@/types";
import MarkRow from "./MarkRow";
import ProgressStream from "./ProgressStream";
import ExportButton from "./ExportButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReviewWorkspace({ submissionId }: { submissionId: string }) {
  const [marking, setMarking] = useState(false);
  const [markingError, setMarkingError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: submission, mutate: mutateSubmission } = useSWR<Submission>(
    `submission:${submissionId}`,
    () => getSubmission(submissionId)
  );
  const { data: pages } = useSWR<Page[]>(
    `pages:${submissionId}`,
    () => getPages(submissionId)
  );
  const { data: marks, mutate: mutateMarks } = useSWR<Mark[]>(
    `marks:${submissionId}`,
    () => getMarks(submissionId)
  );

  const handleMarkingDone = useCallback(
    (_payload: { total_marks: number; flagged: number }) => {
      setMarking(false);
      mutateMarks();
      mutateSubmission();
    },
    [mutateMarks, mutateSubmission]
  );

  const handleMarkingError = useCallback((msg: string) => {
    setMarking(false);
    setMarkingError(msg);
  }, []);

  async function handleApprove() {
    if (!confirm("Approve all marks? This cannot be undone.")) return;
    setApproving(true);
    try {
      await approveSubmission(submissionId);
      mutateMarks();
      mutateSubmission();
    } finally {
      setApproving(false);
    }
  }

  const totalAwarded = marks?.reduce((sum, m) => {
    return sum + (m.teacher_override_marks ?? m.awarded_marks ?? 0);
  }, 0);
  const totalMax = marks?.reduce((sum, m) => sum + m.max_marks, 0);
  const allApproved = marks && marks.length > 0 && marks.every((m) => m.approved);
  const pageUrl =
    pages && pages.length > 0
      ? `${API}${pages.find((p) => p.page_number === currentPage)?.url ?? pages[0].url}`
      : null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">
            {submission?.student_name || "Unknown Student"}
          </h1>
          {marks && marks.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              Total: {totalAwarded} / {totalMax} marks
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {submission?.status !== "approved" && (
            <button
              onClick={() => {
                setMarkingError(null);
                setMarking(true);
              }}
              disabled={marking}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {marking ? "Marking…" : "Start Marking"}
            </button>
          )}
          {marks && marks.length > 0 && !allApproved && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {approving ? "Approving…" : "Approve All"}
            </button>
          )}
          {allApproved && <ExportButton submissionId={submissionId} />}
        </div>
      </div>

      {markingError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Marking error: {markingError}
        </div>
      )}

      {marking && (
        <div className="mb-4">
          <ProgressStream
            submissionId={submissionId}
            onDone={handleMarkingDone}
            onError={handleMarkingError}
          />
        </div>
      )}

      {/* Split pane */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: scan viewer */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-100 flex flex-col">
          {pageUrl ? (
            <>
              <img
                src={pageUrl}
                alt={`Page ${currentPage}`}
                className="flex-1 object-contain w-full"
              />
              {pages && pages.length > 1 && (
                <div className="flex items-center justify-center gap-4 py-2 bg-white border-t border-gray-200">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-sm text-gray-500 disabled:opacity-30 hover:text-indigo-600"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-gray-400">
                    {currentPage} / {pages.length}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pages.length, p + 1))
                    }
                    disabled={currentPage === pages.length}
                    className="text-sm text-gray-500 disabled:opacity-30 hover:text-indigo-600"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No pages available
            </div>
          )}
        </div>

        {/* Right: marks */}
        <div className="overflow-y-auto space-y-3">
          {!marks || marks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-12">
              {marking
                ? "Marking in progress…"
                : "Press "Start Marking" to begin."}
            </p>
          ) : (
            marks.map((m) => (
              <MarkRow
                key={m.id}
                mark={m}
                onUpdated={() => mutateMarks()}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
