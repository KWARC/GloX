import { verifyEmail } from "@/serverFns/verify.server";
import { Button, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/verify")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
});

function RouteComponent() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyEmail({ data: { token } });

        if (res.success) {
          setStatus("success");
          setMessage(res.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(res.error || "Verification failed");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    verify();
  }, [token]);

  return (
    <Stack p="md" maw={450} mx="auto" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Stack align="center" gap="lg">
          {status === "loading" && (
            <>
              <Title order={2}>Verifying Email...</Title>
              <Text c="dimmed">Please wait</Text>
            </>
          )}

          {status === "success" && (
            <>
              <IconCircleCheck size={64} color="green" />
              <Title order={2}>Email Verified!</Title>
              <Text ta="center" c="dimmed">
                {message}
              </Text>
              <Button
                fullWidth
                size="lg"
                onClick={() => navigate({ to: "/login" })}
              >
                Go to Login
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <IconAlertCircle size={64} color="red" />
              <Title order={2}>Verification Failed</Title>
              <Text ta="center" c="red">
                {message}
              </Text>
              <Button
                fullWidth
                size="lg"
                variant="light"
                onClick={() => navigate({ to: "/signup" })}
              >
                Back to Signup
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
