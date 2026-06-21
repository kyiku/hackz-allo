import Foundation

/// トランプのスート。色（赤/黒）でペア判定に用いる。
enum Suit: CaseIterable, Equatable {
    case spades   // ♠ 黒
    case hearts   // ♥ 赤
    case diamonds // ♦ 赤
    case clubs    // ♣ 黒

    var symbol: String {
        switch self {
        case .spades: return "♠"
        case .hearts: return "♥"
        case .diamonds: return "♦"
        case .clubs: return "♣"
        }
    }

    var isRed: Bool { self == .hearts || self == .diamonds }
}

/// 1枚のカードの論理表現（ランク 0..12 ＋ スート）。
struct Card: Equatable {
    let rank: Int
    let suit: Suit
    /// 報酬カードのとき、対応する効果ID（枠の増減）。標準カードは nil。
    var effectId: String? = nil
    /// 報酬カードのとき、面に表示する短いラベル。
    var label: String? = nil

    /// ペア判定キー（標準モードのみ使用＝同ランク＋同色）。
    /// 報酬カードは台パン後の表向き読み取りで確定するためペア判定には使わないが、
    /// 効果ID単位で区別できるよう rank をオフセットしてキー化する。
    var matchKey: Int {
        if effectId != nil { return 1000 + rank }
        return rank * 2 + (suit.isRed ? 1 : 0)
    }
}

/// 報酬カードの素材（効果ID＋表示ラベル）。神経衰弱の報酬デッキ生成に渡す。
struct RewardCardSpec: Equatable {
    let effectId: String
    let label: String
}

/// 標準52枚デッキ（13ランク×4スート）を構築する。ペアは同ランク＋同色で必ず成立可能（26ペア）。
enum DeckFactory {
    /// ランク数（A,2..10,J,Q,K）。
    static let rankCount = 13

    /// 13ランク×4スート＝52枚の標準デッキ。
    static func makeStandardDeck(shuffled: Bool = true) -> [Card] {
        let deck = Suit.allCases.flatMap { suit in
            (0..<rankCount).map { rank in Card(rank: rank, suit: suit) }
        }
        return shuffled ? deck.shuffled() : deck
    }

    /// 報酬デッキ: 各効果カードにつき1枚。ペアは作らない（台パン3回後の表向きカードを読み取って確定する）。
    /// rank には効果インデックスを埋め込み、スートは見た目の差し色のみ。
    static func makeRewardDeck(specs: [RewardCardSpec], shuffled: Bool = true) -> [Card] {
        let deck = specs.enumerated().map { index, spec in
            Card(rank: index, suit: .spades, effectId: spec.effectId, label: spec.label)
        }
        return shuffled ? deck.shuffled() : deck
    }
}
