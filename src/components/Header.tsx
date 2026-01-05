import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { currentUser } from "@/serverFns/currentUser.server";
import { logout } from "@/serverFns/logout.server";

export default function Header() {
  const [opened, setOpened] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    currentUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.location.href = "/?page=login";
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  };

  const loggedIn = user?.loggedIn;
  const email = user?.user?.email;

  return (
    <>
      <Group px="md" py="sm" justify="space-between">
        <Group>
          <Burger opened={opened} onClick={() => setOpened(true)} />

          <Title order={4}>
            <Link
              to="/"
              search={{ page: undefined }}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              GloX
            </Link>
          </Title>
        </Group>

        {loggedIn && (
          <Group gap="sm">
            <Text size="sm">
              Signed in as <b>{email}</b>
            </Text>
            <Button 
              size="xs" 
              variant="subtle" 
              onClick={handleLogout}
              loading={loggingOut}
            >
              Logout
            </Button>
          </Group>
        )}
      </Group>

      <Drawer opened={opened} onClose={() => setOpened(false)} title="Navigation">
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
                to="/"
                search={{ page: "my-files" } as any}
                onClick={() => setOpened(false)}
              />

              <Button 
                variant="light" 
                color="red" 
                onClick={handleLogout}
                loading={loggingOut}
                fullWidth
                mt="md"
              >
                Logout
              </Button>
            </>
          )}

          {!loggedIn && (
            <NavLink
              label="Login"
              component={Link}
              to="/"
              search={{ page: "login" } as any}
              onClick={() => setOpened(false)}
            />
          )}
        </Stack>
      </Drawer>
    </>
  );
}