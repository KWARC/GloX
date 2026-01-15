import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Progress,
} from "@mantine/core";
import { signup } from "@/serverFns/signUp.server";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (value.length < 8) return "At least 8 characters required";
    if (!/[A-Z]/.test(value)) return "One uppercase letter required";
    if (!/[a-z]/.test(value)) return "One lowercase letter required";
    if (!/[0-9]/.test(value)) return "One number required";
    return null;
  };

  const handleSignup = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError =
      password !== confirmPassword ? "Passwords do not match" : null;

    if (emailError || passwordError || confirmError) {
      setError(emailError || passwordError || confirmError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await signup({ data: { email, password } });

      if (res?.success) {
        navigate({ to: "/my-files" });
        return;
      }

      setError(res?.error ?? "Signup failed");
    } catch {
      setError("Unexpected error during signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength =
    (password.length >= 8 ? 25 : 0) +
    (/[A-Z]/.test(password) ? 25 : 0) +
    (/[a-z]/.test(password) ? 25 : 0) +
    (/[0-9]/.test(password) ? 25 : 0);

  return (
    <Stack p="md" maw={400} mx="auto">
      <TextInput
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <PasswordInput
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Progress value={passwordStrength} size="sm" />

      <PasswordInput
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <Button
        onClick={handleSignup}
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        Create Account
      </Button>

      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      <Text size="sm" ta="center">
        Already have an account?{" "}
        <Text
          component="span"
          c="blue"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => navigate({ to: "/login" })}
        >
          Login
        </Text>
      </Text>
    </Stack>
  );
}
