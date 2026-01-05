import { useState } from "react";
import { TextInput, Button, Stack, PasswordInput, Text, Progress } from "@mantine/core";
import { signupApi } from "@/api/signUp";


export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    confirmPassword?: string 
  }>({});
  const [touched, setTouched] = useState<{ 
    email?: boolean; 
    password?: boolean; 
    confirmPassword?: boolean 
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Must contain at least one number";
    return "";
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handleBlur = (field: "email" | "password" | "confirmPassword") => {
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
    } else if (field === "confirmPassword") {
      const confirmError = validateConfirmPassword(confirmPassword, password);
      if (confirmError) newErrors.confirmPassword = confirmError;
      else delete newErrors.confirmPassword;
    }
    setErrors(newErrors);
  };

  const handleSignup = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword, password);
    
    const newErrors: { 
      email?: string; 
      password?: string; 
      confirmPassword?: string 
    } = {};
    
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    if (confirmError) newErrors.confirmPassword = confirmError;
    
    setErrors(newErrors);
    setTouched({ email: true, password: true, confirmPassword: true });
    
    if (emailError || passwordError || confirmError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signupApi(email, password);

      if (res?.success) {
        window.location.href = "/?page=my-files";
        return;
      }

      alert(res?.error ?? "Signup failed");
    } catch (err) {
      alert("An error occurred during signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColor = 
    passwordStrength < 50 ? "red" : 
    passwordStrength < 75 ? "yellow" : 
    "green";

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

      <div>
        <PasswordInput
          label="Password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur("password")}
          error={touched.password && errors.password}
          required
        />
        {password && (
          <div style={{ marginTop: 8 }}>
            <Progress value={passwordStrength} color={strengthColor} size="sm" />
            <Stack gap={4} mt={8}>
              <Text size="xs" c={password.length >= 8 ? "green" : "dimmed"}>
                ✓ At least 8 characters
              </Text>
              <Text size="xs" c={/[A-Z]/.test(password) ? "green" : "dimmed"}>
                ✓ One uppercase letter
              </Text>
              <Text size="xs" c={/[a-z]/.test(password) ? "green" : "dimmed"}>
                ✓ One lowercase letter
              </Text>
              <Text size="xs" c={/[0-9]/.test(password) ? "green" : "dimmed"}>
                ✓ One number
              </Text>
            </Stack>
          </div>
        )}
      </div>

      <PasswordInput
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onBlur={() => handleBlur("confirmPassword")}
        error={touched.confirmPassword && errors.confirmPassword}
        required
      />

      <Button 
        onClick={handleSignup} 
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        Create Account
      </Button>

      <Text size="sm" c="dimmed" ta="center">
        Already have an account?{" "}
        <Text
          component="span"
          c="blue"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => {
            window.location.href = "/?page=login";
          }}
        >
          Login
        </Text>
      </Text>
    </Stack>
  );
}