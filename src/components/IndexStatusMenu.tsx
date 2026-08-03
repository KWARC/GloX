import {
  INDEX_STATUS_CONFIG,
  IndexStatus,
} from "@/types/indexStatus";
import { Button, Menu } from "@mantine/core";
import { ChevronDown } from "lucide-react";

export function IndexStatusMenu({
  status,
  onStatusChange,
  disabled = false,
}: {
  status: IndexStatus;
  onStatusChange: (status: IndexStatus) => void;
  disabled?: boolean;
}) {
  const conf = INDEX_STATUS_CONFIG[status];

  return (
    <Menu shadow="md" width={230} position="bottom-end">
      <Menu.Target>
        <Button
          size="sm"
          variant="light"
          color={conf.color}
          rightSection={<ChevronDown size={12} />}
          disabled={disabled}
          styles={{ section: { marginLeft: 4 } }}
        >
          {conf.label}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Status</Menu.Label>
        {(Object.keys(INDEX_STATUS_CONFIG) as IndexStatus[]).map((value) => (
          <Menu.Item
            key={value}
            disabled={value === status}
            onClick={() => onStatusChange(value)}
          >
            {INDEX_STATUS_CONFIG[value].label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
