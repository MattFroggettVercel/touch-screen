/**
 * Pi Local Device Client
 *
 * HTTP + WebSocket client for communicating with the TouchScreen
 * Pi server over the local network.
 */

import { PI_SERVER_PORT } from "./constants";
import { authClient } from "./auth-client";

export interface DeviceStatus {
  deviceCode: string;
  mode: "setup" | "ready";
  editing: boolean;
  ha: {
    connected: boolean;
    entityCount: number;
  };
  wifi: {
    mode: "ap" | "client";
    ssid: string | null;
  };
}

export interface WifiNetwork {
  ssid: string;
  signal: number;
}

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export class DeviceClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private entityListeners: Set<(entities: Record<string, HAEntity>) => void> =
    new Set();
  private statusListeners: Set<(status: { connected: boolean }) => void> =
    new Set();

  constructor(host: string, port: number = PI_SERVER_PORT) {
    this.baseUrl = `http://${host}:${port}`;
  }

  // ---- HTTP API ----

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    // Add auth cookies if available (for cloud API calls)
    const cookies = authClient.getCookie();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options?.headers,
    };
    if (cookies) {
      headers.Cookie = cookies;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: "omit", // Better Auth handles cookies manually
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  async getStatus(): Promise<DeviceStatus> {
    return this.request("/api/status");
  }

  // ---- File operations (used by AI tool execution) ----

  async listFiles(
    path: string = "src"
  ): Promise<{ files: string[] }> {
    return this.request("/api/files");
  }

  async readFile(path: string): Promise<{ path: string; content: string }> {
    return this.request(`/api/files/${path}`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.request(`/api/files/${path}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  // ---- Dev server lifecycle ----

  async startDevServer(): Promise<{ port: number }> {
    return this.request("/api/dev/start", { method: "POST" });
  }

  async stopDevServer(): Promise<void> {
    await this.request("/api/dev/stop", { method: "POST" });
  }

  async getDevStatus(): Promise<{ running: boolean; port: number | null }> {
    return this.request("/api/dev/status");
  }

  // ---- Build ----

  async build(): Promise<void> {
    await this.request("/api/build", { method: "POST" });
  }

  async install(): Promise<void> {
    await this.request("/api/build/install", { method: "POST" });
  }

  async installPackage(
    packageName: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request("/api/packages/install", {
      method: "POST",
      body: JSON.stringify({ packageName }),
    });
  }

  async getDevServerErrors(): Promise<{
    errors: string[];
    count: number;
    running: boolean;
  }> {
    return this.request("/api/dev/errors");
  }

  async clearDevServerErrors(): Promise<void> {
    await this.request("/api/dev/errors/clear", { method: "POST" });
  }

  // ---- WiFi ----

  async scanWifi(): Promise<WifiNetwork[]> {
    const data = await this.request<{ networks: WifiNetwork[] }>(
      "/api/wifi/scan"
    );
    return data.networks;
  }

  async connectWifi(ssid: string, password: string): Promise<void> {
    await this.request("/api/wifi/connect", {
      method: "POST",
      body: JSON.stringify({ ssid, password }),
    });
  }

  async getWifiStatus(): Promise<{
    mode: string;
    ssid: string | null;
    ip: string | null;
  }> {
    return this.request("/api/wifi/status");
  }

  // ---- HA entities (REST) ----

  async getEntities(): Promise<Record<string, HAEntity>> {
    const data = await this.request<{ entities: Record<string, HAEntity> }>(
      "/api/ha/entities"
    );
    return data.entities;
  }

  async callService(
    domain: string,
    service: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.request("/api/ha/service", {
      method: "POST",
      body: JSON.stringify({ domain, service, data }),
    });
  }

  async getAreas(): Promise<Array<{ area_id: string; name: string }>> {
    const data = await this.request<{
      areas: Array<{ area_id: string; name: string }>;
    }>("/api/ha/areas");
    return data.areas;
  }

  async getDevices(): Promise<
    Array<{
      id: string;
      name: string;
      manufacturer: string;
      model: string;
      area_id: string;
    }>
  > {
    const data = await this.request<{ devices: any[] }>("/api/ha/devices");
    return data.devices;
  }

  // ---- WebSocket for real-time HA entity streaming ----

  connectWebSocket(): void {
    const wsUrl = this.baseUrl.replace("http", "ws") + "/ws";
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event: WebSocketMessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "ha:entities") {
          for (const fn of this.entityListeners) fn(msg.data);
        }

        if (msg.type === "ha:status") {
          for (const fn of this.statusListeners) fn(msg.data);
        }
      } catch {}
    };

    this.ws.onclose = () => {
      // Auto-reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = () => {
      // Will trigger onclose
    };
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onEntitiesChanged(
    fn: (entities: Record<string, HAEntity>) => void
  ): () => void {
    this.entityListeners.add(fn);
    return () => this.entityListeners.delete(fn);
  }

  onHAStatusChanged(
    fn: (status: { connected: boolean }) => void
  ): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  /**
   * Send an HA service call over WebSocket (lower latency than REST).
   */
  callServiceWS(
    domain: string,
    service: string,
    data?: Record<string, any>
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ type: "ha:service", domain, service, data })
      );
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
