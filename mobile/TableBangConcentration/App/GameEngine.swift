import Foundation
import Combine
import RealityKit
import ARKit

/// アプリのオブジェクトグラフ（AR・カード・物理・ゲーム状態・結線）を束ねるライフサイクル管理（#31, #32）。
/// 画面遷移は `gameState.phase` の変化を公開し、`AppCoordinator` が購読する。
final class GameEngine: ObservableObject {
    let config: GameConfig
    let scene: ARSceneController
    let cardManager: CardManager
    let gameState: GameStateManager

    private let settleObserver: PhysicsSettleObserver
    private let swingDetector: HandSwingDetector
    private let handProvider: HandLandmarkProvider
    private let feedback: FeedbackController
    private let session: GameSession

    private var cancellables: Set<AnyCancellable> = []
    private var boardAnchor: AnchorEntity?

    @Published private(set) var phase: GamePhase = .placing
    /// 手検出の有無（HUD の補助ガイド表示に使う, 要件 9.4）。
    @Published private(set) var isHandDetected: Bool = false
    /// 配置可能な水平面を検出済みか（配置ガイド表示に使う, R1-5）。
    @Published private(set) var isPlaneReady: Bool = false

    /// 報酬モードの報酬カード仕様（nil なら通常の神経衰弱）。
    private let rewardSpecs: [RewardCardSpec]?

    /// 報酬モードで獲得した強化能力ID（クリア時に取り出す）。
    var acquiredAbilityIds: [String] { cardManager.collectedAbilityIds }

    /// 報酬モードの GameEngine を作る（3回振り下ろし上限＋報酬カード）。
    /// 札数が少ないので、視認性のためカードを大きめ＆間隔広めにする。
    static func reward(specs: [RewardCardSpec], maxSwings: Int = 3) -> GameEngine {
        var config = GameConfig.default
        config.maxSwings = maxSwings
        // 標準(0.05×0.07)より少し大きい程度。大きすぎると画面に収まらず近く見える。
        config.cardSize = SIMD3<Float>(0.07, 0.003, 0.10)
        config.cardSpacing = 0.115
        return GameEngine(config: config, rewardSpecs: specs)
    }

    init(config: GameConfig = .default, rewardSpecs: [RewardCardSpec]? = nil) {
        self.config = config
        self.rewardSpecs = rewardSpecs
        let scene = ARSceneController(config: config)
        let cardManager = CardManager()
        let gameState = GameStateManager(config: config)
        let settleObserver = PhysicsSettleObserver(cardManager: cardManager, config: config)
        let swingDetector = HandSwingDetector(config: config)
        let handProvider = VisionHandProvider()
        let feedback = FeedbackController()
        let session = GameSession(
            handProvider: handProvider,
            swingDetector: swingDetector,
            powerCalculator: PowerCalculator(config: config),
            shockwave: ShockwaveSystem(cardManager: cardManager, config: config),
            settleObserver: settleObserver,
            cardManager: cardManager,
            matchEvaluator: MatchEvaluator(),
            gameState: gameState,
            feedback: feedback
        )

        self.scene = scene
        self.cardManager = cardManager
        self.gameState = gameState
        self.settleObserver = settleObserver
        self.swingDetector = swingDetector
        self.handProvider = handProvider
        self.feedback = feedback
        self.session = session

        // カメラ1フィードを手検出＋静止監視へ分配（#30）。
        scene.frameConsumer = session
        session.start()

        gameState.$phase
            .receive(on: RunLoop.main)
            .sink { [weak self] in self?.phase = $0 }
            .store(in: &cancellables)

        // 手検出の有無を HUD ガイド用に反映（要件 9.4）。
        handProvider.samples
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in self?.isHandDetected = true }
            .store(in: &cancellables)

        // 配置可能な平面検出を配置ガイドへ反映（R1-5）。
        scene.planeReady
            .receive(on: RunLoop.main)
            .sink { [weak self] ready in self?.isPlaneReady = ready }
            .store(in: &cancellables)
    }

    /// タップした画面座標を水平面へ raycast 投影し、その点に盤面を固定してプレイ開始する（R2-1, R8-1）。
    /// 平面が取れなければ何もせず false を返す（配置ガイドで誘導, R1-4）。
    @discardableResult
    func placeBoard(atScreenPoint point: CGPoint) -> Bool {
        guard let anchor = scene.placeBoardAnchor(atScreenPoint: point) else {
            return false
        }
        installBoard(on: anchor)
        return true
    }

    #if targetEnvironment(simulator)
    /// シミュレータ用: 平面が無いためカメラ前方に固定配置してプレイ開始する。
    func placeBoardForSimulator() {
        if let existing = boardAnchor { scene.arView.scene.removeAnchor(existing) }
        let anchor = AnchorEntity(world: SIMD3<Float>(0, -0.1, -0.5))
        scene.arView.scene.addAnchor(anchor)
        installBoard(on: anchor)
    }
    #endif

    /// アンカーに盤面を組んでプレイ開始する共通処理。
    private func installBoard(on anchor: AnchorEntity) {
        if let existing = boardAnchor, existing !== anchor {
            scene.arView.scene.removeAnchor(existing)
        }
        boardAnchor = anchor
        cardManager.attach(to: anchor)
        if let rewardSpecs {
            cardManager.buildRewardBoard(specs: rewardSpecs, config: config)
        } else {
            cardManager.buildBoard(config: config)
        }
        gameState.startPlaying(totalPairs: cardManager.remainingPairs)
    }

    /// リトライ／中断やり直し（初期状態＝配置画面へ, R8-4）。盤面を撤去し、次のタップ配置で組み直す。
    func retry() {
        if let existing = boardAnchor {
            scene.arView.scene.removeAnchor(existing)
            boardAnchor = nil
        }
        gameState.retry()
    }
}
