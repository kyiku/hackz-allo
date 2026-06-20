import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'
import type { StructuredGenerator } from '../ai/index.js'
import { runForgeWithSdk } from '../ai/index.js'
import { createGitHubGateway, createOctokit } from '../github/index.js'
import { fetchOpenIssues, parseRepoUrl, generateRequiredTests } from '../world/index.js'
import type { BackendClient } from '../orchestration/backend-client.js'
import { runForgeBattle, type ForgeRunnerDeps } from './forge-runner.js'
import type { ForgeBattleIssue } from './forge-battle.js'

/**
 * forge 戦闘の実依存配線（Node/外部I/O）。
 * clone→ForgeAgent(Claude)→テスト実行→commit/push→PR を実体に結線する。
 * 秘密情報(PAT)はこの層の closure 内のみで扱う。
 */

export interface NodeForgeBattleDeps {
  githubPat: string
  generator: StructuredGenerator
  backend: BackendClient
  /** 現在接続中のリポジトリURL（onConnect が設定）。未接続なら null。 */
  getRepoUrl(): string | null
}

/** コマンドを実行し exit code と末尾出力を返す（テスト/インストール用）。 */
function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<{ code: number; tail: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], { cwd, env: { ...process.env, CI: 'true' } })
    let buffer = ''
    const onData = (chunk: Buffer) => {
      buffer = (buffer + chunk.toString()).slice(-4000)
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('error', (error) => resolve({ code: 1, tail: error.message }))
    child.on('close', (code) => resolve({ code: code ?? 1, tail: buffer.trim().slice(-400) }))
  })
}

/** 認証付きの clone URL（PATはRunner内に閉じる）。 */
function tokenizedUrl(owner: string, name: string, pat: string): string {
  return `https://x-access-token:${pat}@github.com/${owner}/${name}.git`
}

/**
 * cmd.forge を実体で処理する関数を組み立てる。
 * 返す関数を JobContext.forgeBattle に渡す。
 */
export function createNodeForgeBattle(
  config: NodeForgeBattleDeps,
): (issueNumber: number) => Promise<void> {
  const octokit = createOctokit(config.githubPat)
  const gateway = createGitHubGateway({ octokit })

  return async function forgeBattle(issueNumber: number): Promise<void> {
    const repoUrl = config.getRepoUrl()
    if (!repoUrl) {
      // battle.started を先に出してから失敗を通知し、クライアントの準備中表示が固まらないようにする。
      const battleId = `forge-${issueNumber}-0`
      await config.backend.emit({ type: 'battle.started', battleId, enemyId: issueNumber, hpTotal: 1 })
      await config.backend.emit({
        type: 'battle.failed',
        battleId,
        reason: 'リポジトリ未接続です。先にワールドへ接続してください。',
      })
      return
    }
    const { owner, name } = parseRepoUrl(repoUrl)
    const repo = { owner, name, url: repoUrl }

    const deps: ForgeRunnerDeps = {
      emit: (event) => config.backend.emit(event),

      async getIssue(num): Promise<ForgeBattleIssue | null> {
        const issues = await fetchOpenIssues(config.githubPat, repo)
        const found = issues.find((issue) => issue.number === num)
        return found ? { number: found.number, title: found.title, body: found.body, labels: found.labels } : null
      },

      generateTests: (issue) => generateRequiredTests(config.generator, issue),

      async prepareWorkspace(num, timestamp) {
        const path = await mkdtemp(join(tmpdir(), `forge-${num}-`))
        await simpleGit().clone(tokenizedUrl(owner, name, config.githubPat), path, ['--depth', '1'])
        const branch = `forge/issue-${num}-${timestamp}`
        await simpleGit(path).checkoutLocalBranch(branch)
        return { path, branch }
      },

      runAgent: ({ prompt, worktreePath }) => runForgeWithSdk({ prompt, worktreePath }),

      async runTests(worktreePath) {
        const install = await runCommand('npm', ['install', '--no-audit', '--no-fund'], worktreePath)
        if (install.code !== 0) {
          return { passed: false, summary: `npm install 失敗: ${install.tail}` }
        }
        const test = await runCommand('npm', ['test'], worktreePath)
        return { passed: test.code === 0, summary: test.tail }
      },

      async publish({ worktreePath, branch, issue }) {
        const git = simpleGit(worktreePath)
        await git.add('.')
        await git.commit(`feat: #${issue.number} ${issue.title} をTDDで解決`)
        await git.push('origin', branch)
        const connection = await gateway.connectRepository(repo)
        const pr = await gateway.createPullRequest({
          repo,
          title: `⚔️ #${issue.number} ${issue.title}`,
          head: branch,
          base: connection.defaultBranch,
          issueNumber: issue.number,
          body: 'GitHub Issue RPG の runner がTDDで自動実装しました。',
        })
        // ローカルテスト合格をゲートに、PRを squash マージする。
        // 本文の `Fixes #n` により、マージで対象issueが自動クローズ＝敵が撃破される。
        // 作成直後は mergeable 状態が未計算のことがあるため数回リトライする。
        let merged = false
        for (let attempt = 0; attempt < 6 && !merged; attempt += 1) {
          try {
            await octokit.rest.pulls.merge({
              owner: repo.owner,
              repo: repo.name,
              pull_number: pr.number,
              merge_method: 'squash',
            })
            merged = true
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
        if (!merged) {
          throw new Error(`PR #${pr.number} のマージに失敗しました（mergeable 状態を確認してください）`)
        }
        return pr.url
      },

      cleanup: (worktreePath) => rm(worktreePath, { recursive: true, force: true }),

      now: () => Date.now(),
    }

    await runForgeBattle(deps, { issueNumber })
  }
}
