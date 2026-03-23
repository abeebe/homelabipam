import { describe, it, expect, vi } from "vitest";

// Mock prisma before importing proxmox
vi.mock("../prisma", () => ({
  prisma: {},
}));

import { extractIPFromConfig } from "./proxmox";

describe("extractIPFromConfig", () => {
  it("extracts IP from ipconfig0 cloud-init style", () => {
    const config = { ipconfig0: "ip=10.10.1.51/24,gw=10.10.1.1" };
    expect(extractIPFromConfig(config)).toBe("10.10.1.51");
  });

  it("extracts IP from net0 with ip= field", () => {
    const config = { net0: "virtio=AA:BB:CC:DD:EE:FF,bridge=vmbr0,ip=192.168.1.100" };
    expect(extractIPFromConfig(config)).toBe("192.168.1.100");
  });

  it("prefers ipconfig0 over net fields", () => {
    const config = {
      ipconfig0: "ip=10.10.1.51/24",
      net0: "ip=192.168.1.100",
    };
    expect(extractIPFromConfig(config)).toBe("10.10.1.51");
  });

  it("returns null when no IP found", () => {
    const config = { net0: "virtio=AA:BB:CC:DD:EE:FF,bridge=vmbr0" };
    expect(extractIPFromConfig(config)).toBeNull();
  });

  it("returns null for empty config", () => {
    expect(extractIPFromConfig({})).toBeNull();
  });

  it("handles DHCP ipconfig (no IP)", () => {
    const config = { ipconfig0: "ip=dhcp" };
    expect(extractIPFromConfig(config)).toBeNull();
  });
});
