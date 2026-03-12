import IntegrationSettings from "@/components/integrations/IntegrationSettings";

export default function SettingsPage({ params }: { params: { id: string } }) {
  return <IntegrationSettings projectId={params.id} />;
}
