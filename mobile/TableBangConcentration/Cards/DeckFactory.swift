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
    /// 報酬カードのとき、対応する強化能力ID（標準カードは nil）。
    var abilityId: String? = nil
    /// 報酬カードのとき、面に表示する短い名前。
    var rewardName: String? = nil

    /// ペア判定キー。報酬カードは能力インデックス(rank)で一致、標準は同ランク＋同色。
    var matchKey: Int {
        if abilityId != nil { return 1000 + rank }
        return rank * 2 + (suit.isRed ? 1 : 0)
    }
}

/// 報酬カードの素材（能力ID＋表示名）。神経衰弱の報酬デッキ生成に渡す。
struct RewardCardSpec: Equatable {
    let abilityId: String
    let name: String
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

    /// 報酬デッキ: 各能力につき同一カード2枚（ペア）。能力インデックスを rank に埋め込む。
    /// スートは見た目の差し色のみ（ペア判定は能力IDで行う）。
    static func makeRewardDeck(specs: [RewardCardSpec], shuffled: Bool = true) -> [Card] {
        let deck = specs.enumerated().flatMap { index, spec -> [Card] in
            let suits: [Suit] = [.spades, .hearts]
            return suits.map { suit in
                Card(rank: index, suit: suit, abilityId: spec.abilityId, rewardName: spec.name)
            }
        }
        return shuffled ? deck.shuffled() : deck
    }
}
