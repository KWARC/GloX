import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Burger,
  Drawer,
  Stack,
  NavLink,
  Group,
  Title,
  Text,
  Button,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUser } from "@/serverFns/currentUser.server";
import { logout } from "@/serverFns/logout.server";

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
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <>
      <Group px="md" py="sm" justify="space-between">
        <Group>
          <Burger opened={opened} onClick={() => setOpened(true)} />

          <Title order={4}>
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              GloX
            </Link>
          </Title>
        </Group>

        {loggedIn && (
          <Group gap="sm">
            <Text size="sm">
              Signed in as <b>{email}</b>
            </Text>
            <Button size="xs" variant="subtle" onClick={handleLogout}>
              Logout
            </Button>
          </Group>
        )}
      </Group>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title="Navigation"
      >
        <Stack>
          <NavLink
            label="Home"
            component={Link}
            to="/"
            onClick={() => setOpened(false)}
          />

          {loggedIn && (
            <>
              <NavLink
                label="My Files"
                component={Link}
                to="/my-files"
                onClick={() => setOpened(false)}
              />

              <Button
                variant="light"
                color="red"
                onClick={handleLogout}
                fullWidth
                mt="md"
              >
                Logout
              </Button>
            </>
          )}

          {!loggedIn && (
            <>
              <NavLink
                label="Login"
                component={Link}
                to="/login"
                onClick={() => setOpened(false)}
              />
              <NavLink
                label="Sign Up"
                component={Link}
                to="/signup"
                onClick={() => setOpened(false)}
              />
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
