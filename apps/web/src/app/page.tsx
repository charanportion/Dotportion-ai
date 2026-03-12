import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = auth();
  if (userId) redirect("/projects");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-zinc-200 px-8 py-4 flex items-center justify-between">
        <span className="font-semibold text-zinc-950 text-lg">Product Intelligence AI</span>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 border border-zinc-200 rounded-full px-4 py-1.5 text-xs text-zinc-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 inline-block" />
            Cursor for Product Managers
          </div>

          <h1 className="text-5xl font-bold text-zinc-950 leading-tight mb-6">
            Turn feedback into
            <br />
            product decisions
          </h1>

          <p className="text-lg text-zinc-500 mb-10 leading-relaxed">
            Upload customer feedback. AI detects user problems, suggests features,
            generates PRDs, and explains decisions through chat.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="bg-zinc-950 text-white px-6 py-3 rounded-md font-medium hover:bg-zinc-800"
            >
              Start for free
            </Link>
            <Link
              href="/sign-in"
              className="border border-zinc-200 text-zinc-700 px-6 py-3 rounded-md font-medium hover:bg-zinc-50"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-4 mt-20 max-w-3xl w-full">
          {[
            { label: "Upload feedback", desc: "CSV, text, or paste directly" },
            { label: "AI detects problems", desc: "Clustered by semantic similarity" },
            { label: "Generate PRD", desc: "One click to full product spec" },
          ].map((f) => (
            <div
              key={f.label}
              className="border border-zinc-200 rounded-lg p-6 text-left"
            >
              <h3 className="font-semibold text-zinc-950 text-sm mb-1">{f.label}</h3>
              <p className="text-xs text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
