import {
  duplicateOfLabel,
  formatDuplicateCountLabel,
  listedDuplicatePeers,
  MAX_LISTED_DUPLICATE_PEERS,
} from "@/lib/moduleDuplicateHintDisplay";
import { ActionIcon, Anchor, Group, Text, Tooltip } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Copy, Database } from "lucide-react";

type Peer = {
  moduleId: string;
  extracted?: boolean;
  duplicateOfModuleId?: string | null;
};

type ModuleDuplicateHintProps = {
  exact: readonly Peer[];
  near: readonly Peer[];
};

function ModuleIdLink({ moduleId }: { moduleId: string }) {
  return (
    <Link to="/module-description/$moduleId" params={{ moduleId }}>
      {moduleId}
    </Link>
  );
}

function PeerStatusIcon({
  extracted,
  duplicateOfModuleId,
}: {
  extracted: boolean;
  duplicateOfModuleId: string | null;
}) {
  if (duplicateOfModuleId) {
    return (
      <DuplicateOfIconLink duplicateOfModuleId={duplicateOfModuleId} compact />
    );
  }
  if (extracted) {
    return <Database size={12} aria-label="Extracted" />;
  }
  return null;
}

export function ModuleDuplicateHint({ exact, near }: ModuleDuplicateHintProps) {
  const label = formatDuplicateCountLabel(exact.length, near.length);
  if (!label) return null;

  const extractedIds = new Set(
    [...exact, ...near]
      .filter((peer) => peer.extracted)
      .map((peer) => peer.moduleId),
  );
  const listed = listedDuplicatePeers(exact, near, extractedIds);
  const visible = listed.slice(0, MAX_LISTED_DUPLICATE_PEERS);
  const truncated = listed.length > MAX_LISTED_DUPLICATE_PEERS;

  return (
    <Group gap={6} wrap="wrap" align="center">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Group gap={6} wrap="wrap" align="center">
        <Text size="xs" c="dimmed" span>
          (
        </Text>
        {visible.map((peer, index) => {
          const needsComma = index < visible.length - 1 || truncated;
          return (
            <Group key={peer.moduleId} gap={4} wrap="nowrap" align="center">
              {peer.extracted ? (
                <Text size="xs" span>
                  <ModuleIdLink moduleId={peer.moduleId} />
                </Text>
              ) : (
                <Text size="xs" c="dimmed" span>
                  {peer.moduleId}
                </Text>
              )}
              <PeerStatusIcon
                extracted={peer.extracted}
                duplicateOfModuleId={peer.duplicateOfModuleId}
              />
              {needsComma ? (
                <Text size="xs" c="dimmed" span>
                  ,
                </Text>
              ) : null}
            </Group>
          );
        })}
        {truncated ? (
          <Text size="xs" c="dimmed" span>
            …
          </Text>
        ) : null}
        <Text size="xs" c="dimmed" span>
          )
        </Text>
      </Group>
    </Group>
  );
}

export function MarkedDuplicateOf({ moduleId }: { moduleId: string }) {
  return (
    <Text size="sm">
      Marked duplicate of <ModuleIdLink moduleId={moduleId} />
    </Text>
  );
}

export function DuplicateOfIconLink({
  duplicateOfModuleId,
  compact = false,
}: {
  duplicateOfModuleId: string;
  compact?: boolean;
}) {
  const label = duplicateOfLabel(duplicateOfModuleId);
  return (
    <Tooltip label={label} withArrow>
      <Link
        to="/module-description/$moduleId"
        params={{ moduleId: duplicateOfModuleId }}
        aria-label={label}
      >
        {compact ? (
          <Copy size={12} />
        ) : (
          <ActionIcon variant="subtle" color="orange" size="sm" component="span">
            <Copy size={14} />
          </ActionIcon>
        )}
      </Link>
    </Tooltip>
  );
}

export function ModuleIdWithDuplicateIcon({
  moduleId,
  duplicateOfModuleId,
  extracted = false,
}: {
  moduleId: string;
  duplicateOfModuleId?: string | null;
  extracted?: boolean;
}) {
  return (
    <Group gap={6} wrap="nowrap" align="center">
      <ModuleIdLink moduleId={moduleId} />
      {duplicateOfModuleId ? (
        <DuplicateOfIconLink duplicateOfModuleId={duplicateOfModuleId} />
      ) : extracted ? (
        <Tooltip label="Extracted" withArrow>
          <span style={{ display: "inline-flex" }}>
            <Database size={14} aria-label="Extracted" />
          </span>
        </Tooltip>
      ) : null}
    </Group>
  );
}

function SelectableModuleIds({
  ids,
  onSelect,
}: {
  ids: readonly string[];
  onSelect: (moduleId: string) => void;
}) {
  return (
    <>
      {ids.map((id, index) => (
        <Text key={id} span>
          {index > 0 ? ", " : null}
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={() => onSelect(id)}
          >
            {id}
          </Anchor>
        </Text>
      ))}
    </>
  );
}

export function PotentialDuplicateTargets({
  exactIds,
  nearIds,
  onSelect,
}: {
  exactIds: readonly string[];
  nearIds: readonly string[];
  onSelect: (moduleId: string) => void;
}) {
  if (exactIds.length === 0 && nearIds.length === 0) return null;

  return (
    <Text size="sm" mb="md">
      Potential duplicates:{" "}
      {exactIds.length > 0 ? (
        <>
          Exact (
          <SelectableModuleIds ids={exactIds} onSelect={onSelect} />)
        </>
      ) : null}
      {exactIds.length > 0 && nearIds.length > 0 ? " " : null}
      {nearIds.length > 0 ? (
        <>
          Near (
          <SelectableModuleIds ids={nearIds} onSelect={onSelect} />)
        </>
      ) : null}
    </Text>
  );
}
