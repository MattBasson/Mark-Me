import { Assignment, Mark, Page, RubricQuestion, Submission } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// Assignments
export const getAssignments = () => request<Assignment[]>("/assignments");

export const getAssignment = (id: string) =>
  request<Assignment>(`/assignments/${id}`);

export const createAssignment = (data: {
  title: string;
  subject: string;
  total_marks: number;
}) =>
  request<{ id: string }>("/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const upsertRubric = (id: string, questions: RubricQuestion[]) =>
  request<{ ok: boolean }>(`/assignments/${id}/rubric`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questions),
  });

export const deleteAssignment = (id: string) =>
  request<{ ok: boolean }>(`/assignments/${id}`, { method: "DELETE" });

// Submissions
export const uploadSubmission = (assignmentId: string, file: File) => {
  const form = new FormData();
  form.append("assignment_id", assignmentId);
  form.append("file", file);
  return request<{ id: string; page_count: number }>("/submissions/upload", {
    method: "POST",
    body: form,
  });
};

export const listSubmissions = (assignmentId?: string) =>
  request<Submission[]>(
    `/submissions${assignmentId ? `?assignment_id=${assignmentId}` : ""}`
  );

export const getSubmission = (id: string) =>
  request<Submission>(`/submissions/${id}`);

export const getPages = (submissionId: string) =>
  request<Page[]>(`/submissions/${submissionId}/pages`);

export const getMarks = (submissionId: string) =>
  request<Mark[]>(`/submissions/${submissionId}/marks`);

export const updateMark = (
  submissionId: string,
  markId: string,
  data: { awarded_marks?: number; teacher_override_comment?: string }
) =>
  request<{ ok: boolean }>(`/submissions/${submissionId}/marks/${markId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const approveSubmission = (submissionId: string) =>
  request<{ ok: boolean }>(`/submissions/${submissionId}/approve`, {
    method: "POST",
  });

export const exportUrl = (submissionId: string) =>
  `${API}/submissions/${submissionId}/export`;
