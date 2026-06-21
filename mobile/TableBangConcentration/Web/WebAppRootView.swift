import SwiftUI

/// 報酬ミニゲームのセッション（fullScreenCover の item 用に Identifiable 化）。
struct RewardSession: Identifiable {
    let id = UUID()
    let specs: [RewardCardSpec]
}

/// アプリ起動直後に Issue RPG の Web アプリを全画面表示するルート。
/// 表示先URLは設定で変更でき `UserDefaults` に保存する（デプロイ先/トンネルを差し替えやすく）。
/// 敵撃破時に Web から届く `reward.start` で AR 神経衰弱（報酬）をオーバーレイ表示し、
/// 獲得した効果IDを Web へ返す（`window.__claimRewards`）。
/// 既存のARゲーム(`RootView`)は温存しており、`TableBangApp` の表示を差し替えれば後から復帰できる。
struct WebAppRootView: View {
    @StateObject private var bridge = WebBridge()
    @AppStorage("webAppURL") private var urlString: String = WebAppRootView.defaultURL
    @State private var draftURL = ""
    @State private var showSettings = false
    @State private var rewardSession: RewardSession?

    /// デプロイ先の既定URL（Cloudflare Pages）。
    /// `?backend=<公開URL>` を付けると、フロントのWS接続先がそのバックエンドに向く（resolveWsUrl が wss://.../ws へ正規化）。
    /// 下のトンネルURLはセッション毎に変わるため、再起動時は右上の歯車で貼り替える。
    static let defaultURL =
        "https://github-issue-rpg.pages.dev?backend=https://economy-map-mall-relax.trycloudflare.com"

    var body: some View {
        ZStack(alignment: .topTrailing) {
            if resolvedURL != nil {
                WebViewContainer(webView: bridge.webView)
                    .ignoresSafeArea()
            } else {
                placeholder
            }
            settingsButton
        }
        .onAppear {
            bridge.onRewardStart = { specs in rewardSession = RewardSession(specs: specs) }
            if let url = resolvedURL { bridge.load(url) }
        }
        .sheet(isPresented: $showSettings) { settingsSheet }
        .fullScreenCover(item: $rewardSession) { session in
            RewardGameView(specs: session.specs) { acquiredEffectIds in
                bridge.claimRewards(acquiredEffectIds)
                rewardSession = nil
            }
        }
    }

    private var resolvedURL: URL? {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), url.scheme != nil else { return nil }
        return url
    }

    private var placeholder: some View {
        VStack(spacing: 12) {
            Image(systemName: "globe")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("表示先URLが未設定です")
                .font(.headline)
            Text("右上の歯車からURLを設定してください")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }

    private var settingsButton: some View {
        Button { openSettings() } label: {
            Image(systemName: "gearshape.fill")
                .font(.title3)
                .padding(10)
                .background(.black.opacity(0.35), in: Circle())
                .foregroundStyle(.white)
        }
        .padding(.top, 8)
        .padding(.trailing, 12)
    }

    private var settingsSheet: some View {
        NavigationView {
            Form {
                Section(header: Text("表示先URL")) {
                    TextField("https://...", text: $draftURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }
                Section {
                    Button("開く") {
                        urlString = draftURL.trimmingCharacters(in: .whitespacesAndNewlines)
                        if let url = resolvedURL { bridge.load(url) }
                        showSettings = false
                    }
                    Button("再読み込み") {
                        bridge.reload()
                        showSettings = false
                    }
                    Button("報酬ミニゲームをテスト起動") {
                        showSettings = false
                        rewardSession = RewardSession(specs: WebAppRootView.sampleRewardSpecs)
                    }
                }
            }
            .navigationTitle("Issue RPG")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { showSettings = false }
                }
            }
        }
        .navigationViewStyle(.stack)
    }

    /// 動作確認用のサンプル報酬（効果カード6枚）。web 側の重み付け配合に合わせる。
    static let sampleRewardSpecs: [RewardCardSpec] = [
        RewardCardSpec(effectId: "eff.mcp.up", label: "MCP枠+1"),
        RewardCardSpec(effectId: "eff.party.up", label: "サブエージェント+1"),
        RewardCardSpec(effectId: "eff.model.up", label: "モデル+1"),
        RewardCardSpec(effectId: "eff.mcp.down", label: "MCP枠-1"),
        RewardCardSpec(effectId: "eff.party.down", label: "サブエージェント-1"),
        RewardCardSpec(effectId: "eff.model.down", label: "モデル-1"),
    ]

    private func openSettings() {
        draftURL = urlString
        showSettings = true
    }
}
