import { Box, Container, Paper } from "@mantine/core";
import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Box
      style={{
        height: "100%",
        width: "100%",
        padding: "1rem",
        background: "#f8f9fa",
      }}
    >
      <Container
        size="xl"
        style={{
          height: "100%",
          padding: 0,
        }}
      >
        <Paper
          shadow="sm"
          radius="md"
          withBorder
          style={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e9ecef",
            background: "white",
            position: "relative",
          }}
        >
          {/* Subtle top accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #228be6 0%, #7950f2 100%)",
              opacity: 1,
              zIndex: 2,
            }}
          />

          {/* Main content area with padding */}
          <Box
            style={{
              flex: 1,
              overflow: "auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            {children}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}