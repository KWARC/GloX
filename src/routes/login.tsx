import { fakeLoginUsingRedirect } from "@/server/auth/fakeLoginUsingRedirect";
import { loginUsingRedirect } from "@/server/auth/loginUsingRedirect";
import { login } from "@/serverFns/login.server";
import {
  Anchor,
  Button,
  Divider,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useReducer, useState } from "react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch() as { target?: string };
  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Fake login state - fakeId IS the persona
  const [fakeId, setFakeId] = useState("");

  // Hidden unlock via double-click on warning text
  const [clickCount, incrementClickCount] = useReducer((x: number) => x + 1, 0);
  const fakeLoginEnabled = clickCount >= 1;

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ALeA personas - fakeId is the persona label
  const PresetPersonas = [
    { value: "sabrina", label: "sabrina - FAU CS student" },
    { value: "joy", label: "joy - Engineering background" },
    { value: "anushka", label: "anushka - Philosophy background" },
    { value: "blank", label: "blank - Empty learner model" },
  ];

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Invalid email address";
    }
    return null;
  };

  const handleEmailLogin = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // ALeA rule: FAU users must use IdM
    if (email.endsWith("@fau.de")) {
      loginUsingRedirect(search.target);
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Replace the error handling section (lines 78-98) with:
    try {
      const res = await login({ data: { email, password } });

      if (res.success) {
        // Redirect on successful login
        window.location.replace(search.target ?? "/");
        return;
      }

      // Type narrowing: res.success is false here
      if ("code" in res && res.code === "NOT_SIGNED_UP") {
        setError("No account found with this email. Please sign up first.");
        return;
      }

      if ("error" in res) {
        if (res.error === "INVALID_PASSWORD") {
          setError("Invalid password");
          return;
        }
        setError(res.error ?? "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unexpected error during login");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFauOrFakeLogin = () => {
    console.log("[LOGIN] Button clicked");
    console.log("[LOGIN] fakeLoginEnabled =", fakeLoginEnabled);
    console.log("[LOGIN] fakeId =", fakeId);
    console.log("[LOGIN] target =", search.target);

    if (fakeLoginEnabled) {
      if (!fakeId) {
        console.warn("[LOGIN] Fake login enabled but no fakeId selected");
        setError("Please select a fake user");
        return;
      }

      console.log("[LOGIN] Triggering fakeLoginUsingRedirect");
      fakeLoginUsingRedirect(fakeId, search.target);
    } else {
      console.log("[LOGIN] Triggering FAU IdM redirect");
      loginUsingRedirect(search.target);
    }
  };

  return (
    <Stack p="md" maw={450} mx="auto" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Title order={2} ta="center" mb="md">
          Login to ALeA
        </Title>

        {/* Fake login persona selector (hidden until unlocked) */}
        {fakeLoginEnabled && (
          <Select
            label="Fake User (Development Only)"
            data={PresetPersonas}
            value={fakeId}
            onChange={(value) => setFakeId(value || "")}
            mb="md"
            clearable
          />
        )}

        {/* Primary FAU/Fake login button */}
        <Button fullWidth size="lg" onClick={handleFauOrFakeLogin} mb="xs">
          {fakeLoginEnabled ? "Fake User Login" : "Login with FAU"}
        </Button>

        {/* Warning text - double-click to unlock fake login */}
        <Text
          size="xs"
          c="dimmed"
          ta="center"
          mb="md"
          onDoubleClick={incrementClickCount}
          style={{
            cursor: "default",
            userSelect: "none",
          }}
        >
          {fakeLoginEnabled
            ? "⚠️ Fake login mode enabled (dev only)"
            : "⚠️ Warning: You will be logged out from all ALeA services"}
        </Text>

        <Divider label="OR" labelPosition="center" my="lg" />

        {/* Email/Password login */}
        <Stack gap="md">
          <TextInput
            label="Email Address"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={error && error.includes("email") ? error : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEmailLogin();
            }}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEmailLogin();
            }}
          />

          <Button
            onClick={handleEmailLogin}
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
          >
            Login with Email
          </Button>

          {error && !error.includes("email") && (
            <Text c="red" size="sm" ta="center">
              {error}
            </Text>
          )}

          <Text size="sm" ta="center" mt="md">
            Don't have an account?{" "}
            <Anchor href="/signup" c="blue">
              Sign up
            </Anchor>
          </Text>

          <Text size="sm" ta="center">
            <Anchor href="/forgot-password" c="dimmed">
              Forgot password?
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
