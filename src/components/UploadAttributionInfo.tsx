import { getDisplayName, type NamedUser } from "@/hooks/profileUtils";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

type UploadAttributionInfoProps = {
  attributions: Array<{ label: string; user: NamedUser }>;
};

export function UploadAttributionInfo({ attributions }: UploadAttributionInfoProps) {
  return (
    <Tooltip
      label={
        <>
          {attributions.map(({ label, user }) => (
            <Text key={label} size="xs">
              {label} {getDisplayName(user)} ({user.email})
            </Text>
          ))}
        </>
      }
      withArrow
    >
      <ActionIcon
        aria-label="Show attribution"
        variant="subtle"
        color="gray"
        size="sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <IconInfoCircle size={17} />
      </ActionIcon>
    </Tooltip>
  );
}
