// ============================================================
// APP PRINCIPAL - navegacao robusta
// ============================================================

const app = document.getElementById('main');
const nav = document.getElementById('nav');
window.app = app;
window.nav = nav;

function renderNav() {
  if (typeof atualizarBotaoTurmas === 'function') atualizarBotaoTurmas();
  const u = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!u) { nav.innerHTML = ''; return; }

  const itens = u.tipo === 'aluno'
    ? [
        { go: 'dashboard', label: '🏠 Inicio' },
        { go: 'quizzes', label: '📚 Quizzes' },
        { go: 'estudos', label: '📖 Estudar' },
        { go: 'ranking', label: '🏆 Ranking' },
        { go: 'historico', label: '📜 Historico' },
        { go: 'logout', label: 'Sair' }
      ]
    : [
        { go: 'prof-dashboard', label: '📊 Painel' },
        { go: 'prof-alunos', label: '🎓 Alunos' },
        { go: 'prof-perguntas', label: '❓ Perguntas' },
        { go: 'prof-quizzes', label: '📝 Quizzes' },
        { go: 'prof-arquivos', label: '📎 Arquivos' },
        { go: 'logout', label: 'Sair' }
      ];

  nav.innerHTML = itens.map(i => `<button data-go="${i.go}">${i.label}</button>`).join('');

  nav.querySelectorAll('button[data-go]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const acao = btn.dataset.go;
      console.log('[NAV] Clicou:', acao);
      try {
        switch (acao) {
          case 'dashboard': telaDashboard(); break;          case 'quizzes': telaQuizzes(); break;
          case 'estudos': telaEstudos(); break;
          case 'ranking': telaRanking(); break;
          case 'minha-turma': window.location.href = '/turmas.html'; break;
          case 'historico': telaHistorico(); break;
          case 'prof-dashboard': telaProfDashboard(); break;
          case 'prof-alunos': telaProfAlunos(); break;
          case 'prof-turmas': window.location.href = '/turmas.html'; break;
          case 'prof-perguntas': telaProfPerguntas(); break;
          case 'prof-quizzes': telaProfQuizzes(); break;
          case 'prof-arquivos': telaProfArquivos(); break;
          case 'logout': logout(); break;
          default: console.warn('[NAV] Acao desconhecida:', acao);
        }
      } catch(err) {
        console.error('[NAV] Erro em', acao, err);
        alert('Funcao "' + acao + '" nao carregada. Recarregue a pagina (Ctrl+Shift+R).');
      }
    });
  });
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  renderNav();
  telaLogin();
}

function telaLogin() {
  app.innerHTML = `
    <div class="card form-box">
      <h2>🔐 Entrar</h2>
      <div id="msg"></div>
      <label>E-mail</label>
      <input id="email" type="email" placeholder="seu@email.com" />
      <label>Senha</label>
      <input id="senha" type="password" placeholder="******" />
      <button class="btn btn-accent" id="btnLogin" style="width:100%;margin-top:12px">Entrar</button>
      <p style="margin-top:16px;font-size:.85rem;color:#94a3b8">
        Nao tem conta? <a href="#" id="linkCad" style="color:#f59e0b">Cadastre-se</a>
      </p>
      <p style="margin-top:12px;font-size:.75rem;color:#64748b;background:#0f172a;padding:10px;border-radius:8px;line-height:1.6">
        <strong>Contas de teste:</strong><br>
        👨‍🏫 professor@escola.com / 123456<br>
        🎓 ana@aluno.com / 123456
      </p>
    </div>`;

  document.getElementById('btnLogin').addEventListener('click', fazerLogin);
  document.getElementById('senha').addEventListener('keypress', e => { if (e.key === 'Enter') fazerLogin(); });
  document.getElementById('linkCad').addEventListener('click', e => { e.preventDefault(); telaCadastro(); });
}

async function fazerLogin() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const msg = document.getElementById('msg');

  if (!email || !senha) { msg.innerHTML = '<div class="alerta erro">Preencha tudo</div>'; return; }

  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    renderNav();
    data.usuario.tipo === 'professor' ? telaProfDashboard() : telaDashboard();
    if (typeof processarConvitePendente === 'function') {
      try { await processarConvitePendente(); } catch(e) {}
    }
  } catch(e) {
    msg.innerHTML = `<div class="alerta erro">${e.message}</div>`;
  }
}

function telaCadastro() {
  app.innerHTML = `
    <div class="card form-box">
      <h2>✍️ Cadastro de Aluno</h2>
      <div id="msg"></div>
      <label>Nome</label><input id="nome" />
      <label>E-mail</label><input id="email" type="email" />
      <label>Senha</label><input id="senha" type="password" />
      <label>Turma</label>
      <select id="turma">
        <option>1 Ano A</option><option>2 Ano B</option><option>3 Ano C</option>
      </select>
      <button class="btn btn-accent" id="btnCad" style="width:100%;margin-top:12px">Cadastrar</button>
      <p style="margin-top:16px;font-size:.85rem;color:#94a3b8">
        Ja tem conta? <a href="#" id="linkLogin" style="color:#f59e0b">Entrar</a>
      </p>
    </div>`;

  document.getElementById('btnCad').addEventListener('click', fazerCadastro);
  document.getElementById('linkLogin').addEventListener('click', e => { e.preventDefault(); telaLogin(); });
}

async function fazerCadastro() {
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const turma = document.getElementById('turma').value;
  const msg = document.getElementById('msg');

  if (!nome || !email || !senha) { msg.innerHTML = '<div class="alerta erro">Preencha tudo</div>'; return; }

  try {
    await api('/auth/cadastro', { method: 'POST', body: JSON.stringify({ nome, email, senha, turma }) });
    alert('Cadastro OK! Faca login.');
    telaLogin();
  } catch(e) {
    msg.innerHTML = `<div class="alerta erro">${e.message}</div>`;
  }
}

async function init() {
  if (typeof atualizarBotaoTurmas === 'function') atualizarBotaoTurmas();
  if (typeof verificarConviteNaURL === 'function') {
    try { await verificarConviteNaURL(); } catch(e) {}
  }
  console.log('[APP] Inicializando...');
  renderNav();
  const u = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!u) return telaLogin();
  u.tipo === 'professor' ? telaProfDashboard() : telaDashboard();
}

window.telaLogin = telaLogin;
window.telaCadastro = telaCadastro;
window.fazerLogin = fazerLogin;
window.fazerCadastro = fazerCadastro;
window.logout = logout;
window.renderNav = renderNav;
window.init = init;

window.addEventListener('load', init);


// ============================================================
// Atualiza visibilidade do botao "Turmas" no topbar
// ============================================================
function atualizarBotaoTurmas() {
  const btn = document.getElementById('btnIrTurmas');
  if (!btn) return;
  
  const u = JSON.parse(localStorage.getItem('usuario') || 'null');
  
  if (u && u.tipo === 'professor') {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}