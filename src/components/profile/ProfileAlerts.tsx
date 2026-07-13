import { Alert } from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

type ProfileAlertsProps = {
  error: string | null;
  success: string | null;
  onClearError: () => void;
  onClearSuccess: () => void;
};

export function ProfileAlerts({
  error,
  success,
  onClearError,
  onClearSuccess,
}: ProfileAlertsProps) {
  if (!error && !success) {
    return null;
  }

  return (
    <>
      {success && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Success"
          color="green"
          onClose={onClearSuccess}
          withCloseButton
        >
          {success}
        </Alert>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          onClose={onClearError}
          withCloseButton
        >
          {error}
        </Alert>
      )}
    </>
  );
}
