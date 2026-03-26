import { Box, Group, Loader } from "@mantine/core";

type ResultsSectionProps = {
  isLoading: boolean;
  children: React.ReactNode;
};

export function ResultsSection({ isLoading, children }: ResultsSectionProps) {
  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: 6,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      {isLoading ? (
        <Group justify="center" p="sm">
          <Loader size="sm" />
        </Group>
      ) : (
        children
      )}
    </Box>
  );
}
