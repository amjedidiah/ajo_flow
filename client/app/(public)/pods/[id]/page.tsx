import { getPod } from "@/lib/fetchers";
import PodHeroHeader, { Pod } from "@/components/pods/PodHeroHeader";
import PodDetailClient from "@/components/pods/PodDetailClient";

async function PodPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const pod = await getPod<Pod>(id);

  return (
    <main className="min-h-screen">
      <PodHeroHeader
        pod={pod}
        podsLink={{ href: "/pods", text: "Back to pods" }}
      />
      <PodDetailClient pod={pod} variant="public" />
    </main>
  );
}

export default PodPage;
