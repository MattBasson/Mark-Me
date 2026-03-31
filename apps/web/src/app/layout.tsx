import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mark-Me",
  description: "AI-powered marking copilot for teachers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <a href="/assignments" className="font-bold text-lg text-indigo-600">
            Mark-Me
          </a>
          <a
            href="/assignments"
            className="text-sm text-gray-600 hover:text-indigo-600"
          >
            Assignments
          </a>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
