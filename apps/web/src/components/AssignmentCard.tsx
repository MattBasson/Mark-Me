"use client";

import { Assignment } from "@/types";
import { deleteAssignment } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AssignmentCard({
  assignment,
  onDeleted,
}: {
  assignment: Assignment;
  onDeleted: () => void;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this assignment and all its rubric questions?")) return;
    await deleteAssignment(assignment.id);
    onDeleted();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-4">
      <div
        className="flex-1 cursor-pointer"
        onClick={() => router.push(`/assignments/${assignment.id}`)}
      >
        <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {assignment.subject} &middot; {assignment.total_marks} marks
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(assignment.created_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="text-xs text-red-500 hover:text-red-700 shrink-0"
      >
        Delete
      </button>
    </div>
  );
}
