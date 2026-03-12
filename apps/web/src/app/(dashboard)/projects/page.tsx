import Link from "next/link";
import ProjectsList from "@/components/projects/ProjectsList";

export default function ProjectsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create a project and upload customer feedback to get started.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800"
        >
          New project
        </Link>
      </div>

      {/* Projects list — client component handles data */}
      <ProjectsList />
    </div>
  );
}
