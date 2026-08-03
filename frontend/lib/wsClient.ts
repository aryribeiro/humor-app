"use client";

import { io, Socket } from "socket.io-client";

export type MessageHandler = (event: string, data: unknown) => void;

interface WsClientOptions {
  url: string;
  onMessage: MessageHandler;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

export class WsClient {
  private socket: Socket | null = null;
  private url: string;
  private handlers: Omit<WsClientOptions, "url">;
  private reconnectAttempt = 0;

  constructor(options: WsClientOptions) {
    this.url = options.url;
    this.handlers = options;
  }

  connect(): void {
    this.socket = io(this.url, {
      transports: ["polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 20000,
      forceNew: false,
    });

    this.socket.on("connect", () => {
      if (this.reconnectAttempt > 0) {
        this.handlers.onReconnect?.();
      }
      this.reconnectAttempt = 0;
      this.handlers.onOpen?.();
    });

    this.socket.on("disconnect", (reason) => {
      this.handlers.onClose?.();
      if (reason === "io server disconnect") {
        // Server forced disconnect — reconnect manually
        setTimeout(() => this.socket?.connect(), 1000);
      }
    });

    this.socket.on("connect_error", (err) => {
      this.reconnectAttempt++;
      if (err.message?.includes("session") || err.message?.includes("Session")) {
        // Stale session ID — force new connection
        this.socket?.disconnect();
        setTimeout(() => {
          this.socket?.connect();
        }, this.getBackoff());
      }
      this.handlers.onError?.(err);
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempt = attempt;
    });

    this.socket.io.on("reconnect_failed", () => {
      // All built-in attempts failed — force fresh connection
      this.socket?.disconnect();
      setTimeout(() => {
        this.socket?.connect();
      }, 5000);
    });

    const events = [
      "session_created",
      "language_changed",
      "audio_output",
      "navigation_command",
      "interrupted",
      "listening_started",
      "listening_stopped",
      "stop_requested",
      "error_msg",
      "pong_msg",
    ];

    events.forEach((event) => {
      this.socket!.on(event, (data: unknown) => {
        this.handlers.onMessage(event, data);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: object): void {
    this.socket?.emit(event, data);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private getBackoff(): number {
    const base = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
    const jitter = base * 0.5 * Math.random();
    return base + jitter;
  }
}

export function createWsClient(options: WsClientOptions): WsClient {
  return new WsClient(options);
}
