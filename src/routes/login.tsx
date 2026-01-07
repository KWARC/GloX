import { login } from "@/serverFns/login.server";
import { Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Invalid email address";
    }
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    return null;
  };

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setError(emailError || passwordError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await login({ data: { email, password } } as any);

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        navigate({ to: "/my-files" });
        return;
      }

      if (res?.code === "NOT_SIGNED_UP") {
        setError("Not signed up");
        return;
      }

      setError(res?.error ?? "Login failed");
    } catch {
      setError("Unexpected error during login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack p="md" maw={400} mx="auto">
      <TextInput
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <PasswordInput
        label="Password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Button
        onClick={handleLogin}
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        Login
      </Button>

      <Text size="sm" ta="center">
        Don’t have an account?{" "}
        <Text
          component="span"
          c="blue"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => navigate({ to: "/signup" })}
        >
          Sign up
        </Text>
      </Text>

      {error && error !== "Not signed up" && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}
    </Stack>
  );
}
