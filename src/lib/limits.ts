/** 投稿欄の文字数の上限。入力欄の maxlength とサーバーの検証の両方で使う。 */
export const limits = {
  name: 40,
  title: 80,
  url: 200,
  body: 2000,
  password: 64,
} as const;

/** 掲示板の削除キー。「英数字8文字まで」と案内している。 */
export const deleteKeyPattern = "[A-Za-z0-9]{1,8}";
