import { useCallback, useEffect, useState } from "react";

export type AsyncStatus = "idle" | "loading" | "error" | "empty" | "ready";

export interface UseAsyncOptions<T> {
  isEmpty?: (data: T) => boolean;
  keepPreviousData?: boolean;
}

export interface UseAsyncResult<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  isRefetching: boolean;
}

/**
 * Hook to manage asynchronous data loading with automatic AbortController cleanup,
 * retry triggers, discrete UI status, and optional "keepPreviousData" to prevent layout shifts.
 */
export function useAsync<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  optionsOrIsEmpty?: ((data: T) => boolean) | UseAsyncOptions<T>
): UseAsyncResult<T> {
  const options: UseAsyncOptions<T> =
    typeof optionsOrIsEmpty === "function"
      ? { isEmpty: optionsOrIsEmpty }
      : optionsOrIsEmpty ?? {};

  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const reload = useCallback(() => {
    setError(null);
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    queueMicrotask(() => {
      if (active) {
        setStatus("loading");
      }
    });

    asyncFn(controller.signal)
      .then((result) => {
        if (active) {
          setData(result);
          const empty = options.isEmpty
            ? options.isEmpty(result)
            : Array.isArray(result)
              ? result.length === 0
              : result === null || result === undefined;
          setStatus(empty ? "empty" : "ready");
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "An unexpected error occurred.";
          setError(message);
          setStatus("error");
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTrigger, ...deps]);

  const isRefetching = status === "loading" && data !== null;

  return { data, status, error, reload, setData, isRefetching };
}
