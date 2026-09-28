// ============================================================
// API - cliente HTTP com tratamento de sessao
// ============================================================

const API = '/api';
const getToken = () => localStorage.getItem('token');

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;

  let res;
  try {
    res = await fetch(API + path, { ...opts, headers });
  } catch (err) {
    console.error('[API] Erro de rede:', err);
    throw new Error('Nao foi possivel conectar ao servidor. Verifique se esta rodando.');
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    console.warn('[API] 401 em', path, '| Codigo:', data.codigo);
    
    // Se ja temos token mas ele e invalido, fazer logout
    if (getToken()) {
      console.warn('[API] Token invalido, limpando sessao...');
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      
      // Re-renderiza nav e login
      if (typeof renderNav === 'function') renderNav();
      if (typeof telaLogin === 'function') telaLogin();
      
      throw new Error('Sua sessao expirou. Faca login novamente.');
    } else {
      throw new Error(data.erro || 'Credenciais invalidas');
    }
  }

  if (!res.ok) throw new Error(data.erro || 'Erro na requisicao');
  return data;
}

window.api = api;
