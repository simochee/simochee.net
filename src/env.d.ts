// .cloudflare/types/index.d.ts（Workers の型一式）を読ませると、HTMLRewriter の Element などがブラウザの DOM の型を上書きし、
// クライアント側のスクリプトが型エラーになる。サーバー側のルートで使う分だけをここに書く。
declare module "cloudflare:workers" {
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
  }
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = Record<string, unknown>>(
      statements: D1PreparedStatement[],
    ): Promise<{ results: T[] }[]>;
  }
  export const env: {
    COUNTER_DB: D1Database;
  };
}
