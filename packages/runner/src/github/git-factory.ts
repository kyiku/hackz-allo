import { simpleGit } from 'simple-git'
import type { SimpleGitLike } from './git-client.js'

/** 指定ディレクトリに対する simple-git インスタンスを生成する。 */
export function createGit(cwd: string): SimpleGitLike {
  return simpleGit(cwd) as unknown as SimpleGitLike
}
