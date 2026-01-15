import { currentUser } from "@/server/auth/currentUser";
import { logout } from "@/serverFns/logout.server";
import {
  Burger,
  Button,
  Drawer,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
  Paper,
  Avatar,
  Divider,
  Box,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  IconHome,
  IconFiles,
  IconLogout,
  IconLogin,
} from "@tabler/icons-react";

export default function Header() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
  });

  const loggedIn = user?.loggedIn;
  const email = user?.user?.email;

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setOpened(false);
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <Paper shadow="sm" withBorder radius={0}>
        <Group px="lg" py="md" justify="space-between">
          <Group gap="md">
            <Burger opened={opened} onClick={() => setOpened(true)} size="sm" />

            <Title
              order={3}
              style={{
                background:
                  "linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-cyan-6) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 700,
              }}
            >
              <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                GloX
              </Link>
            </Title>
          </Group>

          <Group gap="md">
            {loggedIn ? (
              <Group gap="sm">
                <Group gap="xs">
                  <Avatar size="sm" radius="xl" color="blue">
                    {email ? getInitials(email) : "U"}
                  </Avatar>
                  <Box style={{ display: "flex", flexDirection: "column" }}>
                    <Text size="xs" c="dimmed">
                      Signed in as
                    </Text>
                    <Text size="sm" fw={500}>
                      {email}
                    </Text>
                  </Box>
                </Group>
                <Button
                  size="sm"
                  variant="light"
                  color="red"
                  onClick={handleLogout}
                  leftSection={<IconLogout size={16} />}
                >
                  Logout
                </Button>
              </Group>
            ) : (
              <Button
                size="sm"
                variant="filled"
                component={Link}
                to="/login"
                leftSection={<IconLogin size={16} />}
              >
                Login
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Title order={4} fw={600}>
            Navigation
          </Title>
        }
        padding="lg"
        size="sm"
      >
        <Stack gap="xs">
          {loggedIn && (
            <>
              <Paper p="md" radius="md" bg="blue.0" mb="md">
                <Group gap="sm">
                  <Avatar size="md" radius="xl" color="blue">
                    {email ? getInitials(email) : "U"}
                  </Avatar>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Logged in as
                    </Text>
                    <Text size="sm" fw={600}>
                      {email}
                    </Text>
                  </Box>
                </Group>
              </Paper>

              <Divider mb="xs" />
            </>
          )}

          <NavLink
            label="Home"
            component={Link}
            to="/"
            onClick={() => setOpened(false)}
            leftSection={<IconHome size={18} />}
            styles={{
              root: {
                borderRadius: "8px",
                padding: "12px",
              },
            }}
          />

          {loggedIn && (
            <NavLink
              label="My Files"
              component={Link}
              to="/my-files"
              onClick={() => setOpened(false)}
              leftSection={<IconFiles size={18} />}
              styles={{
                root: {
                  borderRadius: "8px",
                  padding: "12px",
                },
              }}
            />
          )}

          {loggedIn && (
            <>
              <Divider my="md" />
              <Button
                variant="light"
                color="red"
                onClick={handleLogout}
                fullWidth
                leftSection={<IconLogout size={18} />}
              >
                Logout
              </Button>
            </>
          )}

          {!loggedIn && (
            <NavLink
              label="Login"
              component={Link}
              to="/login"
              onClick={() => setOpened(false)}
              leftSection={<IconLogin size={18} />}
              styles={{
                root: {
                  borderRadius: "8px",
                  padding: "12px",
                },
              }}
            />
          )}
        </Stack>
      </Drawer>
    </>
  );
}
