/**
 * ステータス画面(賢者の家)の表示ロジック。
 * 装備所有は廃止し、神経衰弱で得た「枠(容量)」へ MCP/モデル/サブエージェントを割り当てる。
 */

/**
 * MCP ref のトグル結果を返す（イミュータブル）。
 * 選択を外す場合は常に許可。選択を追加する場合は `mcpSlots` を超えない範囲でのみ許可し、
 * 上限超過時は元の配列をそのまま返す。
 */
export function toggleMcpRef(refs: readonly string[], ref: string, mcpSlots: number): string[] {
  if (refs.includes(ref)) {
    return refs.filter((r) => r !== ref)
  }
  if (refs.length >= mcpSlots) {
    return [...refs]
  }
  return [...refs, ref]
}
