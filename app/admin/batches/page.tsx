import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { BatchesTable } from "@/components/admin/batches-table";
import type { Batch } from "@/lib/types";

export default async function BatchesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("batches")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Batches" description="Organize students into cohorts." />
      <BatchesTable batches={(data as Batch[]) ?? []} />
    </div>
  );
}
