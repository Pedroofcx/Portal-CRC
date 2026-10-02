import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Depois de uma publicação, quem estava com o Portal aberto ainda aponta para
// arquivos de página que já não existem no servidor: abrir uma página nova
// falhava com "Ops! Algo deu errado". Recarrega uma vez para pegar a versão
// nova; a trava evita laço se o problema for outro.
window.addEventListener('vite:preloadError', (evento) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem('portal_recarregou_chunk') || 0) < 60000) return;
    sessionStorage.setItem('portal_recarregou_chunk', String(Date.now()));
  } catch { /* sem sessionStorage: deixa o ErrorBoundary mostrar */ return; }
  evento.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
