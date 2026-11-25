import { counterDigits, visitBarRatios, type DailyVisits } from "./counter";

type Palette = Record<
  "accent" | "on-accent" | "paper" | "frame" | "line" | "ink" | "ink-sub" | "ink-strong",
  string
>;

function palette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const names = [
    "accent",
    "on-accent",
    "paper",
    "frame",
    "line",
    "ink",
    "ink-sub",
    "ink-strong",
  ] as const;
  return Object.fromEntries(
    names.map((name) => [name, style.getPropertyValue(`--color-${name}`).trim()]),
  ) as Palette;
}

export async function loadCounterFonts() {
  await Promise.allSettled([
    document.fonts.load("bold 14px Shinonome14", "0123456789"),
    document.fonts.load("12px Shinonome12", "この 7 日間のお客様今日昨人：0123456789"),
  ]);
}

function surface(width: number, height: number) {
  return Object.assign(document.createElement("canvas"), { width, height });
}

/** 文字を等倍で二値化してから拡大し、ドットの縁に中間色を作らない。 */
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  center = false,
) {
  const probe = surface(1, 1).getContext("2d")!;
  const font = scale === 2 ? "bold 14px Shinonome14" : "12px Shinonome12";
  probe.font = font;
  const width = Math.ceil(probe.measureText(value).width) + 4;
  const art = surface(width, 24);
  const ink = art.getContext("2d", { willReadFrequently: true })!;
  ink.font = font;
  ink.textBaseline = "top";
  ink.fillText(value, 2, 4);
  const pixels = ink.getImageData(0, 0, width, 24);
  let left = width,
    right = -1,
    top = 24,
    bottom = -1;
  for (let yy = 0; yy < 24; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const index = (yy * width + xx) * 4 + 3;
      const on = pixels.data[index]! >= 110;
      pixels.data[index] = on ? 255 : 0;
      if (on) {
        left = Math.min(left, xx);
        right = Math.max(right, xx);
        top = Math.min(top, yy);
        bottom = Math.max(bottom, yy);
      }
    }
  }
  if (right < 0) return;
  ink.putImageData(pixels, 0, 0);
  ink.globalCompositeOperation = "source-in";
  ink.fillStyle = color;
  ink.fillRect(0, 0, width, 24);
  const w = right - left + 1,
    h = bottom - top + 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    art,
    left,
    top,
    w,
    h,
    center ? Math.round(x - (w * scale) / 2) : x,
    y,
    w * scale,
    h * scale,
  );
}

/** 端末の画素へは整数倍の最近傍で写し、論理ピクセルの絵を保つ。 */
function paint(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const art = surface(width, height);
  draw(art.getContext("2d")!);
  const scale = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, 0, 0, canvas.width, canvas.height);
}

export function paintCounter(canvas: HTMLCanvasElement, total: number) {
  const colors = palette();
  const digits = counterDigits(total).split("");
  const width = digits.length * 24 + 6;
  paint(canvas, width, 40, (ctx) => {
    const frame = ctx.createLinearGradient(0, 0, 0, 40);
    frame.addColorStop(0, "#d8d8d8");
    frame.addColorStop(0.5, "#8c8c8c");
    frame.addColorStop(1, "#5c5c5c");
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, width, 40);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(3, 3, width - 6, 34);
    digits.forEach((digit, index) => {
      const x = 4 + index * 24;
      const last = index === digits.length - 1;
      const gradient = ctx.createLinearGradient(0, 4, 0, 36);
      if (last) {
        ctx.fillStyle = colors.accent;
        ctx.fillRect(x, 4, 22, 32);
        gradient.addColorStop(0, "rgb(0 0 0 / 0.65)");
        gradient.addColorStop(0.18, "rgb(0 0 0 / 0.3)");
        gradient.addColorStop(0.5, "rgb(0 0 0 / 0)");
        gradient.addColorStop(0.82, "rgb(0 0 0 / 0.3)");
        gradient.addColorStop(1, "rgb(0 0 0 / 0.7)");
      } else {
        ["#050505", "#262626", "#4a4a4a", "#262626", "#050505"].forEach((color, i) =>
          gradient.addColorStop([0, 0.18, 0.5, 0.82, 1][i]!, color),
        );
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(x, 4, 22, 32);
      text(ctx, digit, x + 11, 10, last ? colors["on-accent"] : "#f6f4ea", 2, true);
      ctx.fillStyle = "rgb(0 0 0 / 0.55)";
      ctx.fillRect(x, 20, 22, 1);
    });
  });
}

export function paintVisitChart(canvas: HTMLCanvasElement, days: readonly DailyVisits[]) {
  const colors = palette();
  const ratios = visitBarRatios(days);
  paint(canvas, 224, 140, (ctx) => {
    ctx.fillStyle = colors.frame;
    ctx.fillRect(0, 0, 224, 140);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(1, 1, 222, 138);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(1, 1, 222, 18);
    text(ctx, "この 7 日間のお客様", 6, 4, colors["on-accent"]);
    ctx.fillStyle = colors.line;
    for (const y of [30, 65]) {
      for (let x = 4; x < 220; x += 4) ctx.fillRect(x, y, 2, 1);
    }
    ctx.fillStyle = colors["ink-sub"];
    ctx.fillRect(4, 100, 216, 1);
    days.forEach(({ count }, index) => {
      const height = Math.round(ratios[index]! * 70);
      const x = 15 + index * 30,
        y = 100 - height;
      if (height > 0) {
        ctx.fillStyle = colors["ink-strong"];
        ctx.fillRect(x, y, 14, height);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(x + 1, y + 1, 12, height - 1);
        ctx.fillStyle = "rgb(255 255 255 / 0.45)";
        for (let yy = y + 2; yy < 100; yy += 2) ctx.fillRect(x + 2 + ((yy / 2) % 2), yy, 1, 1);
      }
      text(ctx, String(count), x + 7, 105, colors.ink, 1, true);
    });
    ctx.fillStyle = colors.line;
    ctx.fillRect(4, 118, 216, 1);
    text(ctx, `今日：${days.at(-1)?.count ?? 0}人`, 8, 122, colors.ink);
    text(ctx, `昨日：${days.at(-2)?.count ?? 0}人`, 112, 122, colors.ink);
  });
}
