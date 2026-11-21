"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { InMemoryDemoAdapter } from "@/data/adapters/demo/in-memory-demo-adapter";
import type { DemoExecutionResult, DemoOperationKey, DemoOperationState, ProductDemoPort } from "@/data/ports/product-demo-port";
import type { DemoState } from "@/domain/demo/types";

interface DemoContextValue {
  service: ProductDemoPort;
  state: DemoState;
  operation: DemoOperationState;
  execute<T>(key: DemoOperationKey, action: () => Promise<T>, successMessage?: string): Promise<DemoExecutionResult<T>>;
  retry(): Promise<void>;
  clearFeedback(): void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [adapter] = useState(() => new InMemoryDemoAdapter());
  const state = useSyncExternalStore(adapter.subscribe.bind(adapter), adapter.snapshot, adapter.snapshot);
  const [operation, setOperation] = useState<DemoOperationState>({ status: "idle", retryable: false });
  const lastAction = useRef<null | { key: DemoOperationKey; action: () => Promise<unknown>; successMessage?: string }>(null);

  const execute = useCallback(async <T,>(key: DemoOperationKey, action: () => Promise<T>, successMessage?: string) => {
    lastAction.current = { key, action, successMessage };
    setOperation({ status: "loading", key, message: "جارٍ تنفيذ الخطوة التجريبية…", retryable: false });
    try {
      const result = await action();
      setOperation(key === "navigate"
        ? { status: "idle", retryable: false }
        : { status: "success", key, message: successMessage ?? "تم تنفيذ الخطوة داخل العرض بنجاح.", retryable: false });
      return { ok: true as const, data: result };
    } catch (cause) {
      setOperation({ status: "error", key, error: cause instanceof Error ? cause.message : "تعذر تنفيذ الخطوة التجريبية.", retryable: true });
      return { ok: false as const };
    }
  }, []);

  const retry = useCallback(async () => {
    const previous = lastAction.current;
    if (previous) await execute(previous.key, previous.action, previous.successMessage);
  }, [execute]);

  const clearFeedback = useCallback(() => setOperation({ status: "idle", retryable: false }), []);

  useEffect(() => { void adapter.initialize(); }, [adapter]);

  return <DemoContext.Provider value={{ service: adapter, state, operation, execute, retry, clearFeedback }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
