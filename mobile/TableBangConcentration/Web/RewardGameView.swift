import SwiftUI
import Combine

/// 報酬ミニゲームの1枚のカード（2Dで確実に表示する）。
private struct RewardCard: Identifiable {
    let id = UUID()
    let abilityId: String
    let name: String
    var faceUp = false
    var collected = false
}

/// 敵撃破の報酬ミニゲーム（台パン神経衰弱・2D表示）。
/// カメラ越しの「台パン」（または画面タップ）で2枚めくり、同じ強化アイテムのペアを当てると獲得。
/// AR物理に依存せずカードを必ず描画する。獲得能力IDを `onComplete` で返す。
struct RewardGameView: View {
    let specs: [RewardCardSpec]
    let onComplete: ([String]) -> Void

    /// カメラ表示と台パン検出のためだけに使う（盤面は置かない）。
    @StateObject private var engine: GameEngine
    @State private var cards: [RewardCard]
    @State private var swingsLeft: Int
    @State private var busy = false
    @State private var finished = false

    private static let maxSwings = 3

    init(specs: [RewardCardSpec], onComplete: @escaping ([String]) -> Void) {
        self.specs = specs
        self.onComplete = onComplete
        _engine = StateObject(wrappedValue: GameEngine.reward(specs: specs))
        var deck: [RewardCard] = []
        for spec in specs {
            deck.append(RewardCard(abilityId: spec.abilityId, name: spec.name))
            deck.append(RewardCard(abilityId: spec.abilityId, name: spec.name))
        }
        _cards = State(initialValue: deck.shuffled())
        _swingsLeft = State(initialValue: RewardGameView.maxSwings)
    }

    var body: some View {
        ZStack {
            ARViewContainer(controller: engine.scene).ignoresSafeArea()
            Color.black.opacity(0.4).ignoresSafeArea()
            if finished { resultView } else { playView }
            cancelButton
        }
        .onReceive(engine.swings) { _ in performTurn() }
    }

    // MARK: - プレイ

    private var playView: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("⚡ 報酬チャレンジ").font(.title2.bold()).foregroundStyle(.white)
                Text("台パン（または画面タップ）で2枚めくる！　残り \(swingsLeft) 回")
                    .font(.subheadline.bold())
                    .foregroundStyle(.yellow)
            }
            .padding(.top, 48)

            cardGrid

            Spacer()
            Text("同じ強化アイテムのペアを当てると獲得！")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.8))
                .padding(.bottom, 24)
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
        .onTapGesture { performTurn() }
    }

    private var cardGrid: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)
        return LazyVGrid(columns: columns, spacing: 10) {
            ForEach(cards) { card in cardTile(card) }
        }
    }

    private func cardTile(_ card: RewardCard) -> some View {
        let revealed = card.faceUp || card.collected
        return ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    card.collected
                        ? Color.green.opacity(0.35)
                        : (revealed ? Color(red: 0.99, green: 0.97, blue: 0.86) : Color(red: 0.15, green: 0.2, blue: 0.55))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(card.collected ? Color.green : Color.white.opacity(0.4), lineWidth: 2)
                )
            if revealed {
                VStack(spacing: 4) {
                    Text("⚡").font(.title2)
                    Text(card.name)
                        .font(.caption2.bold())
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.black)
                        .lineLimit(3)
                }
                .padding(4)
            } else {
                Image(systemName: "questionmark.diamond.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.white.opacity(0.7))
            }
            if card.collected {
                VStack {
                    HStack {
                        Spacer()
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                    }
                    Spacer()
                }
                .padding(4)
            }
        }
        .frame(height: 96)
    }

    // MARK: - 1ターン（2枚めくる）

    private func performTurn() {
        guard !busy, !finished, swingsLeft > 0 else { return }
        let downIndices = cards.indices.filter { !cards[$0].faceUp && !cards[$0].collected }
        guard downIndices.count >= 2 else { return }
        let picks = Array(downIndices.shuffled().prefix(2))
        busy = true
        swingsLeft -= 1
        for index in picks { cards[index].faceUp = true }

        let isMatch = cards[picks[0]].abilityId == cards[picks[1]].abilityId
        let delay = isMatch ? 0.6 : 1.0
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            if isMatch {
                for index in picks { cards[index].collected = true }
            } else {
                for index in picks { cards[index].faceUp = false }
            }
            busy = false
            if cards.allSatisfy({ $0.collected }) || swingsLeft <= 0 {
                finished = true
            }
        }
    }

    // MARK: - 結果

    private var acquiredIds: [String] {
        var seen = Set<String>()
        var out: [String] = []
        for card in cards where card.collected {
            if !seen.contains(card.abilityId) {
                seen.insert(card.abilityId)
                out.append(card.abilityId)
            }
        }
        return out
    }

    private var resultView: some View {
        let names = cards.filter { $0.collected }.map { $0.name }
        let unique = Array(Set(names)).sorted()
        return VStack(spacing: 18) {
            Spacer()
            Text("⚡ 強化獲得！").font(.largeTitle.bold()).foregroundStyle(.white)
            if unique.isEmpty {
                Text("今回は当たらなかった…次は当てよう！").foregroundStyle(.white.opacity(0.85))
            } else {
                VStack(spacing: 10) {
                    ForEach(unique, id: \.self) { name in
                        Text("・\(name)").font(.title3.bold()).foregroundStyle(.yellow)
                    }
                }
            }
            Spacer()
            Button(action: { onComplete(acquiredIds) }) {
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
                Button(action: { onComplete(acquiredIds) }) {
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
