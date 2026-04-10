import SeasonDetailClient from "../SeasonDetailClient";

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;

  return <SeasonDetailClient seasonId={seasonId} />;
}
