"use client";

import { useState } from "react";
import useSWR from "swr";
import { getAssignments } from "@/lib/api";
import { Assignment } from "@/types";
import AssignmentCard from "@/components/AssignmentCard";
import RubricBuilder from "@/components/RubricBuilder";
import { useRouter } from "next/navigation";

export default function AssignmentsPage() {
  const router = useRouter();
  const { data, mutate } = useSWR<Assignment[]>("assignments", getAssignments);
  const [showBuilder, setShowBuilder] = useState(false);

  function handleCreated(id: string) {
    setShowBuilder(false);
    mutate();
    router.push(`/assignments/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          + New Assignment
        </button>
      </div>

      {!data && <p className="text-gray-400 text-sm">Loading…</p>}
      {data && data.length === 0 && (
        <p className="text-gray-400 text-sm">
          No assignments yet. Create one to get started.
        </p>
      )}
      <div className="space-y-3">
        {data?.map((a) => (
          <AssignmentCard key={a.id} assignment={a} onDeleted={mutate} />
        ))}
      </div>

      {showBuilder && (
        <RubricBuilder
          onCreated={handleCreated}
          onCancel={() => setShowBuilder(false)}
        />
      )}
    </div>
  );
}
