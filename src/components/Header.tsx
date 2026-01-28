import { currentUser } from "@/server/auth/currentUser";
import { logout } from "@/serverFns/logout.server";
import {
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  Menu,
  NavLink,
  Paper,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconFiles,
  IconHome,
  IconLogin,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export default function Header() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    retry: false,
    staleTime: 60_000,
  });

  const loggedIn = user?.loggedIn;
  const email = user?.user?.email;
  const firstName = user?.user?.firstName;
  const lastName = user?.user?.lastName;

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.setQueryData(["currentUser"], { loggedIn: false });
      setOpened(false);
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return email || "User";
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
                {/* User Menu */}
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <UnstyledButton>
                      <Group gap="xs">
                        <Avatar size="sm" radius="xl" color="blue">
                          {email ? getInitials(email) : "U"}
                        </Avatar>
                        <Box
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <Text size="xs" c="dimmed">
                            Signed in as
                          </Text>
                          <Text size="sm" fw={500}>
                            {firstName || email}
                          </Text>
                        </Box>
                        <IconChevronDown size={14} />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Account</Menu.Label>
                    <Menu.Item
                      component={Link}
                      to="/profile"
                      leftSection={<IconUser size={16} />}
                    >
                      Profile
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={16} />}
                      onClick={handleLogout}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
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
                      {getDisplayName()}
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
            <>
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

              <NavLink
                label="Profile"
                component={Link}
                to="/profile"
                onClick={() => setOpened(false)}
                leftSection={<IconUser size={18} />}
                styles={{
                  root: {
                    borderRadius: "8px",
                    padding: "12px",
                  },
                }}
              />
            </>
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
