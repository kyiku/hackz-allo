/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // 見出し/ラベル/ボタン＝ピクセル系、本文＝Noto Sans JP。
        pixel: ['"DotGothic16"', 'monospace'],
        sans: ['"Noto Sans JP"', 'sans-serif'],
      },
      colors: {
        // RPGウィンドウ調の配色トークン。
        rpg: {
          bg: '#0e1322', // 画面背景（深夜）
          window: '#1b2546', // ウィンドウ地（紺）
          'window-dark': '#121a33',
          frame: '#3a4a86', // ウィンドウ内側の明るい縁
          'frame-dark': '#080d1c', // 外側の暗い縁
          ink: '#eef1fb', // ウィンドウ上のテキスト
          muted: '#9aa6cf', // 補足テキスト
          gold: '#f4d06a', // アクセント（金）
          'gold-dark': '#a9802a',
        },
      },
      boxShadow: {
        // RPGウィンドウの二重縁＋落ち影。
        window:
          'inset 0 0 0 2px #3a4a86, inset 0 0 0 4px #1b2546, 0 4px 0 rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.45)',
        // ボタンの面取り（凸）。
        btn: 'inset 2px 2px 0 rgba(255,255,255,0.28), inset -2px -2px 0 rgba(0,0,0,0.4), 0 3px 0 rgba(0,0,0,0.45)',
        'btn-pressed': 'inset 2px 2px 0 rgba(0,0,0,0.4), inset -2px -2px 0 rgba(255,255,255,0.18)',
        'inset-deep': 'inset 2px 2px 0 rgba(0,0,0,0.45), inset -1px -1px 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}
