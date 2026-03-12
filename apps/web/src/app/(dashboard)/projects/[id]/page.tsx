import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import ProjectDetail from "@/components/projects/ProjectDetail";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <ProjectDetail projectId={params.id} />;
}
