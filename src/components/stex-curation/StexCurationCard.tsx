import { Paper, Stack } from "@mantine/core";

export type StexCurationCardProps = {
  children: React.ReactNode;
};

export function StexCurationCard({ children }: StexCurationCardProps) {
  return (
    <Paper
      withBorder
      p={0}
      radius="md"
      style={{
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "box-shadow 150ms ease, border-color 150ms ease",
      }}
      styles={{
        root: {
          "&:hover": {
            boxShadow: "var(--mantine-shadow-sm)",
            borderColor: "var(--mantine-color-gray-4)",
          },
        },
      }}
    >
      <Stack gap={0} style={{ height: "100%" }}>
        {children}
      </Stack>
    </Paper>
  );
}
