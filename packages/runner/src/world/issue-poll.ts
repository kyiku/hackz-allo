/**
 * ワールドのポーリング差分（純関数）。
 * 直前に開いていた issue 番号集合と、今回取得した open issue 番号集合を比べ、
 * 「閉じられた（消えた）issue番号」を返す。これを enemy.removed として配信し、
 * クローズ済みの敵がマップに残り続けないようにする（要件5.2）。
 */

/** previous にあって current に無い番号（＝クローズされた敵）を返す。 */
export function removedIssueNumbers(
  previous: ReadonlySet<number>,
  current: ReadonlySet<number>,
): number[] {
  const removed: number[] = []
  for (const number of previous) {
    if (!current.has(number)) removed.push(number)
  }
  return removed
}
