import { requestPasswordReset } from "@/serverFns/requestPasswordReset.server";
import { Anchor, Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset({ data: { email } });
      setMessage(result.message);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack p="md" maw={450} mx="auto" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} ta="center" mb="xs">
          Reset your password
        </Title>
        <Text c="dimmed" ta="center" size="sm" mb="lg">
          Enter your email address and we&apos;ll send you a reset link.
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email Address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={error ?? undefined}
              required
              autoFocus
            />

            {message && <Text c="green" size="sm">{message}</Text>}

            <Button type="submit" loading={isSubmitting} fullWidth size="lg">
              Send reset link
            </Button>

            <Text size="sm" ta="center">
              Remembered your password? <Anchor href="/login">Log in</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
