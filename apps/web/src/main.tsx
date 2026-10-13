import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { reloadForNewVersion, router } from "@/app/router";
import { FeedbackProvider } from "@/components/overlay";
import { ApiError } from "@/lib/api";
import { SessionProvider } from "@/lib/session";
import { storage } from "@/lib/storage";
import { applyTheme } from "@/lib/theme";
import "@/styles/global.css";

applyTheme(storage.theme() ?? "dark");

// Vite reports a failed preload of a page's files (stale tab after a deploy); load the new version.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // Retry flaky networks, never client errors (401/404/...).
      retry: (count, error) => count < 2 && ["network", "server"].includes(ApiError.from(error).kind),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <FeedbackProvider>
          <RouterProvider router={router} />
        </FeedbackProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
