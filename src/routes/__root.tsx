import { MainLayout } from "@/components/MainLayout";
import { initFtmlClient } from "@/lib/ftmlClient";
import { queryClient } from "@/queryClient";
import { AppShell, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import Header from "../components/Header";

function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  );
}

export const Route = createRootRoute({
  loader: async () => {
    await initFtmlClient();
    return null;
  },
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <title>GloX</title>
        <link rel="icon" type="image/jpeg" href="/fau.jpeg" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <MantineProvider theme={{ primaryColor: "blue" }}>
            <AppShell
              header={{ height: 56 }}
              padding="md"
              styles={{
                main: {
                  height: "calc(100dvh - 56px)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                },
              }}
            >
              <AppShell.Header>
                <Header />
              </AppShell.Header>

              <AppShell.Main>
                <MainLayout>{children}</MainLayout>
              </AppShell.Main>
            </AppShell>
          </MantineProvider>

          {/* <TanStackDevtools
            config={{ position: "bottom-right"}}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          /> */}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
