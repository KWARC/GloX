import "@mantine/core/styles.css";
import "@mantine/core/styles.css";
import { AppShell, MantineProvider } from "@mantine/core";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { QueryClientProvider } from "@tanstack/react-query";

import Header from "../components/Header";
import { queryClient } from "@/queryClient";

export const Route = createRootRoute({
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <MantineProvider theme={{ primaryColor: "blue" }}>
            <AppShell header={{ height: 56 }} padding="md">
              <AppShell.Header>
                <Header />
              </AppShell.Header>

              <AppShell.Main>{children}</AppShell.Main>
            </AppShell>
          </MantineProvider>

          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
