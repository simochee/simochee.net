import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer, request, type IncomingMessage } from "node:http";
import { connect } from "node:net";

// ブラウザで開くのは front だけ。本番で Worker が入口になるのと同じ振り分けを、手元でこのスクリプトが行う。
const front = Number(process.env.PORT ?? 4321);
const site = front + 1;
const worker = 8787;
const host = "127.0.0.1";
const target = (incoming: IncomingMessage) => (incoming.url?.startsWith("/api/") ? worker : site);

// cf dev は配信するファイルの置き場所がないと起動しない。開発中のページは Astro が出すので、中身は空でよい。
mkdirSync("dist", { recursive: true });

const children: ChildProcess[] = [];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  server.close();
  // pnpm が間に入るので、子だけを止めても dev サーバー本体が残る。プロセスグループごと止める。
  for (const child of children) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
    } catch {
      // すでに終了している側は止めるものがない。
    }
  }
  process.exitCode = code;
}
function start(label: string, args: string[], cwd?: string) {
  const child = spawn("pnpm", ["exec", ...args], {
    cwd,
    env: { ...process.env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n"))
        if (line.trim()) console.log(`[${label}] ${line}`);
    });
  // 片方だけが落ちたまま動き続けると、/api/ だけ失敗するような気づきにくい状態になる。
  child.on("exit", (code) => stop(code ?? 0));
  children.push(child);
}

const server = createServer((incoming, outgoing) => {
  const upstream = request(
    {
      host,
      port: target(incoming),
      path: incoming.url,
      method: incoming.method,
      headers: incoming.headers,
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    },
  );
  upstream.on("error", () => {
    outgoing.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    outgoing.end("起動中です。少し待ってから読み込み直してください。");
  });
  incoming.pipe(upstream);
});
// ページの自動更新（HMR）は WebSocket なので、接続をそのまま Astro へつなぐ。
server.on("upgrade", (incoming, socket, head) => {
  const upstream = connect(target(incoming), host, () => {
    const headers = Object.entries(incoming.headers).map(
      ([name, value]) => `${name}: ${String(value)}`,
    );
    upstream.write(
      `${incoming.method} ${incoming.url} HTTP/${incoming.httpVersion}\r\n${headers.join("\r\n")}\r\n\r\n`,
    );
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

start("worker", ["cf", "dev", "--port", String(worker), "--ip", host], "worker");
start("site", ["astro", "dev", "--port", String(site), "--host", host, ...process.argv.slice(2)]);
server.listen(front, host, () => {
  console.log(`[dev] http://localhost:${front}/ で開きます（/api/ は Worker、それ以外は Astro）`);
  console.log(
    `[dev] ローカルの KV・D1 などの中身は http://localhost:${worker}/cdn-cgi/local/explorer で見られます`,
  );
});
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
