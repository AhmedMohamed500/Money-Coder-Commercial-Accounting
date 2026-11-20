import { describe, expect, it, vi } from "vitest";
import { HttpProductAdapter, type HttpTransport } from "@/data/adapters/http/http-product-adapter";

describe("HTTP product adapter boundary", () => {
  it("is inert until an injected transport is called", () => {
    const transport: HttpTransport = { request: vi.fn() };
    new HttpProductAdapter(transport);
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("encodes tenant paths and forwards cancellation", async () => {
    const request = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
    const adapter = new HttpProductAdapter({ request });
    const controller = new AbortController();
    await adapter.listOrganizations("next page", controller.signal);
    expect(request).toHaveBeenCalledWith({ method: "GET", path: "/api/v1/organizations?cursor=next+page", signal: controller.signal });
  });

  it("sends idempotency and optimistic concurrency headers", async () => {
    const request = vi.fn().mockResolvedValue({ id: "row-1" });
    const adapter = new HttpProductAdapter({ request });
    await adapter.mapBankRow("import/1", "row 1", { accountId: "account-1", expectedRevision: 4 }, "idem-1");
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: "PATCH",
      path: "/api/v1/bank-statement-imports/import%2F1/rows/row%201/mapping",
      body: { accountId: "account-1" },
      headers: { "Idempotency-Key": "idem-1", "If-Match": "4" },
    }));
  });
});
