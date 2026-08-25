import type { LabDebugSnapshot } from "./labTypes";
import { Code, Stack, Text } from "@mantine/core";

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={600}>
        {label}
      </Text>
      <Code
        block
        style={{
          maxHeight: 220,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          fontSize: 11,
        }}
      >
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </Code>
    </Stack>
  );
}

export function FloDownLabDebugPanel({ snapshot }: { snapshot: LabDebugSnapshot }) {
  return (
    <Stack gap="sm">
      <Text size="sm" fw={700}>
        Debug
      </Text>
      <Text size="xs" c={snapshot.ok ? "green" : "red"}>
        {snapshot.experimentId
          ? `${snapshot.ok ? "PASS" : "FAIL"} — ${snapshot.experimentTitle}`
          : "Run an experiment"}
      </Text>
      {snapshot.error ? (
        <Code block c="red" style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>
          {snapshot.error}
        </Code>
      ) : null}
      <Text size="xs">{snapshot.notes}</Text>
      <JsonBlock label="URI created (fromUri / fromPath)" value={{
        documentUriCreated: snapshot.documentUriCreated,
        fromPathArgs: snapshot.fromPathArgs,
        getUriAfterCreate: snapshot.getUriAfterCreate,
        declaredSymbolUris: snapshot.declaredSymbolUris,
        isModule: snapshot.isModule,
      }} />
      <JsonBlock label="DB entry" value={snapshot.dbSample} />
      <JsonBlock label="URIs found in DB statement" value={snapshot.dbInlineUris} />
      <JsonBlock label="Replaced DB URIs" value={snapshot.replacedUris} />
      <JsonBlock label="addElement payload" value={snapshot.addElementPayload} />
      <JsonBlock label="getStex()" value={snapshot.stex} />
      <JsonBlock label="getFtml()" value={snapshot.ftml} />
    </Stack>
  );
}
