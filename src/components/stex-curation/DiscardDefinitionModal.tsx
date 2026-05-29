import { Button, Group, Modal, Select, Stack, Textarea } from "@mantine/core";

export type DiscardDefinitionModalProps = {
  discard: {
    opened: boolean;
    reason: string;
    onClose: () => void;
    onChangeReason: (reason: string) => void;
    onConfirm: () => void;
  };
};

export function DiscardDefinitionModal({
  discard,
}: DiscardDefinitionModalProps) {
  return (
    <Modal
      opened={discard.opened}
      onClose={discard.onClose}
      title="Discard Definition"
    >
      <Stack>
        <Select
          label="Reason"
          placeholder="Select reason"
          data={["POOR QUALITY", "NOT A DEFINITION"]}
          value={discard.reason}
          onChange={(value) => discard.onChangeReason(value || "")}
        />

        <Textarea
          label="Custom reason"
          placeholder="Enter reason"
          value={discard.reason}
          onChange={(e) => discard.onChangeReason(e.currentTarget.value)}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={discard.onClose}>
            Cancel
          </Button>

          <Button color="red" onClick={discard.onConfirm}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
