import { PopupState } from "@/server/text-selection";
import { ActionIcon, Divider, Paper, Portal, Text } from "@mantine/core";

interface SelectionPopupProps {
  popup: PopupState;
  onExtract?: () => void;
  onDefiniendum?: () => void;
  onSymbolicRef?: () => void;
  onClose: () => void;
}

export function SelectionPopup({
  popup,
  onExtract,
  onDefiniendum,
  onSymbolicRef,
  onClose,
}: SelectionPopupProps) {
  return (
    <Portal>
      <Paper
        withBorder
        shadow="md"
        p={8}
        radius="md"
        style={{
          position: "absolute",
          top: popup.y,
          left: popup.x,
          zIndex: 3000,
          display: "flex",
          gap: 6,
          alignItems: "center",
          border: "2px solid",
          borderColor:
            popup.source === "left"
              ? "var(--mantine-color-blue-4)"
              : "var(--mantine-color-teal-4)",
        }}
      >
        {popup.source === "left" && onExtract && (
          <Text
            size="sm"
            fw={600}
            c="blue.7"
            style={{ cursor: "pointer", padding: "2px 8px" }}
            onClick={onExtract}
          >
            → Extract
          </Text>
        )}

        {popup.source === "right" && (
          <>
            {onDefiniendum && (
              <Text
                size="sm"
                fw={600}
                c="teal.7"
                style={{ cursor: "pointer", padding: "2px 8px" }}
                onClick={onDefiniendum}
              >
                Definiendum
              </Text>
            )}
            {onSymbolicRef && (
              <>
                <Divider orientation="vertical" />
                <Text
                  size="sm"
                  fw={600}
                  c="teal.7"
                  style={{ cursor: "pointer", padding: "2px 8px" }}
                  onClick={onSymbolicRef}
                >
                  Symbolic Ref
                </Text>
              </>
            )}
          </>
        )}

        <Divider orientation="vertical" />
        <ActionIcon size="xs" variant="subtle" color="gray" onClick={onClose}>
          ×
        </ActionIcon>
      </Paper>
    </Portal>
  );
}
