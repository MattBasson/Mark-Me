"use client";

import { useState } from "react";
import { Mark } from "@/types";
import { updateMark } from "@/lib/api";
import clsx from "clsx";

interface Props {
  mark: Mark;
  onUpdated: () => void;
}

function confidencePill(confidence?: number) {
  if (confidence === undefined) return null;
  const pct = Math.round(confidence * 100);
  const colour =
    confidence >= 0.75
      ? "bg-green-100 text-green-700"
      : confidence >= 0.5
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", colour)}>
      {pct}%
    </span>
  );
}

export default function MarkRow({ mark, onUpdated }: Props) {
  const displayMark =
    mark.teacher_override_marks ?? mark.awarded_marks ?? 0;
  const displayComment =
    mark.teacher_override_comment ?? mark.feedback ?? "";

  const [editMark, setEditMark] = useState(displayMark);
  const [editComment, setEditComment] = useState(displayComment);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMark(mark.submission_id, mark.id, {
        awarded_marks: editMark,
        teacher_override_comment: editComment,
      });
      onUpdated();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={clsx(
        "border rounded-lg p-4 space-y-2",
        mark.flagged && !mark.approved
          ? "border-yellow-300 bg-yellow-50"
          : "border-gray-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500">
            Q{mark.question_number}
          </p>
          <p className="text-sm text-gray-800 mt-0.5">{mark.question_text}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mark.flagged ? (
            <span className="text-xs text-yellow-600 font-medium">⚠ Low confidence</span>
          ) : null}
          {confidencePill(mark.confidence)}
          {mark.approved ? (
            <span className="text-xs text-green-600 font-medium">✓ Approved</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 w-16 shrink-0">Mark</label>
        <input
          type="number"
          min={0}
          max={mark.max_marks}
          value={editMark}
          onChange={(e) => {
            setEditMark(Number(e.target.value));
            setDirty(true);
          }}
          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <span className="text-xs text-gray-400">/ {mark.max_marks}</span>
      </div>

      <div>
        <label className="text-xs text-gray-500">Feedback comment</label>
        <textarea
          rows={2}
          value={editComment}
          onChange={(e) => {
            setEditComment(e.target.value);
            setDirty(true);
          }}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
        />
      </div>

      {mark.rationale && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">
            AI rationale
          </summary>
          <p className="mt-1 pl-2 border-l-2 border-gray-200">{mark.rationale}</p>
        </details>
      )}

      {dirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
