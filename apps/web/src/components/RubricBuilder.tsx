"use client";

import { useState } from "react";
import { createAssignment, upsertRubric } from "@/lib/api";
import { RubricQuestion } from "@/types";

interface Props {
  onCreated: (id: string) => void;
  onCancel: () => void;
}

export default function RubricBuilder({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [totalMarks, setTotalMarks] = useState(10);
  const [questions, setQuestions] = useState<RubricQuestion[]>([
    { question_number: 1, question_text: "", max_marks: 1, criteria: [""] },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        question_number: prev.length + 1,
        question_text: "",
        max_marks: 1,
        criteria: [""],
      },
    ]);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((q, idx) => ({ ...q, question_number: idx + 1 }))
    );
  }

  function updateQuestion(i: number, patch: Partial<RubricQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function addCriterion(qi: number) {
    updateQuestion(qi, { criteria: [...questions[qi].criteria, ""] });
  }

  function updateCriterion(qi: number, ci: number, value: string) {
    const criteria = [...questions[qi].criteria];
    criteria[ci] = value;
    updateQuestion(qi, { criteria });
  }

  function removeCriterion(qi: number, ci: number) {
    updateQuestion(qi, {
      criteria: questions[qi].criteria.filter((_, i) => i !== ci),
    });
  }

  async function handleSave() {
    if (!title || !subject) {
      setError("Title and subject are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { id } = await createAssignment({ title, subject, total_marks: totalMarks });
      await upsertRubric(id, questions);
      onCreated(id);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold mb-4">New Assignment</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Title</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Test"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Subject</label>
            <input
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Total Marks</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
            />
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-2">Rubric Questions</h3>
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-500 w-6">Q{q.question_number}</span>
                <input
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  value={q.question_text}
                  onChange={(e) => updateQuestion(qi, { question_text: e.target.value })}
                  placeholder="Question text"
                />
                <input
                  type="number"
                  min={1}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                  value={q.max_marks}
                  onChange={(e) => updateQuestion(qi, { max_marks: Number(e.target.value) })}
                />
                <span className="text-xs text-gray-400">marks</span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="pl-8 space-y-1">
                <p className="text-xs text-gray-500 mb-1">Criteria:</p>
                {q.criteria.map((c, ci) => (
                  <div key={ci} className="flex gap-2">
                    <input
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs"
                      value={c}
                      onChange={(e) => updateCriterion(qi, ci, e.target.value)}
                      placeholder={`Criterion ${ci + 1}`}
                    />
                    {q.criteria.length > 1 && (
                      <button
                        onClick={() => removeCriterion(qi, ci)}
                        className="text-xs text-red-400"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addCriterion(qi)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                >
                  + criterion
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
        >
          + Add question
        </button>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
