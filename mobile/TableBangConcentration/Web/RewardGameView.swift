import SwiftUI

/// 敵撃破の報酬ミニゲーム（AR 台パン神経衰弱・報酬モード）。
/// カード＝強化アイテム、3回まで台パンして当てたペアの能力を獲得する。
/// クリア時に獲得能力IDを `onComplete` で返す（Web 経由で装備へ反映）。
struct RewardGameView: View {
    let specs: [RewardCardSpec]
    let onComplete: ([String]) -> Void

    @StateObject private var engine: GameEngine

    init(specs: [RewardCardSpec], onComplete: @escaping ([String]) -> Void) {
        self.specs = specs
        self.onComplete = onComplete
        _engine = StateObject(wrappedValue: GameEngine.reward(specs: specs))
    }

    /// 能力ID → 表示名（結果表示用）。
    private var nameById: [String: String] {
        Dictionary(uniqueKeysWithValues: specs.map { ($0.abilityId, $0.name) })
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
    }

    // MARK: - 配置

    private var placingView: some View {
        ZStack(alignment: .bottom) {
            ARViewContainer(controller: engine.scene, onTap: { point in
                engine.placeBoard(atScreenPoint: point)
            })
            .ignoresSafeArea()
            VStack(spacing: 12) {
                Text(engine.isPlaneReady
                    ? "⚡ 報酬チャレンジ：平面をタップして札を並べよう"
                    : "テーブルにカメラを向けてください")
                    .font(.subheadline)
                    .padding(8)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                #if targetEnvironment(simulator)
                Button("（シミュレータ）中央に配置して開始") { engine.placeBoardForSimulator() }
                    .buttonStyle(.borderedProminent)
                #endif
            }
            .padding(.bottom, 44)
            VStack { candidateBanner; Spacer() }
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

    /// AR描画に依存せず「今回の強化候補」を常時2Dで見せるバナー（カード＝AI強化を明示）。
    private var candidateBanner: some View {
        VStack(spacing: 4) {
            Text("⚡ 強化候補（ペアを当てて獲得）")
                .font(.caption.bold())
                .foregroundStyle(.white.opacity(0.9))
            HStack(spacing: 6) {
                ForEach(specs, id: \.abilityId) { spec in
                    Text(spec.name)
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
        .padding(.leading, 16)
        .padding(.trailing, 16)
    }

    private var swingsBadge: some View {
        let remaining = max(0, (engine.config.maxSwings ?? 0) - engine.gameState.turns)
        return Text("残り \(remaining) 回 台パン！")
            .font(.headline.bold())
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(.orange, in: Capsule())
            .foregroundStyle(.black)
            .padding(.top, 60)
            .padding(.leading, 16)
    }

    // MARK: - 結果

    private var resultView: some View {
        let acquired = engine.acquiredAbilityIds
        return VStack(spacing: 18) {
            Spacer()
            Text("⚡ 強化獲得！")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
            if acquired.isEmpty {
                Text("今回は当たらなかった…次は当てよう！")
                    .foregroundStyle(.white.opacity(0.8))
            } else {
                VStack(spacing: 10) {
                    ForEach(acquired, id: \.self) { id in
                        Text("・\(nameById[id] ?? id)")
                            .font(.title3.bold())
                            .foregroundStyle(.yellow)
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
            Spacer().frame(height: 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.85))
    }

    private var cancelButton: some View {
        VStack {
            HStack {
                Spacer()
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
