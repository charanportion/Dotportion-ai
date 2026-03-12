import FeedbackUpload from "@/components/upload/FeedbackUpload";

export default function UploadPage({ params }: { params: { id: string } }) {
  return <FeedbackUpload projectId={params.id} />;
}
