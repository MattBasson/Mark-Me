"use client";

import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { getAssignment, listSubmissions } from "@/lib/api";
import { Assignment, Submission } from "@/types";
import clsx from "clsx";

const statusColour: Record<Submission["status"], string> = {
  uploaded: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  marked: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
};

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: assignment } = useSWR<Assignment>(`assignment:${id}`, () =>
    getAssignment(id)
  );
  const { data: submissions } = useSWR<Submission[]>(
    `submissions:${id}`,
    () => listSubmissions(id)
  );

  if (!assignment) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push("/assignments")}
        className="text-sm text-gray-500 hover:text-indigo-600 mb-4 inline-flex items-center gap-1"
      >
        ← Assignments
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {assignment.subject} &middot; {assignment.total_marks} marks total
          </p>
        </div>
        <button
          onClick={() => router.push(`/upload?assignment=${id}`)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          Upload Scans
        </button>
      </div>

      {/* Rubric */}
      {assignment.questions && assignment.questions.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-sm text-gray-700 mb-3">Rubric</h2>
          <div className="space-y-3">
            {assignment.questions.map((q) => (
              <div
                key={q.question_number}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm">
                    Q{q.question_number}. {q.question_text}
                  </p>
                  <span className="text-xs text-gray-500 shrink-0 ml-4">
                    {q.max_marks}m
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {q.criteria.map((c, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-300">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submissions */}
      <section>
        <h2 className="font-semibold text-sm text-gray-700 mb-3">
          Submissions ({submissions?.length ?? 0})
        </h2>
        {submissions && submissions.length === 0 && (
          <p className="text-sm text-gray-400">
            No submissions yet. Upload scans to get started.
          </p>
        )}
        <div className="space-y-2">
          {submissions?.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/submissions/${s.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-indigo-300"
            >
              <div>
                <p className="text-sm font-medium">
                  {s.student_name || "Unknown student"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={clsx(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  statusColour[s.status]
                )}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
