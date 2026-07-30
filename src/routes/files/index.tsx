import { DocumentsTable } from "@/components/DocumentsTable";
import { DocumentsTableSkeleton } from "@/components/PageSkeletons";
import { currentUser } from "@/server/auth/currentUser";
import { Stack } from "@mantine/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/files/")({
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    return null;
  },
  pendingComponent: () => (
    <Stack p="md">
      <DocumentsTableSkeleton />
    </Stack>
  ),
  pendingMs: 0,
  pendingMinMs: 300,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Stack p="md">
      <DocumentsTable />
    </Stack>
  );
}
