import SwiftUI
import WebKit

/// Web アプリ（Issue RPG）と双方向にやり取りするブリッジ。
/// - JS → ネイティブ: `window.webkit.messageHandlers.bridge.postMessage({type:'reward.start', cards:[{effectId,label}]})`
/// - ネイティブ → JS: `window.__claimRewards([effectId,...])` を evaluateJavaScript で呼ぶ
/// WKWebView を所有し続けるので、報酬ゲームをオーバーレイしても接続/状態が保たれる。
final class WebBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    let webView: WKWebView
    /// 報酬ミニゲーム開始要求（敵撃破時に Web から届く）。
    var onRewardStart: (([RewardCardSpec]) -> Void)?

    private var currentURL: URL?

    override init() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.configuration.userContentController.add(self, name: "bridge")
    }

    /// 指定URLを読み込む（既読込と同じなら何もしない）。
    /// 常に最新のフロントを取得するためローカルキャッシュを無視する（デプロイ反映漏れ防止）。
    func load(_ url: URL) {
        guard url != currentURL else { return }
        currentURL = url
        webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    func reload() {
        webView.reloadFromOrigin()
    }

    /// 獲得した効果IDを Web に渡す（Web 側が cmd.reward.claim を送る）。
    func claimRewards(_ effectIds: [String]) {
        let json =
            (try? JSONSerialization.data(withJSONObject: effectIds))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        webView.evaluateJavaScript("window.__claimRewards && window.__claimRewards(\(json))")
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard
            message.name == "bridge",
            let dict = message.body as? [String: Any],
            dict["type"] as? String == "reward.start"
        else { return }
        let cards = (dict["cards"] as? [[String: Any]]) ?? []
        let specs = cards.compactMap { entry -> RewardCardSpec? in
            guard let effectId = entry["effectId"] as? String,
                  let label = entry["label"] as? String else { return nil }
            return RewardCardSpec(effectId: effectId, label: label)
        }
        DispatchQueue.main.async { [weak self] in self?.onRewardStart?(specs) }
    }
}

/// WebBridge が所有する WKWebView を SwiftUI に表示するだけのラッパー。
struct WebViewContainer: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ webView: WKWebView, context: Context) {}
}
