import { useState } from "react";
import { TextInput, Button, Stack, Text, PasswordInput } from "@mantine/core";
import { login } from "@/serverFns/login.server";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required";
    return "";
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched({ ...touched, [field]: true });
    
    const newErrors = { ...errors };
    if (field === "email") {
      const emailError = validateEmail(email);
      if (emailError) newErrors.email = emailError;
      else delete newErrors.email;
    } else if (field === "password") {
      const passwordError = validatePassword(password);
      if (passwordError) newErrors.password = passwordError;
      else delete newErrors.password;
    }
    setErrors(newErrors);
  };

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    const newErrors: { email?: string; password?: string } = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    
    if (emailError || passwordError) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login({ data: { email, password } } as any);

      if (res?.success) {
        window.location.href = "/?page=my-files";
        return;
      }

      if (res?.code === "NOT_SIGNED_UP") {
        setError("not-signed-up");
        return;
      }

      setError(res?.error ?? "Login failed");
    } catch (err) {
      setError("An error occurred during login");
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
        onBlur={() => handleBlur("email")}
        error={touched.email && errors.email}
        required
      />

      <PasswordInput
        label="Password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => handleBlur("password")}
        error={touched.password && errors.password}
        required
      />

      <Button 
        onClick={handleLogin} 
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        Login
      </Button>

      {error === "not-signed-up" && (
        <Text c="red" size="sm">
          Not signed up.{" "}
          <Text
            component="span"
            c="blue"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => {
              window.location.href = "/?page=signup";
            }}
          >
            Please sign up
          </Text>
          .
        </Text>
      )}

      {error && error !== "not-signed-up" && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}
    </Stack>
  );
}