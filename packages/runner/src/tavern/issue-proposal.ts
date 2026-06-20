import { z } from 'zod/v4'
import type { StructuredGenerator } from '../ai/structured-generator.js'

/**
 * 酒場: issue案生成（要件5.9）。
 * 会話＋コード分析からタイトル/本文/ラベルを生成する。
 */

const issueProposalSchema = z.object({
  title: z.string().describe('簡潔なIssueタイトル'),
  body: z.string().describe('再現/期待動作/対象を含むIssue本文'),
  labels: z.array(z.string()).describe('bug/refactor/security/enhancement 等のラベル'),
})

export interface IssueProposal {
  title: string
  body: string
  labels: string[]
}

export interface GenerateIssueProposalParams {
  conversation: string
  codeContext?: string
}

/** 会話とコード文脈から issue案を生成する。 */
export async function generateIssueProposal(
  generator: StructuredGenerator,
  { conversation, codeContext }: GenerateIssueProposalParams,
): Promise<IssueProposal> {
  const contextBlock = codeContext ? `\n\n## コード文脈\n${codeContext}` : ''
  return generator.generate(issueProposalSchema, {
    system:
      'あなたは酒場の主人です。冒険者(開発者)との会話とコードから、取り組むべきGitHub Issueの案を作成してください。',
    prompt: `## 会話\n${conversation}${contextBlock}`,
  })
}
