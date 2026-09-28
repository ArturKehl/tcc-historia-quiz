// ============================================================
// TURMAS - Professor cria e gerencia, aluno entra por codigo
// ============================================================

// ============================================================
// PROFESSOR - Lista de turmas
// ============================================================
async function telaProfTurmas() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando turmas...</div>';

  try {
    const turmas = await api('/turmas/minhas');
    app.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <h2 style="margin:0">Turmas (${turmas.length})</h2>
          <button class="btn btn-accent" id="btnNovaTurma">+ Criar turma</button>
        </div>
      </div>

      ${turmas.length === 0 ? `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:3rem">T</div>
          <h3>Nenhuma turma criada ainda</h3>
          <p style="color:#94a3b8;margin:12px 0">Crie uma turma e compartilhe o codigo com seus alunos.</p>
          <button class="btn btn-accent" id="btnPrimeiraTurma">+ Criar primeira turma</button>
        </div>
      ` : `
        <div class="grid">
          ${turmas.map(t => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
                <h3 style="margin:0">${t.nome}</h3>
                <span class="badge">${t.total_alunos} aluno${t.total_alunos !== 1 ? 's' : ''}</span>
              </div>
              <div style="margin-top:16px;background:#0f172a;padding:12px;border-radius:8px;text-align:center">
                <p style="color:#94a3b8;font-size:.75rem;margin-bottom:4px">Codigo de convite</p>
                <p style="font-size:1.4rem;font-weight:700;color:var(--accent);letter-spacing:2px;font-family:monospace">
                  ${t.codigo_convite || '---'}
                </p>
                <button class="btn" data-copiar="${t.codigo_convite}" style="font-size:.75rem;padding:6px 12px;margin-top:8px">
                  Copiar
                </button>
              </div>
              <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
                <button class="btn btn-accent" data-qr="${t.id}" style="font-size:.8rem;padding:8px 12px">📱 QR Code</button>
                <button class="btn" data-ver="${t.id}" style="font-size:.8rem;padding:8px 12px">Ver alunos</button>
                <button class="btn" data-regen="${t.id}" style="font-size:.8rem;padding:8px 12px">Novo codigo</button>
                <button class="btn btn-danger" data-excluir="${t.id}" style="font-size:.8rem;padding:8px 12px">Excluir</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}`;

    const btnNova = document.getElementById('btnNovaTurma') || document.getElementById('btnPrimeiraTurma');
    if (btnNova) btnNova.addEventListener('click', modalCriarTurma);

    app.querySelectorAll('button[data-copiar]').forEach(b => {
      b.addEventListener('click', () => {
        navigator.clipboard.writeText(b.dataset.copiar);
        b.textContent = 'Copiado!';
        setTimeout(() => b.textContent = 'Copiar', 1500);
      });
    });
    app.querySelectorAll('button[data-qr]').forEach(b => {
      b.addEventListener('click', () => abrirQRCodeTurma(parseInt(b.dataset.qr)));
    });
    app.querySelectorAll('button[data-ver]').forEach(b => {
      b.addEventListener('click', () => telaProfTurmaDetalhes(parseInt(b.dataset.ver)));
    });
    app.querySelectorAll('button[data-regen]').forEach(b => {
      b.addEventListener('click', () => regenerarCodigo(parseInt(b.dataset.regen)));
    });
    app.querySelectorAll('button[data-excluir]').forEach(b => {
      b.addEventListener('click', () => excluirTurma(parseInt(b.dataset.excluir)));
    });
  } catch(e) {
    app.innerHTML = '<div class="card alerta erro">' + e.message + '</div>';
  }
}

// ============================================================
// MODAL - Criar nova turma
// ============================================================
function modalCriarTurma() {
  const modal = document.createElement('div');
  modal.id = 'modalTurma';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  modal.innerHTML = `
    <div class="card" style="max-width:400px;width:100%">
      <h3>Nova Turma</h3>
      <label>Nome da turma</label>
      <input id="novaTurmaNome" placeholder="Ex: 1 Ano A - Historia" autofocus />
      <p style="color:#94a3b8;font-size:.8rem;margin-top:8px">
        Um codigo unico sera gerado para os alunos entrarem.
      </p>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-accent" id="btnCriarTurma">Criar</button>
        <button class="btn" id="btnCancelarTurma">Cancelar</button>
      </div>
      <div id="msgTurma"></div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('novaTurmaNome').focus();
  document.getElementById('novaTurmaNome').addEventListener('keypress', e => {
    if (e.key === 'Enter') criarTurma();
  });
  document.getElementById('btnCriarTurma').addEventListener('click', criarTurma);
  document.getElementById('btnCancelarTurma').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function criarTurma() {
  const nome = document.getElementById('novaTurmaNome').value.trim();
  const msg = document.getElementById('msgTurma');
  if (!nome) { msg.innerHTML = '<div class="alerta erro">Digite um nome</div>'; return; }

  try {
    const r = await api('/turmas/criar', { method: 'POST', body: JSON.stringify({ nome }) });
    msg.innerHTML = '<div class="alerta sucesso">Turma criada! Codigo: <strong style="font-family:monospace;letter-spacing:2px">' + r.codigo_convite + '</strong></div>';
    setTimeout(() => {
      const m = document.getElementById('modalTurma');
      if (m) m.remove();
      telaProfTurmas();
    }, 1500);
  } catch(e) {
    msg.innerHTML = '<div class="alerta erro">' + e.message + '</div>';
  }
}

// ============================================================
// PROFESSOR - Detalhes da turma
// ============================================================
async function telaProfTurmaDetalhes(id) {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando...</div>';

  try {
    const data = await api('/turmas/' + id + '/detalhes');
    app.innerHTML = `
      <div class="card">
        <button class="btn" id="btnVoltarTurmas" style="margin-bottom:12px">Voltar</button>
        <button class="btn btn-accent" id="btnQRDetalhes" style="margin-bottom:12px;margin-left:8px">📱 Gerar QR Code</button>
        <h2>${data.turma.nome}</h2>
        <p style="color:#94a3b8;font-size:.9rem;margin-top:4px">
          ${data.alunos.length} aluno${data.alunos.length !== 1 ? 's' : ''} matriculado${data.alunos.length !== 1 ? 's' : ''}
        </p>
        <div style="margin-top:16px;background:#0f172a;padding:12px;border-radius:8px;display:inline-block">
          <p style="color:#94a3b8;font-size:.75rem;margin-bottom:4px">Codigo de convite</p>
          <p style="font-size:1.4rem;font-weight:700;color:var(--accent);letter-spacing:2px;font-family:monospace">
            ${data.turma.codigo_convite}
          </p>
        </div>
      </div>

      <div class="card">
        <h3>Alunos da turma</h3>
        ${data.alunos.length === 0 ? `
          <p style="color:#94a3b8;text-align:center;padding:24px">
            Nenhum aluno nesta turma ainda.<br>
            Compartilhe o codigo <strong style="color:var(--accent)">${data.turma.codigo_convite}</strong> com seus alunos.
          </p>
        ` : `
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>Nome</th><th>Email</th><th>Pontos</th><th>Quizzes</th><th>Acertos</th><th>Acao</th></tr></thead>
              <tbody>
                ${data.alunos.map(a => `
                  <tr>
                    <td>${a.nome}</td>
                    <td style="color:#94a3b8;font-size:.85rem">${a.email}</td>
                    <td><strong>${a.pontos}</strong></td>
                    <td>${a.quizzes}</td>
                    <td>${a.acertos}</td>
                    <td>
                      <button class="btn btn-danger" data-remover-aluno="${a.id}" style="font-size:.75rem;padding:6px 10px">
                        Remover
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    document.getElementById('btnVoltarTurmas').addEventListener('click', telaProfTurmas);
    document.getElementById('btnQRDetalhes').addEventListener('click', () => abrirQRCodeTurma(id));
    app.querySelectorAll('button[data-remover-aluno]').forEach(b => {
      b.addEventListener('click', () => removerAlunoDaTurma(id, parseInt(b.dataset.removerAluno)));
    });
  } catch(e) {
    app.innerHTML = '<div class="card alerta erro">' + e.message + '</div>';
  }
}

async function regenerarCodigo(id) {
  if (!confirm('Gerar novo codigo? O antigo deixara de funcionar.')) return;
  try {
    const r = await api('/turmas/' + id + '/regenerar-codigo', { method: 'PATCH' });
    alert('Novo codigo: ' + r.codigo_convite);
    telaProfTurmas();
  } catch(e) { alert(e.message); }
}

async function excluirTurma(id) {
  if (!confirm('Excluir esta turma? Os alunos ficarao sem turma.')) return;
  try {
    await api('/turmas/' + id, { method: 'DELETE' });
    telaProfTurmas();
  } catch(e) { alert(e.message); }
}

async function removerAlunoDaTurma(turmaId, alunoId) {
  if (!confirm('Remover este aluno da turma?')) return;
  try {
    await api('/turmas/' + turmaId + '/aluno/' + alunoId, { method: 'DELETE' });
    telaProfTurmaDetalhes(turmaId);
  } catch(e) { alert(e.message); }
}

// ============================================================
// ALUNO - Minha turma
// ============================================================
async function telaMinhaTurma() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando...</div>';

  try {
    const data = await api('/turmas/minha');

    if (!data.turma) {
      app.innerHTML = `
        <div class="card" style="max-width:500px;margin:0 auto;text-align:center">
          <div style="font-size:3rem">T</div>
          <h2>Voce ainda nao esta em uma turma</h2>
          <p style="color:#94a3b8;margin:12px 0">
            Peca o codigo de convite ao seu professor e entre abaixo.
          </p>
          <label style="margin-top:16px;display:block;text-align:left">Codigo da turma</label>
          <input id="codigoTurma" placeholder="Ex: HIST-A3F9" 
                 style="text-align:center;font-family:monospace;font-size:1.2rem;letter-spacing:2px;text-transform:uppercase" 
                 maxlength="9" />
          <button class="btn btn-accent" id="btnEntrarTurma" style="width:100%;margin-top:12px">
            Entrar na turma
          </button>
          <div id="msgTurma"></div>
        </div>
      `;

      document.getElementById('codigoTurma').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
      });
      document.getElementById('codigoTurma').addEventListener('keypress', e => {
        if (e.key === 'Enter') entrarNaTurma();
      });
      document.getElementById('btnEntrarTurma').addEventListener('click', entrarNaTurma);
      document.getElementById('codigoTurma').focus();
      return;
    }

    app.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg, #1e293b, #312e81)">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
          <div>
            <p style="color:#94a3b8;font-size:.8rem;letter-spacing:1px">MINHA TURMA</p>
            <h2 style="margin:8px 0 4px">${data.turma.nome}</h2>
            <p style="color:#94a3b8;font-size:.85rem">
              ${data.colegas.length} colega${data.colegas.length !== 1 ? 's' : ''} na turma
            </p>
          </div>
          <div style="background:#0f172a;padding:12px 16px;border-radius:12px;text-align:center">
            <p style="color:#94a3b8;font-size:.7rem;margin-bottom:4px">Codigo</p>
            <p style="font-size:1.1rem;font-weight:700;color:var(--accent);font-family:monospace;letter-spacing:2px">
              ${data.turma.codigo_convite}
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Ranking da turma</h3>
        <div style="overflow-x:auto;margin-top:12px">
          <table>
            <thead><tr><th>#</th><th>Aluno</th><th>Pontos</th></tr></thead>
            <tbody>
              ${data.colegas.map((c, i) => {
                const eu = c.id === JSON.parse(localStorage.getItem('usuario') || '{}').id;
                return '<tr style="' + (eu ? 'background:rgba(245,158,11,.1)' : '') + '">' +
                  '<td class="' + (i < 3 ? 'rank-' + (i+1) : '') + '">' + (i+1) + '</td>' +
                  '<td>' + c.nome + (eu ? ' <span class="badge" style="margin-left:8px">Voce</span>' : '') + '</td>' +
                  '<td><strong>' + c.pontos + '</strong></td>' +
                  '</tr>';
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    app.innerHTML = '<div class="card alerta erro">' + e.message + '</div>';
  }
}

async function entrarNaTurma() {
  const codigo = document.getElementById('codigoTurma').value.trim().toUpperCase();
  const msg = document.getElementById('msgTurma');
  if (!codigo) { msg.innerHTML = '<div class="alerta erro">Digite o codigo</div>'; return; }

  try {
    const r = await api('/turmas/entrar', { method: 'POST', body: JSON.stringify({ codigo }) });
    msg.innerHTML = '<div class="alerta sucesso">' + r.mensagem + '</div>';
    setTimeout(() => telaMinhaTurma(), 1200);
  } catch(e) {
    msg.innerHTML = '<div class="alerta erro">' + e.message + '</div>';
  }
}

// Exportar
window.telaProfTurmas = telaProfTurmas;
window.telaProfTurmaDetalhes = telaProfTurmaDetalhes;
window.telaMinhaTurma = telaMinhaTurma;
