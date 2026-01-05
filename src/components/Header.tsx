import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Burger,
  Drawer,
  Stack,
  NavLink,
  Group,
  Title,
} from '@mantine/core'

export default function Header() {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <Group px="md" py="sm">
        <Burger opened={opened} onClick={() => setOpened(true)} />
        <Title order={4}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            GloX
          </Link>
        </Title>
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
         
        </Stack>
      </Drawer>
    </>
  )
}
