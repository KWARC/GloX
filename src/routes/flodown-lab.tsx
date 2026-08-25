import { initFloDown } from "@/lib/flodownClient";
import { FloDownLabDebugPanel } from "@/components/flodown-lab/FloDownLabDebugPanel";
import {
  LAB_EXPERIMENTS,
  runLabExperiment,
} from "@/components/flodown-lab/experiments";
import { EMPTY_SNAPSHOT, type LabDebugSnapshot } from "@/components/flodown-lab/labTypes";
import {
  listFloDownLabSamples,
  type FloDownLabDbSample,
} from "@/serverFns/flodownLab.server";
import {
  Box,
  Button,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

export const Route = createFileRoute("/flodown-lab")({
  component: FloDownLabPage,
});

function FloDownLabPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const thirdRef = useRef<HTMLDivElement>(null);
  const retainRef = useRef<object[]>([]);
  const [snapshot, setSnapshot] = useState<LabDebugSnapshot>(EMPTY_SNAPSHOT);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);

  const samplesQuery = useQuery({
    queryKey: ["flodown-lab-samples"],
    queryFn: () => listFloDownLabSamples(),
    retry: false,
  });

  const samples = samplesQuery.data ?? [];
  const selectedSample: FloDownLabDbSample | null =
    samples.find((sample) => sample.id === sampleId) ?? null;

  async function run(experimentId: string) {
    const mountEl = mountRef.current;
    const hiddenEl = hiddenRef.current;
    const thirdEl = thirdRef.current;
    if (!mountEl || !hiddenEl || !thirdEl) return;

    setRunningId(experimentId);
    try {
      const floDown = await initFloDown();
      const result = runLabExperiment({
        experimentId,
        floDown,
        mountEl,
        hiddenEl,
        thirdEl,
        retain: retainRef.current as never,
        dbSample: selectedSample,
      });
      // Keep WASM blocks alive (vendor GC unmounts otherwise).
      (window as unknown as { FLODOWN_LAB: object[] }).FLODOWN_LAB =
        retainRef.current;
      setSnapshot(result);
    } catch (error) {
      setSnapshot({
        ...EMPTY_SNAPSHOT,
        experimentId,
        experimentTitle: experimentId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        dbSample: selectedSample,
      });
    } finally {
      setRunningId(null);
    }
  }

  const groups = [...new Set(LAB_EXPERIMENTS.map((item) => item.group))];

  return (
    <Group align="stretch" gap="md" h="100%" wrap="nowrap">
      <Stack gap="sm" style={{ flex: 1, minWidth: 0 }} h="100%">
        <Title order={3}>FloDown lab</Title>
        <Text size="sm" c="dimmed">
          Vendor API only (`fromUri` / `fromPath` / `addElement` /
          `addSymbolDeclaration`). Production preview is not used.
        </Text>

        <Select
          label="DB sample (optional)"
          placeholder="none — vendor fixtures"
          clearable
          searchable
          value={sampleId}
          onChange={setSampleId}
          data={samples.map((sample) => ({
            value: sample.id,
            label: `${sample.kind}: ${sample.label}`,
          }))}
        />

        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap="md">
            {groups.map((group) => (
              <Paper key={group} withBorder p="sm" radius="md">
                <Text fw={600} size="sm" mb="xs">
                  {group}
                </Text>
                <Group gap="xs">
                  {LAB_EXPERIMENTS.filter((item) => item.group === group).map(
                    (item) => (
                      <Button
                        key={item.id}
                        size="compact-sm"
                        variant="light"
                        loading={runningId === item.id}
                        onClick={() => void run(item.id)}
                      >
                        {item.title}
                      </Button>
                    ),
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>

        <Paper withBorder p="sm" radius="md">
          <Text size="xs" fw={600} mb="xs">
            Visible mount
          </Text>
          <Box
            ref={mountRef}
            mih={120}
            p="xs"
            style={{
              background: "var(--mantine-color-gray-0)",
              borderRadius: 8,
            }}
          />
          <Text size="xs" fw={600} mt="sm" mb="xs">
            Second mount (E5/E7; E8 German triangle.de)
          </Text>
          <Box
            ref={hiddenRef}
            mih={40}
            p="xs"
            style={{
              background: "var(--mantine-color-gray-1)",
              borderRadius: 8,
            }}
          />
          <Text size="xs" fw={600} mt="sm" mb="xs">
            Third mount (E8 triangle-sum-of-angles, symref only)
          </Text>
          <Box
            ref={thirdRef}
            mih={40}
            p="xs"
            style={{
              background: "var(--mantine-color-gray-1)",
              borderRadius: 8,
            }}
          />
        </Paper>
      </Stack>

      <Paper
        withBorder
        p="sm"
        radius="md"
        w={420}
        style={{ overflow: "auto" }}
      >
        <FloDownLabDebugPanel snapshot={snapshot} />
      </Paper>
    </Group>
  );
}
