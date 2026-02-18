import { login } from "@/serverFns/login.server";
import {
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch() as { target?: string };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Invalid email address";
    }
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setEmailError(null);
    setPasswordError(null);
    setFormError(null);

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setEmailError(emailValidation);
      return;
    }

    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({ data: { email, password } });

      if (res.success) {
        window.location.replace(search.target ?? "/");
        return;
      }

      if (res.error) {
        if (res.error.code === "INVALID_CREDENTIALS") {
          setPasswordError(res.error.message);
        } else if (res.error.code === "UNVERIFIED_EMAIL") {
          setFormError(res.error.message);
        } else {
          setFormError("Login failed");
        }
      } else {
        setFormError("Login failed");
      }
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack p="md" maw={450} mx="auto" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} ta="center" mb="md">
          Welcome Back
        </Title>

        <form onSubmit={handleLogin}>
          <Stack gap="md">
            <TextInput
              label="Email Address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError ?? undefined}
              required
              autoFocus
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError ?? undefined}
              required
            />

            {formError && (
              <Text c="red" size="sm">
                {formError}
              </Text>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              fullWidth
              size="lg"
            >
              Log In
            </Button>

            <Text size="sm" ta="center" mt="md">
              Don't have an account?{" "}
              <Anchor href="/signup" c="blue">
                Sign up
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
