import { resetPassword } from "@/serverFns/resetPassword.server";
import {
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
});

function passwordError(password: string): string | null {
  if (password.length < 8) return "At least 8 characters required";
  if (!/[A-Z]/.test(password)) return "One uppercase letter required";
  if (!/[a-z]/.test(password)) return "One lowercase letter required";
  if (!/[0-9]/.test(password)) return "One number required";
  return null;
}

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    token ? null : "This password reset link is invalid.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength =
    (password.length >= 8 ? 25 : 0) +
    (/[A-Z]/.test(password) ? 25 : 0) +
    (/[a-z]/.test(password) ? 25 : 0) +
    (/[0-9]/.test(password) ? 25 : 0);
  const strengthColor = strength < 50 ? "red" : strength < 75 ? "yellow" : "green";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This password reset link is invalid.");
      return;
    }

    const validationError = passwordError(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword({ data: { token, password } });
      if (!result.success) {
        setError(result.error ?? "Unable to reset password.");
        return;
      }

      navigate({ to: "/login" });
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack p="md" maw={450} mx="auto" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} ta="center" mb="md">
          Choose a new password
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <PasswordInput
              label="New Password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!token}
              required
              autoFocus
            />

            {password && <Progress value={strength} size="sm" color={strengthColor} />}

            <PasswordInput
              label="Confirm New Password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={!token}
              required
            />

            {error && <Text c="red" size="sm">{error}</Text>}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!token || isSubmitting}
              fullWidth
              size="lg"
            >
              Reset password
            </Button>

            <Text size="sm" ta="center">
              <Anchor href="/login">Back to login</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
