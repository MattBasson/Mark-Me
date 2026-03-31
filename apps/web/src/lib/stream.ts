import { SSEEvent } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StreamCallbacks {
  onStatus: (message: string) => void;
  onDone: (payload: { total_marks: number; flagged: number }) => void;
  onError: (message: string) => void;
}

export function streamMark(
  submissionId: string,
  callbacks: StreamCallbacks
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        `${API}/submissions/${submissionId}/mark`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        callbacks.onError(`Failed to start marking: ${res.status}`);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              if (event.type === "status") {
                callbacks.onStatus(event.payload as string);
              } else if (event.type === "done") {
                callbacks.onDone(
                  event.payload as { total_marks: number; flagged: number }
                );
              } else if (event.type === "error") {
                callbacks.onError(event.payload as string);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError(String(err));
      }
    }
  })();

  return () => controller.abort();
}
