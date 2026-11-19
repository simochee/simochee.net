import { expect, test } from "vitest";
import { shares } from "../src/lib/poll";
import { pollResult, vote } from "../src/server/poll";
import { migratedD1 } from "./support/d1";

test("アンケートは 1 人 1 票で、投票しなおしても最初の票のまま", async () => {
  const db = await migratedD1();
  await vote(db, "winter", "a", 0);
  await vote(db, "winter", "a", 2);
  await vote(db, "winter", "b", 2);
  expect(await pollResult(db, "winter", 4, "a")).toEqual({
    votes: [1, 0, 1, 0],
    total: 2,
    choice: 0,
  });
  expect((await pollResult(db, "winter", 4, "c")).choice).toBeNull();
});

test("質問を変えると、前の質問の票とは混ざらない", async () => {
  const db = await migratedD1();
  await vote(db, "autumn", "a", 1);
  expect(await pollResult(db, "winter", 4, "a")).toEqual({
    votes: [0, 0, 0, 0],
    total: 0,
    choice: null,
  });
});

test("割合は整数で、合計がちょうど 100% になる", () => {
  expect(shares([1, 1, 1])).toEqual([34, 33, 33]);
  expect(shares([2, 1, 1, 1])).toEqual([40, 20, 20, 20]);
  expect(shares([0, 0])).toEqual([0, 0]);
});
