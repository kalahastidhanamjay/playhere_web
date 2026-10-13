import { config } from "./config";

/**
 * Minimal STOMP 1.2 subscription over a native WebSocket (Spring simple broker).
 * Reconnects with back-off; the returned function closes everything.
 */
export function subscribe(destination: string, onMessage: (body: unknown) => void): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let buffer = "";

  const frame = (command: string, headers: Record<string, string>) =>
    `${command}\n${Object.entries(headers).map(([k, v]) => `${k}:${v}`).join("\n")}\n\n\u0000`;

  const reconnect = () => {
    if (closed) return;
    const delay = Math.min(30, 2 ** attempt) * 1000;
    attempt = Math.min(attempt + 1, 5);
    retry = setTimeout(connect, delay);
  };

  function connect() {
    if (closed) return;
    try {
      socket = new WebSocket(config.wsUrl);
    } catch {
      reconnect();
      return;
    }
    socket.onopen = () => socket?.send(frame("CONNECT", { "accept-version": "1.2", host: "/", "heart-beat": "0,0" }));
    socket.onmessage = (event) => {
      buffer += typeof event.data === "string" ? event.data : "";
      let end: number;
      while ((end = buffer.indexOf("\u0000")) !== -1) {
        const raw = buffer.slice(0, end).replace(/\r\n/g, "\n").replace(/^\n+/, "");
        buffer = buffer.slice(end + 1);
        if (!raw) continue;
        const split = raw.indexOf("\n\n");
        const command = (split === -1 ? raw : raw.slice(0, split)).split("\n")[0].trim();
        const body = split === -1 ? "" : raw.slice(split + 2);
        if (command === "CONNECTED") {
          attempt = 0;
          socket?.send(frame("SUBSCRIBE", { id: "sub-0", destination, ack: "auto" }));
        } else if (command === "MESSAGE" && body) {
          try {
            onMessage(JSON.parse(body));
          } catch {
            // ignore non-JSON payloads
          }
        }
      }
    };
    socket.onclose = () => reconnect();
    socket.onerror = () => socket?.close();
  }

  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    if (socket?.readyState === WebSocket.OPEN) socket.send(frame("DISCONNECT", {}));
    socket?.close();
  };
}
