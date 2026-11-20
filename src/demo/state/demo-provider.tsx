"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { InMemoryDemoAdapter } from "@/data/adapters/demo/in-memory-demo-adapter";
import type { ProductDemoPort } from "@/data/ports/product-demo-port";
import type { DemoState } from "@/domain/demo/types";

interface DemoContextValue {
  service: ProductDemoPort;
  state: DemoState;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [adapter] = useState(() => new InMemoryDemoAdapter());
  const state = useSyncExternalStore(adapter.subscribe.bind(adapter), adapter.snapshot, adapter.snapshot);

  useEffect(() => adapter.hydrateFromBrowser(), [adapter]);

  return <DemoContext.Provider value={{ service: adapter, state }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
