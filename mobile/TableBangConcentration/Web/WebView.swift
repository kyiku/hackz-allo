import SwiftUI
import WebKit

/// 指定URLを表示する `WKWebView` の SwiftUI ラッパー。
/// Issue RPG など外部Webアプリを組み込むために用いる。WebSocket(wss) もネイティブに通る。
/// URLが変わったとき、または `reloadToken` が進んだときに再読み込みする。
struct WebView: UIViewRepresentable {
    let url: URL
    /// 画面側からのリロード要求トリガ（値が変わると reload）。
    var reloadToken: Int = 0

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        context.coordinator.currentURL = url
        context.coordinator.reloadToken = reloadToken
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // URL変更時は読み直す。
        if context.coordinator.currentURL != url {
            context.coordinator.currentURL = url
            webView.load(URLRequest(url: url))
            return
        }
        // リロードトークンが進んだら再読み込み。
        if context.coordinator.reloadToken != reloadToken {
            context.coordinator.reloadToken = reloadToken
            webView.reload()
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var currentURL: URL?
        var reloadToken: Int = 0
    }
}
