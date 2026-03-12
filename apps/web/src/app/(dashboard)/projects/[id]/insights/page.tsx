import InsightsDashboard from "@/components/insights/InsightsDashboard";

export default function InsightsPage({ params }: { params: { id: string } }) {
  return <InsightsDashboard projectId={params.id} />;
}
