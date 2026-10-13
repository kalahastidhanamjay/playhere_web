/** Build-time configuration. Override with VITE_API_URL / VITE_WS_URL in .env.local. */
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8080/api/v1",
  wsUrl: (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://localhost:8080/ws/stomp",
} as const;
