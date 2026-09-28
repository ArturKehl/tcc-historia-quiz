// ============================================================
// PAINEL DO PROFESSOR - Criacao de quizzes e questoes
// ============================================================

const TEMAS_HISTORIA = [
  'Historia do Brasil',
  'Segunda Guerra Mundial',
  'Revolucao Francesa',
  'Revolucao Industrial',
  'Antiguidade',
  'Idade Media',
  'Idade Moderna',
  'Idade Contemporanea'
];

// ============================================================
// DASHBOARD
// ============================================================
async function telaProfDashboard() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando painel...</div>';
  try {
    const d = await api('/professor/dashboard');
    app.innerHTML = `
      <h2>📊 Painel do Professor</h2>
      <div class="grid">
        <div class="stat"><span class="num">${d.totalAlunos}</span><span class="label">Alunos</span></div>
        <div class="stat"><span class="num">${d.totalQuizzes}</span><span class="label">Quizzes</span></div>
        <div class="stat"><span class="num">${d.totalPerguntas}</span><span class="label">Perguntas</span></div>
        <div class="stat"><span class="num">${d.totalTentativas}</span><span class="label">Tentativas</span></div>
        <div class="stat"><span class="num">${d.mediaAcertos}%</span><span class="label">Media Acertos</span></div>
        <div class="stat"><span class="num">${d.mediaPontos}</span><span class="label">Media Pontos</span></div>
      </div>

      <div class="card" style="margin-top:20px">
        <h3>⚡ Acoes rapidas</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-accent" id="btnNovoQuizRapido">➕ Criar novo quiz</button>
          <button class="btn" id="btnNovaPerguntaRapido">✏️ Criar pergunta</button>
          <button class="btn" id="btnVerAlunosRapido">🎓 Ver alunos</button>
        </div>
      </div>

      <div class="card">
        <h3>📉 Temas com Maior Dificuldade</h3>
        ${d.temasDificuldade.length === 0 ? '<p style="color:#94a3b8">Sem dados ainda.</p>' : `
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Tema</th><th>Taxa Acerto</th><th>Total</th><th>Erros</th></tr></thead>
          <tbody>${d.temasDificuldade.map(t => `
            <tr>
              <td>${t.tema}</td>
              <td style="color:${t.taxa_acerto < 50 ? 'var(--danger)' : t.taxa_acerto < 75 ? 'var(--accent)' : 'var(--success)'}">${t.taxa_acerto}%</td>
              <td>${t.total}</td>
              <td>${t.erros}</td>
            </tr>`).join('')}</tbody>
        </table></div>`}
      </div>

      <div class="card">
        <h3>❌ Perguntas Mais Erradas</h3>
        ${d.perguntasMaisErradas.length === 0 ? '<p style="color:#94a3b8">Sem dados ainda.</p>' : `
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Pergunta</th><th>Tema</th><th>Erros</th></tr></thead>
          <tbody>${d.perguntasMaisErradas.map(p => `
            <tr>
              <td>${p.enunciado.substring(0,80)}...</td>
              <td>${p.tema}</td>
              <td style="color:var(--danger)"><strong>${p.erros}/${p.total}</strong></td>
            </tr>`).join('')}</tbody>
        </table></div>`}
      </div>`;

    document.getElementById('btnNovoQuizRapido').addEventListener('click', telaProfCriarQuiz);
    document.getElementById('btnNovaPerguntaRapido').addEventListener('click', telaProfCriarPergunta);
    document.getElementById('btnVerAlunosRapido').addEventListener('click', telaProfAlunos);
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

// ============================================================
// LISTA DE QUIZZES
// ============================================================
async function telaProfQuizzes() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando quizzes...</div>';
  try {
    const lista = await api('/professor/quizzes');
    app.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <h2 style="margin:0">📝 Meus Quizzes (${lista.length})</h2>
          <button class="btn btn-accent" id="btnCriarQuiz">➕ Criar novo quiz</button>
        </div>
      </div>

      ${lista.length === 0 ? `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:3rem">📝</div>
          <h3>Nenhum quiz criado ainda</h3>
          <p style="color:#94a3b8;margin:12px 0">Comece criando seu primeiro quiz!</p>
          <button class="btn btn-accent" id="btnCriarPrimeiroQuiz">➕ Criar primeiro quiz</button>
        </div>
      ` : `
        <div class="grid">
          ${lista.map(q => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
                <span class="badge">${q.tema}</span>
                <span class="badge" style="background:${q.status === 'publicado' ? 'rgba(16,185,129,.2)' : 'rgba(148,163,184,.2)'}">
                  ${q.status === 'publicado' ? '✅ Publicado' : '📝 Rascunho'}
                </span>
              </div>
              <h3 style="margin:12px 0 8px">${q.titulo}</h3>
              <p style="color:#94a3b8;font-size:.85rem;min-height:36px">${q.descricao || 'Sem descricao'}</p>
              <p style="font-size:.8rem;color:#64748b;margin-top:8px">
                📚 ${q.total_perguntas} perguntas • ${q.dificuldade}
              </p>
              <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap">
                <button class="btn btn-accent" data-editar="${q.id}" style="font-size:.8rem;padding:8px 12px">✏️ Editar</button>
                <button class="btn" data-publicar="${q.id}" style="font-size:.8rem;padding:8px 12px">${q.status === 'publicado' ? '📴 Ocultar' : '📢 Publicar'}</button>
                <button class="btn" data-duplicar="${q.id}" style="font-size:.8rem;padding:8px 12px">📋 Duplicar</button>
                <button class="btn btn-danger" data-excluir="${q.id}" style="font-size:.8rem;padding:8px 12px">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}`;

    const btnCriarQuiz = document.getElementById('btnCriarQuiz') || document.getElementById('btnCriarPrimeiroQuiz');
    if (btnCriarQuiz) btnCriarQuiz.addEventListener('click', telaProfCriarQuiz);

    app.querySelectorAll('button[data-editar]').forEach(b => b.addEventListener('click', () => telaProfEditarQuiz(parseInt(b.dataset.editar))));
    app.querySelectorAll('button[data-publicar]').forEach(b => b.addEventListener('click', () => publicarQuiz(parseInt(b.dataset.publicar))));
    app.querySelectorAll('button[data-duplicar]').forEach(b => b.addEventListener('click', () => duplicarQuiz(parseInt(b.dataset.duplicar))));
    app.querySelectorAll('button[data-excluir]').forEach(b => b.addEventListener('click', () => excluirQuiz(parseInt(b.dataset.excluir))));
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

// ============================================================
// CRIAR NOVO QUIZ
// ============================================================
async function telaProfCriarQuiz() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando...</div>';

  try {
    const perguntas = await api('/professor/perguntas');
    const turmas = await api('/professor/turmas');

    app.innerHTML = `
      <div class="card">
        <h2>➕ Criar Novo Quiz</h2>
        <p style="color:#94a3b8">Preencha os dados e selecione as perguntas</p>
      </div>

      <div class="card">
        <label>Titulo do Quiz *</label>
        <input id="quiz_titulo" placeholder="Ex: Revisao - Brasil Colonial" />

        <label>Descricao</label>
        <textarea id="quiz_desc" rows="2" placeholder="Uma breve descricao do quiz"></textarea>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>Tema *</label>
            <select id="quiz_tema">
              ${TEMAS_HISTORIA.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Dificuldade *</label>
            <select id="quiz_dif">
              <option value="facil">Facil</option>
              <option value="medio" selected>Medio</option>
              <option value="dificil">Dificil</option>
            </select>
          </div>
        </div>

        <label>Turma (opcional)</label>
        <select id="quiz_turma">
          <option value="">Todas as turmas</option>
          ${turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
        </select>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <h3 style="margin:0">📚 Selecionar Perguntas (<span id="contadorPerguntas">0</span> selecionadas)</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="filtro_busca" placeholder="🔍 Buscar..." style="width:200px;margin:0" />
            <select id="filtro_tema" style="width:auto;margin:0">
              <option value="">Todos os temas</option>
              ${TEMAS_HISTORIA.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="listaPerguntas" style="margin-top:16px;max-height:400px;overflow-y:auto;background:#0f172a;padding:12px;border-radius:8px">
          ${perguntas.length === 0 ? '<p style="color:#94a3b8">Nenhuma pergunta cadastrada. Crie perguntas primeiro.</p>' : ''}
          ${perguntas.map(p => `
            <label style="display:flex;align-items:start;gap:10px;padding:10px;border-bottom:1px solid #1e293b;cursor:pointer">
              <input type="checkbox" value="${p.id}" data-tema="${p.tema}" style="width:auto;margin:6px 0 0 0" />
              <div style="flex:1">
                <p style="color:#e2e8f0;font-size:.9rem;line-height:1.4">${p.enunciado}</p>
                <div style="margin-top:4px">
                  <span class="badge" style="font-size:.7rem">${p.tema}</span>
                  <span class="badge" style="font-size:.7rem">${p.dificuldade}</span>
                </div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="card" style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-accent" id="btnSalvarQuiz">💾 Salvar Quiz</button>
        <button class="btn" id="btnCancelarQuiz">Cancelar</button>
      </div>

      <div id="msgQuiz" style="margin-top:12px"></div>
    `;

    // Contadores e filtros
    const atualizarContador = () => {
      const n = app.querySelectorAll('#listaPerguntas input[type=checkbox]:checked').length;
      document.getElementById('contadorPerguntas').textContent = n;
    };

    app.querySelectorAll('#listaPerguntas input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', atualizarContador);
    });

    const filtrar = () => {
      const busca = document.getElementById('filtro_busca').value.toLowerCase();
      const tema = document.getElementById('filtro_tema').value;
      app.querySelectorAll('#listaPerguntas > label').forEach(l => {
        const cb = l.querySelector('input[type=checkbox]');
        const texto = l.textContent.toLowerCase();
        const temaOk = !tema || cb.dataset.tema === tema;
        const buscaOk = !busca || texto.includes(busca);
        l.style.display = temaOk && buscaOk ? 'flex' : 'none';
      });
    };
    document.getElementById('filtro_busca').addEventListener('input', filtrar);
    document.getElementById('filtro_tema').addEventListener('change', filtrar);

    document.getElementById('btnSalvarQuiz').addEventListener('click', salvarNovoQuiz);
    document.getElementById('btnCancelarQuiz').addEventListener('click', telaProfQuizzes);
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

async function salvarNovoQuiz() {
  const app = document.getElementById('main');
  const titulo = document.getElementById('quiz_titulo').value.trim();
  const descricao = document.getElementById('quiz_desc').value.trim();
  const tema = document.getElementById('quiz_tema').value;
  const dificuldade = document.getElementById('quiz_dif').value;
  const turma_id = document.getElementById('quiz_turma').value || null;
  const perguntas = [...app.querySelectorAll('#listaPerguntas input[type=checkbox]:checked')].map(c => parseInt(c.value));

  const msg = document.getElementById('msgQuiz');

  if (!titulo) { msg.innerHTML = '<div class="alerta erro">Digite um titulo</div>'; return; }
  if (perguntas.length === 0) { msg.innerHTML = '<div class="alerta erro">Selecione pelo menos 1 pergunta</div>'; return; }

  try {
    const r = await api('/professor/quizzes', {
      method: 'POST',
      body: JSON.stringify({ titulo, descricao, tema, dificuldade, turma_id, perguntas })
    });
    msg.innerHTML = '<div class="alerta sucesso">✅ Quiz criado com sucesso!</div>';
    setTimeout(() => telaProfQuizzes(), 1000);
  } catch(e) {
    msg.innerHTML = `<div class="alerta erro">${e.message}</div>`;
  }
}

// ============================================================
// EDITAR QUIZ EXISTENTE
// ============================================================
async function telaProfEditarQuiz(id) {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando quiz...</div>';

  try {
    const quiz = await api('/professor/quizzes/' + id);
    const todasPerguntas = await api('/professor/perguntas');
    const turmas = await api('/professor/turmas');
    const idsSelecionados = quiz.perguntas.map(p => p.id);

    app.innerHTML = `
      <div class="card">
        <button class="btn" id="btnVoltarQuiz" style="margin-bottom:12px">← Voltar</button>
        <h2>✏️ Editar Quiz: ${quiz.titulo}</h2>
      </div>

      <div class="card">
        <label>Titulo *</label>
        <input id="quiz_titulo" value="${quiz.titulo}" />

        <label>Descricao</label>
        <textarea id="quiz_desc" rows="2">${quiz.descricao || ''}</textarea>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>Tema</label>
            <select id="quiz_tema">
              ${TEMAS_HISTORIA.map(t => `<option ${t === quiz.tema ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Dificuldade</label>
            <select id="quiz_dif">
              <option value="facil" ${quiz.dificuldade === 'facil' ? 'selected' : ''}>Facil</option>
              <option value="medio" ${quiz.dificuldade === 'medio' ? 'selected' : ''}>Medio</option>
              <option value="dificil" ${quiz.dificuldade === 'dificil' ? 'selected' : ''}>Dificil</option>
            </select>
          </div>
        </div>

        <label>Turma</label>
        <select id="quiz_turma">
          <option value="">Todas as turmas</option>
          ${turmas.map(t => `<option value="${t.id}" ${t.id === quiz.turma_id ? 'selected' : ''}>${t.nome}</option>`).join('')}
        </select>

        <label>Status</label>
        <select id="quiz_status">
          <option value="publicado" ${quiz.status === 'publicado' ? 'selected' : ''}>Publicado</option>
          <option value="rascunho" ${quiz.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
        </select>
      </div>

      <div class="card">
        <h3>📚 Perguntas (<span id="contadorPerguntas">${idsSelecionados.length}</span> selecionadas)</h3>
        <div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap">
          <input id="filtro_busca" placeholder="🔍 Buscar..." style="width:200px;margin:0" />
          <select id="filtro_tema" style="width:auto;margin:0">
            <option value="">Todos os temas</option>
            ${TEMAS_HISTORIA.map(t => `<option>${t}</option>`).join('')}
          </select>
        </div>
        <div style="max-height:400px;overflow-y:auto;background:#0f172a;padding:12px;border-radius:8px">
          ${todasPerguntas.map(p => `
            <label style="display:flex;align-items:start;gap:10px;padding:10px;border-bottom:1px solid #1e293b;cursor:pointer">
              <input type="checkbox" value="${p.id}" data-tema="${p.tema}" 
                ${idsSelecionados.includes(p.id) ? 'checked' : ''} style="width:auto;margin:6px 0 0 0" />
              <div style="flex:1">
                <p style="color:#e2e8f0;font-size:.9rem">${p.enunciado}</p>
                <div style="margin-top:4px">
                  <span class="badge" style="font-size:.7rem">${p.tema}</span>
                  <span class="badge" style="font-size:.7rem">${p.dificuldade}</span>
                </div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="card" style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-accent" id="btnAtualizarQuiz">💾 Salvar Alteracoes</button>
        <button class="btn btn-danger" id="btnExcluirQuiz">🗑️ Excluir Quiz</button>
        <button class="btn" id="btnVoltar2">Cancelar</button>
      </div>

      <div id="msgQuiz"></div>
    `;

    const atualizarContador = () => {
      const n = app.querySelectorAll('input[type=checkbox]:checked').length;
      document.getElementById('contadorPerguntas').textContent = n;
    };
    app.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', atualizarContador));

    const filtrar = () => {
      const busca = document.getElementById('filtro_busca').value.toLowerCase();
      const tema = document.getElementById('filtro_tema').value;
      app.querySelectorAll('label').forEach(l => {
        const cb = l.querySelector('input[type=checkbox]');
        if (!cb) return;
        const temaOk = !tema || cb.dataset.tema === tema;
        const buscaOk = !busca || l.textContent.toLowerCase().includes(busca);
        l.style.display = temaOk && buscaOk ? 'flex' : 'none';
      });
    };
    document.getElementById('filtro_busca').addEventListener('input', filtrar);
    document.getElementById('filtro_tema').addEventListener('change', filtrar);

    document.getElementById('btnVoltarQuiz').addEventListener('click', telaProfQuizzes);
    document.getElementById('btnVoltar2').addEventListener('click', telaProfQuizzes);
    document.getElementById('btnAtualizarQuiz').addEventListener('click', () => atualizarQuiz(id));
    document.getElementById('btnExcluirQuiz').addEventListener('click', () => {
      if (confirm('Excluir este quiz permanentemente?')) excluirQuiz(id);
    });
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

async function atualizarQuiz(id) {
  const app = document.getElementById('main');
  const body = {
    titulo: document.getElementById('quiz_titulo').value.trim(),
    descricao: document.getElementById('quiz_desc').value.trim(),
    tema: document.getElementById('quiz_tema').value,
    dificuldade: document.getElementById('quiz_dif').value,
    status: document.getElementById('quiz_status').value,
    turma_id: document.getElementById('quiz_turma').value || null,
    perguntas: [...app.querySelectorAll('input[type=checkbox]:checked')].map(c => parseInt(c.value))
  };

  const msg = document.getElementById('msgQuiz');
  try {
    await api('/professor/quizzes/' + id, { method: 'PUT', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="alerta sucesso">✅ Quiz atualizado!</div>';
    setTimeout(() => telaProfQuizzes(), 800);
  } catch(e) { msg.innerHTML = `<div class="alerta erro">${e.message}</div>`; }
}

async function publicarQuiz(id) {
  try {
    const r = await api('/professor/quizzes/' + id + '/publicar', { method: 'PATCH' });
    alert(r.mensagem);
    telaProfQuizzes();
  } catch(e) { alert(e.message); }
}

async function duplicarQuiz(id) {
  try {
    await api('/professor/quizzes/' + id + '/duplicar', { method: 'POST' });
    alert('Quiz duplicado!');
    telaProfQuizzes();
  } catch(e) { alert(e.message); }
}

async function excluirQuiz(id) {
  if (!confirm('Excluir este quiz permanentemente?')) return;
  try {
    await api('/professor/quizzes/' + id, { method: 'DELETE' });
    alert('Quiz excluido');
    telaProfQuizzes();
  } catch(e) { alert(e.message); }
}

// ============================================================
// LISTA DE PERGUNTAS
// ============================================================
async function telaProfPerguntas() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando perguntas...</div>';
  try {
    const lista = await api('/professor/perguntas');
    app.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <h2 style="margin:0">❓ Minhas Perguntas (${lista.length})</h2>
          <button class="btn btn-accent" id="btnNovaPergunta">➕ Nova pergunta</button>
        </div>
      </div>

      ${lista.length === 0 ? `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:3rem">❓</div>
          <h3>Nenhuma pergunta criada ainda</h3>
          <p style="color:#94a3b8;margin:12px 0">Comece criando suas perguntas!</p>
          <button class="btn btn-accent" id="btnCriarPrimeira">➕ Criar primeira pergunta</button>
        </div>
      ` : `
        <div class="card">
          <div style="max-height:600px;overflow-y:auto">
            ${lista.map(p => `
              <div style="padding:16px;border-bottom:1px solid #1e293b">
                <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
                  <div style="flex:1;min-width:200px">
                    <p style="color:#e2e8f0;line-height:1.5">${p.enunciado}</p>
                    <div style="margin-top:6px">
                      <span class="badge">${p.tema}</span>
                      <span class="badge">${p.dificuldade}</span>
                      <span class="badge" style="background:rgba(16,185,129,.2);color:#10b981">✔ ${p.resposta_correta}</span>
                    </div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-accent" data-edit-p="${p.id}" style="padding:8px 12px;font-size:.8rem">✏️</button>
                    <button class="btn btn-danger" data-del-p="${p.id}" style="padding:8px 12px;font-size:.8rem">🗑️</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `}`;

    const btnNovo = document.getElementById('btnNovaPergunta') || document.getElementById('btnCriarPrimeira');
    if (btnNovo) btnNovo.addEventListener('click', () => telaProfCriarPergunta());

    app.querySelectorAll('button[data-edit-p]').forEach(b => b.addEventListener('click', () => telaProfCriarPergunta(parseInt(b.dataset.editP))));
    app.querySelectorAll('button[data-del-p]').forEach(b => b.addEventListener('click', () => excluirPergunta(parseInt(b.dataset.delP))));
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

// ============================================================
// CRIAR / EDITAR PERGUNTA
// ============================================================
async function telaProfCriarPergunta(id = null) {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando...</div>';

  let pergunta = null;
  if (id) {
    try { pergunta = await api('/professor/perguntas/' + id); }
    catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; return; }
  }

  app.innerHTML = `
    <div class="card">
      <button class="btn" id="btnVoltar" style="margin-bottom:12px">← Voltar</button>
      <h2>${id ? '✏️ Editar Pergunta' : '➕ Nova Pergunta'}</h2>
      <p style="color:#94a3b8">Preencha todos os campos. A resposta correta e a explicacao sao obrigatorias.</p>
    </div>

    <div class="card">
      <label>Enunciado da Pergunta *</label>
      <textarea id="p_enun" rows="3" placeholder="Digite a pergunta...">${pergunta?.enunciado || ''}</textarea>

      <label style="margin-top:16px;display:block;font-weight:600;color:var(--accent)">Alternativas</label>
      
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <span style="color:var(--accent);font-weight:700;min-width:30px">A)</span>
        <input id="p_a" placeholder="Alternativa A" value="${pergunta?.alternativa_a || ''}" />
        <label style="display:flex;align-items:center;gap:6px;color:#94a3b8;cursor:pointer;font-size:.85rem">
          <input type="radio" name="correta" value="A" ${pergunta?.resposta_correta === 'A' ? 'checked' : ''} style="width:auto;margin:0" />
          Correta
        </label>
      </div>

      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <span style="color:var(--accent);font-weight:700;min-width:30px">B)</span>
        <input id="p_b" placeholder="Alternativa B" value="${pergunta?.alternativa_b || ''}" />
        <label style="display:flex;align-items:center;gap:6px;color:#94a3b8;cursor:pointer;font-size:.85rem">
          <input type="radio" name="correta" value="B" ${pergunta?.resposta_correta === 'B' ? 'checked' : ''} style="width:auto;margin:0" />
          Correta
        </label>
      </div>

      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <span style="color:var(--accent);font-weight:700;min-width:30px">C)</span>
        <input id="p_c" placeholder="Alternativa C" value="${pergunta?.alternativa_c || ''}" />
        <label style="display:flex;align-items:center;gap:6px;color:#94a3b8;cursor:pointer;font-size:.85rem">
          <input type="radio" name="correta" value="C" ${pergunta?.resposta_correta === 'C' ? 'checked' : ''} style="width:auto;margin:0" />
          Correta
        </label>
      </div>

      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <span style="color:var(--accent);font-weight:700;min-width:30px">D)</span>
        <input id="p_d" placeholder="Alternativa D" value="${pergunta?.alternativa_d || ''}" />
        <label style="display:flex;align-items:center;gap:6px;color:#94a3b8;cursor:pointer;font-size:.85rem">
          <input type="radio" name="correta" value="D" ${pergunta?.resposta_correta === 'D' ? 'checked' : ''} style="width:auto;margin:0" />
          Correta
        </label>
      </div>
    </div>

    <div class="card">
      <label>Explicacao da Resposta *</label>
      <textarea id="p_exp" rows="3" placeholder="Explique por que esta resposta esta correta. Este texto aparece para o aluno apos responder.">${pergunta?.explicacao || ''}</textarea>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div>
          <label>Tema *</label>
          <select id="p_tema">
            ${TEMAS_HISTORIA.map(t => `<option ${t === pergunta?.tema ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Dificuldade *</label>
          <select id="p_dif">
            <option value="facil" ${pergunta?.dificuldade === 'facil' ? 'selected' : ''}>Facil</option>
            <option value="medio" ${pergunta?.dificuldade === 'medio' ? 'selected' : ''}>Medio</option>
            <option value="dificil" ${pergunta?.dificuldade === 'dificil' ? 'selected' : ''}>Dificil</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-accent" id="btnSalvarPerg">💾 ${id ? 'Salvar alteracoes' : 'Criar pergunta'}</button>
      <button class="btn" id="btnCancelarPerg">Cancelar</button>
    </div>

    <div id="msgPerg"></div>
  `;

  document.getElementById('btnVoltar').addEventListener('click', telaProfPerguntas);
  document.getElementById('btnCancelarPerg').addEventListener('click', telaProfPerguntas);
  document.getElementById('btnSalvarPerg').addEventListener('click', () => salvarPergunta(id));
}

async function salvarPergunta(id) {
  const msg = document.getElementById('msgPerg');
  const correta = document.querySelector('input[name="correta"]:checked');

  const body = {
    enunciado: document.getElementById('p_enun').value.trim(),
    alternativa_a: document.getElementById('p_a').value.trim(),
    alternativa_b: document.getElementById('p_b').value.trim(),
    alternativa_c: document.getElementById('p_c').value.trim(),
    alternativa_d: document.getElementById('p_d').value.trim(),
    resposta_correta: correta ? correta.value : null,
    explicacao: document.getElementById('p_exp').value.trim(),
    tema: document.getElementById('p_tema').value,
    dificuldade: document.getElementById('p_dif').value
  };

  // Validacoes
  if (!body.enunciado) return msg.innerHTML = '<div class="alerta erro">Digite o enunciado</div>';
  if (!body.alternativa_a || !body.alternativa_b || !body.alternativa_c || !body.alternativa_d)
    return msg.innerHTML = '<div class="alerta erro">Preencha todas as alternativas</div>';
  if (!body.resposta_correta) return msg.innerHTML = '<div class="alerta erro">Marque a resposta correta</div>';
  if (!body.explicacao) return msg.innerHTML = '<div class="alerta erro">Digite a explicacao</div>';

  try {
    if (id) {
      await api('/professor/perguntas/' + id, { method: 'PUT', body: JSON.stringify(body) });
      msg.innerHTML = '<div class="alerta sucesso">✅ Pergunta atualizada!</div>';
    } else {
      await api('/professor/perguntas', { method: 'POST', body: JSON.stringify(body) });
      msg.innerHTML = '<div class="alerta sucesso">✅ Pergunta criada!</div>';
    }
    setTimeout(() => telaProfPerguntas(), 800);
  } catch(e) {
    msg.innerHTML = `<div class="alerta erro">${e.message}</div>`;
  }
}

async function excluirPergunta(id) {
  if (!confirm('Excluir esta pergunta?')) return;
  try {
    await api('/professor/perguntas/' + id, { method: 'DELETE' });
    telaProfPerguntas();
  } catch(e) { alert(e.message); }
}

// ============================================================
// ALUNOS
// ============================================================
async function telaProfAlunos() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando alunos...</div>';
  try {
    const lista = await api('/professor/alunos');
    app.innerHTML = `
      <div class="card">
        <h2>🎓 Alunos (${lista.length})</h2>
      </div>
      <div class="card">
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Nome</th><th>Turma</th><th>Pontos</th><th>Quizzes</th><th>Acertos</th><th>Erros</th><th>Taxa</th><th>Conquistas</th></tr></thead>
            <tbody>${lista.map(a => {
              const total = a.acertos + a.erros;
              const taxa = total > 0 ? Math.round((a.acertos / total) * 100) : 0;
              return `<tr>
                <td>${a.nome}</td>
                <td>${a.turma || '-'}</td>
                <td><strong>${a.pontos}</strong></td>
                <td>${a.quizzes}</td>
                <td style="color:var(--success)">${a.acertos}</td>
                <td style="color:var(--danger)">${a.erros}</td>
                <td>${taxa}%</td>
                <td>🏅 ${a.conquistas}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

// ============================================================
// Exportar para window
// ============================================================
window.telaProfDashboard = telaProfDashboard;
window.telaProfQuizzes = telaProfQuizzes;
window.telaProfCriarQuiz = telaProfCriarQuiz;
window.telaProfEditarQuiz = telaProfEditarQuiz;
window.telaProfPerguntas = telaProfPerguntas;
window.telaProfCriarPergunta = telaProfCriarPergunta;
window.telaProfAlunos = telaProfAlunos;
