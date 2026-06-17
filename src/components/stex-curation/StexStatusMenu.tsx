import { Button, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import { StexStatus } from "./useStexCurationData";

type StatusConf = {
  color: string;
  label: string;
};

export type StexStatusMenuProps = {
  status: {
    value: StexStatus;
    conf: StatusConf;
    discardReasonFromServer: string | null;
  };
  actions: {
    onStatusChange: (
      status: "EXTRACTED" | "FINALIZED_IN_FILE" | "SUBMITTED_TO_MATHHUB",
    ) => void;
    onOpenDiscard: () => void;
  };
};

export function StexStatusMenu({ status, actions }: StexStatusMenuProps) {
  const button = (
    <Button
      size="xs"
      variant="light"
      color={status.conf.color}
      rightSection={<ChevronDown size={12} />}
      styles={{ section: { marginLeft: 4 } }}
    >
      {status.conf.label}
    </Button>
  );

  return (
    <Menu shadow="md" width={230} position="bottom-end">
      <Menu.Target>
        {status.value === "DISCARDED" ? (
          <Tooltip
            withArrow
            multiline
            w={260}
            label={
              <Stack gap={2}>
                <Text fw={600} size="xs">
                  Discarded
                </Text>
                <Text size="xs">
                  Reason: {status.discardReasonFromServer || "Not specified"}
                </Text>
              </Stack>
            }
          >
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Status Actions</Menu.Label>
        <Menu.Item onClick={() => actions.onStatusChange("EXTRACTED")}>
          Extracted
        </Menu.Item>
        <Menu.Item onClick={() => actions.onStatusChange("FINALIZED_IN_FILE")}>
          Finalized
        </Menu.Item>
        <Menu.Item
          onClick={() => actions.onStatusChange("SUBMITTED_TO_MATHHUB")}
        >
          Submitted to MathHub
        </Menu.Item>
        <Menu.Divider />

        <Menu.Item color="red" onClick={actions.onOpenDiscard}>
          Discard
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
