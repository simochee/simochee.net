/** サーバーが返した、画面にそのまま出せる失敗の知らせ。 */
export class ApiError extends Error {}

const unreachable = "通信できませんでした。時間をおいてもう一度お試しください。";

export async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(unreachable);
  }
  const data = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
  if (!response.ok) throw new ApiError(data?.error ?? unreachable);
  return data as T;
}

/** 同じページの中では一度だけ読み、ページを移ったら読みなおす。 */
export function perPage<T>(load: () => Promise<T>) {
  let cached: Promise<T> | undefined;
  document.addEventListener("astro:before-swap", () => (cached = undefined));
  return {
    get: () =>
      (cached ??= load().catch((error: unknown) => {
        cached = undefined;
        throw error;
      })),
    refresh: () => (cached = undefined),
  };
}
