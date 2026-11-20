import type { ProductDemoPort } from "@/data/ports/product-demo-port";

/**
 * Production-facing placeholder. It deliberately implements no demo mutations.
 * A backend team can implement ProductDemoPort against the documented /api/v1
 * contracts without changing product components.
 */
export type HttpProductAdapter = ProductDemoPort;

export const API_V1_BASE = "/api/v1";
