import { PopupState } from "@/server/text-selection";
import { ActionIcon, Divider, Paper, Portal, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useLayoutEffect, useRef, useState } from "react";

interface SelectionPopupProps {
  popup: PopupState;
  onExtract?: () => void;
  onMarkReference?: () => void;
  onDefiniendum?: () => void;
  onSymbolicRef?: () => void;
  onClose: () => void;
}

function clampPopupPosition(
  popup: PopupState,
  paper: HTMLElement,
): { top: number; left: number } {
  const rect = paper.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 8;

  let left = popup.x;
  let top = popup.y;

  if (left + rect.width > vw - GAP) {
    left = popup.x - rect.width - GAP;
  }

  left = Math.max(GAP, Math.min(left, vw - rect.width - GAP));

  if (top + rect.height > vh - GAP) {
    top = popup.y - rect.height - GAP;
  }

  top = Math.max(GAP, Math.min(top, vh - rect.height - GAP));

  return { top, left };
}

export function SelectionPopup({
  popup,
  onExtract,
  onMarkReference,
  onDefiniendum,
  onSymbolicRef,
  onClose,
}: SelectionPopupProps) {
  const [position, setPosition] = useState(() => ({
    top: popup.y,
    left: popup.x,
  }));
  const paperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setPosition({ top: popup.y, left: popup.x });

    const paper = paperRef.current;
    if (!paper) return;

    setPosition(clampPopupPosition(popup, paper));
  }, [popup.x, popup.y, popup.source]);

  return (
    <Portal>
      <Paper
        ref={paperRef}
        withBorder
        shadow="md"
        p={8}
        radius="md"
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
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
          <>
            <Text
              size="sm"
              fw={600}
              c="blue.7"
              style={{ cursor: "pointer", padding: "2px 8px" }}
              onClick={onExtract}
            >
              → Extract
            </Text>
            {onMarkReference && (
              <>
                <Divider orientation="vertical" />
                <Text
                  size="sm"
                  fw={600}
                  c="blue.7"
                  style={{ cursor: "pointer", padding: "2px 8px" }}
                  onClick={onMarkReference}
                >
                  Mark Reference
                </Text>
              </>
            )}
          </>
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
                {onDefiniendum && <Divider orientation="vertical" />}
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
          <IconX size={16} />
        </ActionIcon>
      </Paper>
    </Portal>
  );
}
