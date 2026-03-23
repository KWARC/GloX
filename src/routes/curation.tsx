import { CurationSection } from "@/components/CurationSection";
import { adminUser } from "@/server/auth/isAdmin";
import { Box, Stack } from "@mantine/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

export type DefinitionStatus =
  | "EXTRACTED"
  | "FINALIZED_IN_FILE"
  | "SUBMITTED_TO_MATHHUB"
  | "DISCARDED";

export const Route = createFileRoute("/curation")({
  loader: async () => {
    const user = await adminUser();

    if (!user.loggedIn || !user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [curationLevel, setCurationLevel] = useState<DefinitionStatus | null>(
    null,
  );

  return (
    <Box
      w="100%"
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <Stack w="100%" maw={1200} gap="xl">
        <CurationSection
          curationLevel={curationLevel}
          setCurationLevel={setCurationLevel}
        />
      </Stack>
    </Box>
  );
}
