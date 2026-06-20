import SwiftUI

/// アプリ起動直後に Issue RPG の Web アプリを全画面表示するルート。
/// 表示先URLは設定で変更でき `UserDefaults` に保存する（デプロイ先/トンネルを差し替えやすく）。
/// 既存のARゲーム(`RootView`)は温存しており、`TableBangApp` の表示を差し替えれば後から復帰できる。
struct WebAppRootView: View {
    @AppStorage("webAppURL") private var urlString: String = WebAppRootView.defaultURL
    @State private var draftURL = ""
    @State private var showSettings = false
    @State private var reloadToken = 0

    /// デプロイ先の既定URL（Cloudflare Pages）。
    /// `?backend=<公開URL>` を付けると、フロントのWS接続先がそのバックエンドに向く（resolveWsUrl が wss://.../ws へ正規化）。
    /// 下のトンネルURLはセッション毎に変わるため、再起動時は右上の歯車で貼り替える。
    static let defaultURL =
        "https://github-issue-rpg.pages.dev?backend=https://economy-map-mall-relax.trycloudflare.com"

    var body: some View {
        ZStack(alignment: .topTrailing) {
            if let url = resolvedURL {
                WebView(url: url, reloadToken: reloadToken)
                    .ignoresSafeArea()
            } else {
                placeholder
            }
            settingsButton
        }
        .sheet(isPresented: $showSettings) { settingsSheet }
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
                        reloadToken += 1
                        showSettings = false
                    }
                    Button("再読み込み") {
                        reloadToken += 1
                        showSettings = false
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

    private func openSettings() {
        draftURL = urlString
        showSettings = true
    }
}
