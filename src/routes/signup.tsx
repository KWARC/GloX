import { loginUsingRedirect } from "@/server/auth/loginUsingRedirect";
import { signup } from "@/serverFns/signUp.server";
import {
  Button,
  PasswordInput,
  Progress,
  Stack,
  Text,
  TextInput,
  Paper,
  Title,
  Anchor,
  List,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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
    // Validate inputs
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError =
      password !== confirmPassword ? "Passwords do not match" : null;

    if (emailError || passwordError || confirmError) {
      setError(emailError || passwordError || confirmError);
      return;
    }

    // ALeA RULE: FAU users MUST use IdM
    if (email.endsWith("@fau.de")) {
      alert(
        "You are using an FAU email. You will be redirected to the FAU IdM portal for authentication."
      );
      loginUsingRedirect();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await signup({ data: { email, password } });

      if (res?.success) {
        // ALeA RULE: signup does NOT auto-login
        alert(
          "Account created successfully! Please check your email for verification. You can now log in."
        );
        navigate({ to: "/login" });
        return;
      }

      setError(res?.error ?? "Signup failed");
    } catch (err) {
      console.error("Signup error:", err);
      setError("Unexpected error during signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength indicator
  const passwordStrength =
    (password.length >= 8 ? 25 : 0) +
    (/[A-Z]/.test(password) ? 25 : 0) +
    (/[a-z]/.test(password) ? 25 : 0) +
    (/[0-9]/.test(password) ? 25 : 0);

  const getPasswordColor = () => {
    if (passwordStrength < 50) return "red";
    if (passwordStrength < 75) return "yellow";
    return "green";
  };

  return (
    <Stack p="md" maw={450} mx="auto" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} ta="center" mb="md">
          Create Account
        </Title>

        <Stack gap="md">
          <TextInput
            label="Email Address"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && error.includes("email") ? error : undefined}
            required
          />

          <PasswordInput
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error && error.includes("character") ? error : undefined}
            required
          />

          {password && (
            <Progress 
              value={passwordStrength} 
              size="sm" 
              color={getPasswordColor()}
              animated={passwordStrength < 100}
            />
          )}

          <PasswordInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={error && error.includes("match") ? error : undefined}
            required
          />

          <Button
            onClick={handleSignup}
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
            size="lg"
          >
            Create Account
          </Button>

          {error && !error.includes("email") && !error.includes("character") && !error.includes("match") && (
            <Text c="red" size="sm" ta="center">
              {error}
            </Text>
          )}

          <Text size="sm" ta="center" mt="md">
            Already have an account?{" "}
            <Anchor href="/login" c="blue">
              Login
            </Anchor>
          </Text>
        </Stack>
      </Paper>

      {/* Password requirements info box */}
      <Paper p="md" withBorder bg="gray.0" mt="md">
        <Text size="sm" fw={600} mb="xs">
          🔒 Password Requirements:
        </Text>
        <List size="xs" spacing="xs">
          <List.Item>At least 8 characters long</List.Item>
          <List.Item>One uppercase letter (A-Z)</List.Item>
          <List.Item>One lowercase letter (a-z)</List.Item>
          <List.Item>One number (0-9)</List.Item>
        </List>
      </Paper>

      {/* Login info box */}
      <Paper p="md" withBorder bg="gray.0" mt="xs">
        <Text size="sm" fw={600} mb="xs">
          📋 Account Information:
        </Text>
        <List size="xs" spacing="xs">
          <List.Item>FAU members must use their FAU credentials</List.Item>
          <List.Item>External users can create email/password accounts</List.Item>
          <List.Item>You'll receive a verification email after signup</List.Item>
          <List.Item>Accounts are secured with bcrypt password hashing</List.Item>
        </List>
      </Paper>
    </Stack>
  );
}