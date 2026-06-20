import { describe, expect, it, vi } from 'vitest'
import { createJobDispatcher } from './dispatcher'

function handlers() {
  return {
    onForge: vi.fn(async () => {}),
    onSpell: vi.fn(async () => {}),
    onStop: vi.fn(async () => {}),
    onTavern: vi.fn(async () => {}),
    onTavernPublish: vi.fn(async () => {}),
    onLoadoutEquip: vi.fn(async () => {}),
    onLoadoutTune: vi.fn(async () => {}),
    onConnect: vi.fn(async () => {}),
  }
}

describe('createJobDispatcher', () => {
  it('cmd.forge を onForge に振り分ける', async () => {
    const h = handlers()
    await createJobDispatcher(h).dispatch({ type: 'cmd.forge', issueNumber: 42 })
    expect(h.onForge).toHaveBeenCalledWith(42)
  })

  it('spell.cast を onSpell に振り分ける', async () => {
    const h = handlers()
    await createJobDispatcher(h).dispatch({
      type: 'spell.cast',
      battleId: 'b1',
      message: 'null確認',
    })
    expect(h.onSpell).toHaveBeenCalledWith('b1', 'null確認')
  })

  it('cmd.stop / cmd.tavern / cmd.connect を振り分ける', async () => {
    const h = handlers()
    const d = createJobDispatcher(h)
    await d.dispatch({ type: 'cmd.stop', battleId: 'b1' })
    await d.dispatch({ type: 'cmd.tavern', message: 'バグ直したい' })
    await d.dispatch({ type: 'cmd.connect', repoUrl: 'https://github.com/k/r' })
    expect(h.onStop).toHaveBeenCalledWith('b1')
    expect(h.onTavern).toHaveBeenCalledWith('バグ直したい')
    expect(h.onConnect).toHaveBeenCalledWith('https://github.com/k/r')
  })

  it('cmd.tavern.publish を onTavernPublish に振り分ける', async () => {
    const h = handlers()
    const draft = { title: 'NPEを直す', body: 'null安全に', labels: ['bug'] }
    await createJobDispatcher(h).dispatch({ type: 'cmd.tavern.publish', draft })
    expect(h.onTavernPublish).toHaveBeenCalledWith(draft)
  })

  it('cmd.loadout.equip / cmd.loadout.tune を振り分ける', async () => {
    const h = handlers()
    const d = createJobDispatcher(h)
    await d.dispatch({ type: 'cmd.loadout.equip', equipmentId: 3, equipped: true })
    await d.dispatch({ type: 'cmd.loadout.tune', tuning: { effort: 'high', partySize: 2 } })
    expect(h.onLoadoutEquip).toHaveBeenCalledWith(3, true)
    expect(h.onLoadoutTune).toHaveBeenCalledWith({ effort: 'high', partySize: 2 })
  })

  it('未知のイベントは例外', async () => {
    const h = handlers()
    await expect(createJobDispatcher(h).dispatch({ type: 'unknown' } as never)).rejects.toThrow()
  })
})
