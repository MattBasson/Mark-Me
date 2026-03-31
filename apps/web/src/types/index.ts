export interface Assignment {
  id: string;
  title: string;
  subject: string;
  total_marks: number;
  created_at: string;
  questions?: RubricQuestion[];
}

export interface RubricQuestion {
  id?: string;
  question_number: number;
  question_text: string;
  max_marks: number;
  criteria: string[];
  guidance?: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_name?: string;
  student_ref?: string;
  upload_path: string;
  status: "uploaded" | "processing" | "marked" | "approved";
  created_at: string;
}

export interface Mark {
  id: string;
  submission_id: string;
  question_id: string;
  question_number: number;
  question_text: string;
  awarded_marks: number;
  max_marks: number;
  rationale?: string;
  feedback?: string;
  confidence?: number;
  evidence_page?: number;
  teacher_override_marks?: number;
  teacher_override_comment?: string;
  approved: number;
  flagged: number;
}

export interface Page {
  page_number: number;
  url: string;
}

export interface SSEEvent {
  type: "status" | "done" | "error";
  payload: string | { total_marks: number; flagged: number };
}
