import SwiftUI

/// 敵撃破の報酬ミニゲーム（AR 台パン神経衰弱・報酬モード）。
/// カード＝効果（枠の増減）。平面に盤面を置き（または「目の前に置く」）、3回台パンして
/// 散らす。3回目（＋3秒バッファ）の時点で表向きになっているカードの効果を獲得する。
/// クリア時に獲得効果IDを `onComplete` で返す。
struct RewardGameView: View {
    let specs: [RewardCardSpec]
    let onComplete: ([String]) -> Void

    @StateObject private var engine: GameEngine
    @State private var endingScheduled = false

    init(specs: [RewardCardSpec], onComplete: @escaping ([String]) -> Void) {
        self.specs = specs
        self.onComplete = onComplete
        _engine = StateObject(wrappedValue: GameEngine.reward(specs: specs))
    }

    /// 効果ID → 表示ラベル（結果表示用）。
    private var labelById: [String: String] {
        Dictionary(specs.map { ($0.effectId, $0.label) }, uniquingKeysWith: { first, _ in first })
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch engine.phase {
            case .placing: placingView
            case .playing: playingView
            case .clear: resultView
            }
        }
        .onAppear {
            // 入った瞬間にカメラ正面へ盤面を自動配置（向いている方向に確実に出す）。
            // ARのカメラ姿勢が安定するのを少し待ってから置く。
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                if engine.phase == .placing { engine.placeBoardInFront() }
            }
        }
        // 台パン上限に達したら、最後の衝撃波・ペア成立を反映する余白(3秒)を置いて結果へ。
        .onReceive(engine.gameState.$turns) { turns in
            guard let max = engine.config.maxSwings, turns >= max, !endingScheduled else { return }
            endingScheduled = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                engine.gameState.finishGame()
            }
        }
    }

    // MARK: - 配置

    private var placingView: some View {
        ZStack(alignment: .bottom) {
            ARViewContainer(controller: engine.scene, onTap: { point in
                engine.placeBoard(atScreenPoint: point)
            })
            .ignoresSafeArea()
            VStack { candidateBanner; Spacer() }
            VStack(spacing: 12) {
                Text(engine.isPlaneReady
                    ? "⚡ 平面をタップして札を並べよう"
                    : "テーブルにカメラを向けてください")
                    .font(.subheadline)
                    .padding(8)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                Button(action: { engine.placeBoardInFront() }) {
                    Text("目の前に置く（平面が出ない時）")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(.orange, in: Capsule())
                        .foregroundStyle(.black)
                }
                #if targetEnvironment(simulator)
                Button("（シミュレータ）中央に配置") { engine.placeBoardForSimulator() }
                    .buttonStyle(.borderedProminent)
                #endif
            }
            .padding(.bottom, 44)
            cancelButton
        }
    }

    // MARK: - プレイ（3振り）

    private var playingView: some View {
        ZStack(alignment: .topLeading) {
            ARViewContainer(controller: engine.scene)
                .ignoresSafeArea()
            HUDView(
                game: engine.gameState,
                isHandDetected: engine.isHandDetected,
                maxPower: engine.config.maxPower
            )
            VStack(spacing: 8) {
                swingsBadge
                candidateBanner
                Spacer()
            }
            cancelButton
        }
    }

    private var swingsBadge: some View {
        let remaining = max(0, (engine.config.maxSwings ?? 0) - engine.gameState.turns)
        return Text(remaining > 0 ? "残り \(remaining) 回 台パン！" : "判定中…")
            .font(.headline.bold())
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(remaining > 0 ? Color.orange : Color.gray, in: Capsule())
            .foregroundStyle(.black)
            .padding(.top, 60)
            .padding(.leading, 16)
    }

    /// AR描画に依存せず「今回の効果候補」を常時2Dで見せる（カード＝効果を明示）。
    private var candidateBanner: some View {
        VStack(spacing: 4) {
            Text("⚡ 効果候補（表向きにして獲得）")
                .font(.caption.bold())
                .foregroundStyle(.white.opacity(0.9))
            HStack(spacing: 6) {
                ForEach(Array(specs.enumerated()), id: \.offset) { _, spec in
                    Text(spec.label)
                        .font(.caption2.bold())
                        .lineLimit(1)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(.yellow.opacity(0.85), in: Capsule())
                        .foregroundStyle(.black)
                }
            }
        }
        .padding(8)
        .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    // MARK: - 結果

    private var resultView: some View {
        let acquired = engine.acquiredEffectIds
        return VStack(spacing: 18) {
            Spacer()
            Text("⚡ 効果獲得！").font(.largeTitle.bold()).foregroundStyle(.white)
            if acquired.isEmpty {
                Text("表向きのカードがありませんでした…").foregroundStyle(.white.opacity(0.85))
            } else {
                VStack(spacing: 10) {
                    ForEach(acquired, id: \.self) { id in
                        Text("・\(labelById[id] ?? id)").font(.title3.bold()).foregroundStyle(.yellow)
                    }
                }
            }
            Spacer()
            Button(action: { onComplete(acquired) }) {
                Text("受け取って戻る")
                    .font(.title3.bold())
                    .frame(maxWidth: 280)
                    .padding(.vertical, 14)
                    .background(.yellow, in: Capsule())
                    .foregroundStyle(.black)
            }
            Spacer().frame(height: 44)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.88))
    }

    private var cancelButton: some View {
        VStack {
            HStack {
                Spacer()
                // 中断（3回未満）は確定しない＝効果を送らない。
                Button(action: { onComplete([]) }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.85))
                        .padding(10)
                }
            }
            Spacer()
        }
    }
}
