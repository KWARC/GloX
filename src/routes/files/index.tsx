import { DocumentsTable } from "@/components/DocumentsTable";
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
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Stack p="md">
      <DocumentsTable />
    </Stack>
  );
}
