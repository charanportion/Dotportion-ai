import FeatureDetail from "@/components/features/FeatureDetail";

export default function FeaturePage({ params }: { params: { id: string } }) {
  return <FeatureDetail featureId={params.id} />;
}
