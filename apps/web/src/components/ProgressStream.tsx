"use client";

import { useEffect, useRef, useState } from "react";
import { streamMark } from "@/lib/stream";

interface Props {
  submissionId: string;
  onDone: (payload: { total_marks: number; flagged: number }) => void;
  onError: (msg: string) => void;
}

export default function ProgressStream({ submissionId, onDone, onError }: Props) {
  const [messages, setMessages] = useState<string[]>([]);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const stop = streamMark(submissionId, {
      onStatus: (msg) => setMessages((prev) => [...prev, msg]),
      onDone,
      onError,
    });
    stopRef.current = stop;
    return () => stop();
  }, [submissionId]);

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-indigo-600 mb-2">Marking in progress…</p>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {messages.map((m, i) => (
          <p key={i} className="text-xs text-indigo-700">
            {m}
          </p>
        ))}
        {messages.length === 0 && (
          <p className="text-xs text-indigo-400 animate-pulse">Starting…</p>
        )}
      </div>
    </div>
  );
}
