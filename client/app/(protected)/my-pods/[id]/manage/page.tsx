import AdminPodGuard from "@/components/pods/AdminPodGuard";
import { getPod } from "@/lib/fetchers";
import type { Pod } from "@/components/pods/AdminPodClient";

async function ManagePodPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const pod = await getPod<Pod>(id);

  return <AdminPodGuard pod={pod} />;
}

export default ManagePodPage;
