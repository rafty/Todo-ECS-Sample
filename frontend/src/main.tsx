import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('アプリケーションの描画先 #root が見つかりません。')
}

// なぜ必要か: DOM 初期化順序に依存する起動エラーを早期に検出し、空白画面の原因特定を容易にするため。
createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
