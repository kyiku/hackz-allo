import { useRef, useState } from 'react'
import { BattleScreen } from '../battle/BattleScreen'
import { BlacksmithPanel } from '../blacksmith/BlacksmithPanel'
import { ConnectedRepoConnectPanel } from '../connect/RepoConnectPanel'
import type { InteractTarget } from '../map/MapScene'
import { MapView, type MapControls } from '../map/MapView'
import { enemyName } from '../npc/enemyName'
import { NpcEncounter } from '../npc/NpcEncounter'
import { ConnectedStatusScreen } from '../status/StatusScreen'
import { useGameStore, type ConnectionStatus } from '../store/gameStore'
import { ConnectedTavernPanel } from '../tavern/TavernPanel'
import { InteriorScreen } from '../ui/InteriorScreen'
import { TouchControls } from '../ui/TouchControls'
import { Modal } from '../ui/Modal'

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: '接続中…',
  open: '接続済み',
  closed: '切断',
}

const CONNECTION_COLOR: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-500',
  open: 'bg-emerald-500',
  closed: 'bg-rose-500',
}

/** マップNPCインタラクトで開くオーバーレイの種別。 */
type Overlay = InteractTarget | null

/**
 * ワールド画面（タスク#117）。フルスクリーンマップを主役に、
 * NPCインタラクトで各機能（鍛冶屋/酒場/賢者/敵会話）をモーダルで開く。
 */
export function WorldScreen() {
  const connection = useGameStore((s) => s.connection)
  const world = useGameStore((s) => s.world)
  const enemies = useGameStore((s) => s.enemies)
  const battles = useGameStore((s) => s.battles)
  const send = useGameStore((s) => s.send)

  const [overlay, setOverlay] = useState<Overlay>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const mapRef = useRef<MapControls>(null)

  const enemyList = Object.values(enemies)
  const battleList = Object.values(battles)
  const closeOverlay = () => setOverlay(null)
  const modalOpen = overlay !== null || connectOpen

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-rpg-bg text-rpg-ink">
      {/* フルスクリーンマップ（主役） */}
      <div className="absolute inset-0">
        <MapView
          ref={mapRef}
          enemies={enemyList}
          onInteract={(target) => setOverlay(target)}
          paused={modalOpen}
        />
      </div>

      {/* モバイル向け画面コントロール（小画面のみ・モーダル中は隠す） */}
      {!modalOpen && (
        <TouchControls
          onMove={(dir) => mapRef.current?.move(dir)}
          onAction={() => mapRef.current?.interact()}
        />
      )}

      {/* 縦持ちスマホには横向き推奨を案内（マップは横長のため） */}
      <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-rpg-bg p-6 text-center landscape:hidden lg:hidden">
        <span className="text-5xl" aria-hidden>
          📱↻
        </span>
        <p className="font-pixel text-lg text-rpg-gold">横向きにしてください</p>
        <p className="text-sm text-rpg-muted">マップは横画面でより快適に遊べます</p>
      </div>

      {/* ビネット（周辺減光）で奥行きと没入感を出す */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 52%, rgba(6,10,20,0.55) 100%)',
        }}
      />
      {/* 上下の軽いグラデで HUD/メッセージを馴染ませる */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rpg-bg/70 to-transparent"
      />

      {/* 上部HUD：接続状態・リポジトリ（スワイプ面より前面でタップ可能に） */}
      <div className="pointer-events-none absolute left-3 top-3 z-40 flex items-center gap-3">
        <span className="rpg-window pointer-events-auto flex items-center gap-2 px-3 py-1.5 font-pixel text-sm text-rpg-ink">
          <span className={`h-2.5 w-2.5 rounded-full ${CONNECTION_COLOR[connection]}`} />
          {CONNECTION_LABEL[connection]}
        </span>
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="rpg-window pointer-events-auto px-3 py-1.5 font-pixel text-sm text-rpg-ink hover:text-rpg-gold"
        >
          {world ? `${world.repoOwner}/${world.repoName}` : 'リポジトリ接続'}
        </button>
      </div>

      {/* 戦闘は進行中だけサイドパネルで表示（マップを隠さない） */}
      {battleList.length > 0 && (
        <div className="absolute right-3 top-14 z-40 flex max-h-[80vh] w-96 max-w-[90vw] flex-col gap-3 overflow-y-auto">
          {battleList.map((battle) => (
            <BattleScreen key={battle.battleId} battleId={battle.battleId} />
          ))}
        </div>
      )}

      {/* 敵（issue）NPCはフィールドの遭遇イベントとしてモーダルで会話 */}
      {overlay?.kind === 'enemy' &&
        (() => {
          const enemy = enemies[overlay.enemyId]
          const title = enemy
            ? enemyName(enemy.difficulty, enemy.issueNumber)
            : `NPC会話 — #${overlay.issueNumber}`
          return (
            <Modal title={title} onClose={closeOverlay}>
              <NpcEncounter enemyId={overlay.enemyId} onClose={closeOverlay} />
            </Modal>
          )
        })()}

      {/* 施設（鍛冶屋/酒場/賢者）は全画面の店内ビューで入店 */}
      {overlay?.kind === 'blacksmith' && (
        <InteriorScreen kind="blacksmith" onClose={closeOverlay}>
          <BlacksmithPanel
            enemies={enemyList}
            battles={battleList}
            onForge={(issueNumber) => {
              send({ type: 'cmd.forge', issueNumber })
              closeOverlay()
            }}
          />
        </InteriorScreen>
      )}
      {overlay?.kind === 'tavern' && (
        <InteriorScreen kind="tavern" onClose={closeOverlay}>
          <ConnectedTavernPanel />
        </InteriorScreen>
      )}
      {overlay?.kind === 'sage' && (
        <InteriorScreen kind="sage" onClose={closeOverlay}>
          <ConnectedStatusScreen />
        </InteriorScreen>
      )}

      {connectOpen && (
        <Modal title="リポジトリ接続" onClose={() => setConnectOpen(false)}>
          <ConnectedRepoConnectPanel />
        </Modal>
      )}
    </div>
  )
}
