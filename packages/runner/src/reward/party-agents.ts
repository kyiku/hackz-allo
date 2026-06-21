import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'
import { buildPartyAgents } from './party.js'

/** partySize から実サブエージェント定義(query()の agents)を組み立てる。本体1＋仲間 size-1。 */
export function buildPartyAgentDefinitions(partySize: number): Record<string, AgentDefinition> {
  const companions = buildPartyAgents(partySize)
  const agents: Record<string, AgentDefinition> = {}
  for (const role of companions) {
    agents[role.name] = {
      description: role.description,
      prompt: `あなたは「${role.name}」。${role.description} TDDの品質を高めることに専念せよ。`,
      model: 'inherit',
    }
  }
  return agents
}
