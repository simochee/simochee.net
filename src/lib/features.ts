import { SIMOCHEE_PREVIEW } from "astro:env/server";

/** コメント・拍手・掲示板など、Worker の API を呼ぶ部品を出すか。プレビューは静的ファイルだけで配信するので出さない。 */
export const hasServer = !SIMOCHEE_PREVIEW;
