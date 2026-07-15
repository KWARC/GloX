import { getDisplayName, type NamedUser } from "@/hooks/profileUtils";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

type UploadAttributionInfoProps = {
  user: NamedUser;
};

export function UploadAttributionInfo({ user }: UploadAttributionInfoProps) {
  return (
    <Tooltip
      label={
        <Text size="xs">
          Uploaded by {getDisplayName(user)} ({user.email})
        </Text>
      }
      withArrow
    >
      <ActionIcon
        aria-label="Show upload attribution"
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
