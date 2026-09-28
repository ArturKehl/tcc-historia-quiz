// ============================================================
// QUIZ - fluxo completo com event listeners (sem onclick inline)
// ============================================================

let quizAtual = null;
let tentativaId = null;
let indiceAtual = 0;
let respondendo = false;

async function telaQuizzes() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando quizzes...</div>';

  try {
    const lista = await api('/quizzes/lista');
    if (!lista || lista.length === 0) {
      app.innerHTML = '<div class="card alerta erro">Nenhum quiz disponivel. O professor precisa criar quizzes primeiro.</div>';
      return;
    }

    app.innerHTML = `
      <h2>📚 Escolha um Quiz</h2>
      <div class="grid">
        ${lista.map(q => `
          <div class="card">
            <span class="badge">${q.tema}</span>
            <h3 style="margin-top:8px">${q.titulo}</h3>
            <p style="color:#94a3b8;font-size:.9rem">${q.descricao || ''}</p>
            <p style="font-size:.8rem;color:#64748b">${q.total_perguntas} perguntas • ${q.dificuldade}</p>
            <button class="btn btn-accent" style="margin-top:12px" data-quiz-id="${q.id}">▶ Jogar</button>
          </div>`).join('')}
      </div>`;

    // Adiciona event listeners
    const botoes = app.querySelectorAll('button[data-quiz-id]');
    console.log('[QUIZ] Encontrados', botoes.length, 'botoes de quiz');
    botoes.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.quizId);
        console.log('[QUIZ] Clicou no quiz ID:', id);
        iniciarQuiz(id);
      });
    });
  } catch(e) {
    console.error('[QUIZ] Erro ao listar:', e);
    app.innerHTML = `<div class="card alerta erro">Erro ao carregar quizzes: ${e.message}</div>`;
  }
}

async function iniciarQuiz(id) {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando quiz...</div>';

  try {
    console.log('[QUIZ] Buscando dados do quiz', id);
    quizAtual = await api('/quizzes/' + id);
    console.log('[QUIZ] Quiz carregado:', quizAtual);

    if (!quizAtual.perguntas || quizAtual.perguntas.length === 0) {
      app.innerHTML = '<div class="card alerta erro">Este quiz nao tem perguntas cadastradas.</div>';
      return;
    }

    indiceAtual = 0;
    respondendo = false;

    console.log('[QUIZ] Criando tentativa...');
    const t = await api('/quizzes/iniciar', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: id })
    });
    tentativaId = t.tentativa_id;
    console.log('[QUIZ] Tentativa criada:', tentativaId);

    renderPergunta();
  } catch(e) {
    console.error('[QUIZ] Erro ao iniciar:', e);
    app.innerHTML = `<div class="card alerta erro">Erro: ${e.message}</div>`;
  }
}

function renderPergunta() {
  const app = document.getElementById('main');
  const p = quizAtual.perguntas[indiceAtual];

  if (!p) {
    finalizarQuiz();
    return;
  }

  const prog = ((indiceAtual) / quizAtual.perguntas.length) * 100;

  app.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span class="badge">${p.tema}</span>
        <span style="color:#94a3b8">${indiceAtual+1} / ${quizAtual.perguntas.length}</span>
      </div>
      <div class="progress-bar" style="margin:12px 0"><div style="width:${prog}%"></div></div>
      <h3 style="margin:20px 0;color:#e2e8f0;font-size:1.2rem;line-height:1.5">${p.enunciado}</h3>
      <div id="alternativas">
        <button class="alt" data-letra="A"><strong>A)</strong> ${p.alternativa_a}</button>
        <button class="alt" data-letra="B"><strong>B)</strong> ${p.alternativa_b}</button>
        <button class="alt" data-letra="C"><strong>C)</strong> ${p.alternativa_c}</button>
        <button class="alt" data-letra="D"><strong>D)</strong> ${p.alternativa_d}</button>
      </div>
      <div id="feedback"></div>
    </div>`;

  // Adiciona event listeners nos botoes
  const botoes = app.querySelectorAll('button[data-letra]');
  console.log('[QUIZ] Botoes de alternativa:', botoes.length);
  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      if (respondendo) return;
      responder(btn.dataset.letra);
    });
  });
}

async function responder(letra) {
  if (respondendo) return;
  respondendo = true;

  const app = document.getElementById('main');
  const p = quizAtual.perguntas[indiceAtual];
  const botoes = app.querySelectorAll('button[data-letra]');
  botoes.forEach(b => b.disabled = true);

  try {
    console.log('[QUIZ] Respondendo:', letra);
    const r = await api('/quizzes/responder', {
      method: 'POST',
      body: JSON.stringify({
        tentativa_id: tentativaId,
        pergunta_id: p.id,
        resposta: letra
      })
    });

    console.log('[QUIZ] Resultado:', r);

    // Marcar visualmente
    botoes.forEach(b => {
      const l = b.dataset.letra;
      if (l === r.resposta_correta) b.classList.add('correta');
      else if (l === letra && !r.correta) b.classList.add('errada');
    });

    const feedback = document.getElementById('feedback');
    const ehUltima = (indiceAtual + 1 >= quizAtual.perguntas.length);

    feedback.innerHTML = `
      <div class="alerta ${r.correta ? 'sucesso' : 'erro'}">
        ${r.correta ? '✅ Correto! +' + r.pontos_ganhos + ' pontos' + (r.bonus_sequencia ? ' (Bonus +' + r.bonus_sequencia + ')' : '') : '❌ Errado! A resposta correta era <strong>' + r.resposta_correta + '</strong>'}
      </div>
      <div class="explicacao">
        <strong>💡 Explicacao:</strong> ${r.explicacao}
      </div>
      <button class="btn btn-accent" id="btnProxima" style="width:100%;margin-top:16px">
        ${ehUltima ? '🏁 Finalizar Quiz' : 'Proxima pergunta ➡'}
      </button>`;

    document.getElementById('btnProxima').addEventListener('click', () => {
      if (ehUltima) {
        finalizarQuiz();
      } else {
        indiceAtual++;
        respondendo = false;
        renderPergunta();
      }
    });
  } catch(e) {
    console.error('[QUIZ] Erro ao responder:', e);
    respondendo = false;
    botoes.forEach(b => b.disabled = false);
    
    // Se a sessao expirou, apenas mostra mensagem (o api.js ja fez logout)
    if (e.message.includes('sessao') || e.message.includes('Sessao')) {
      alert(e.message);
      return;
    }
    
    // Se a tentativa foi perdida, oferecer reiniciar
    if (e.message.includes('Tentativa nao encontrada')) {
      if (confirm('A tentativa anterior foi perdida. Deseja comecar este quiz de novo?')) {
        iniciarQuiz(quizAtual.quiz.id);
      } else {
        telaQuizzes();
      }
      return;
    }
    
    alert('Erro: ' + e.message);
  }
}

async function finalizarQuiz() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Calculando resultado...</div>';

  try {
    console.log('[QUIZ] Finalizando tentativa:', tentativaId);
    const r = await api('/quizzes/finalizar', {
      method: 'POST',
      body: JSON.stringify({ tentativa_id: tentativaId })
    });

    app.innerHTML = `
      <div class="card" style="text-align:center">
        <h2>🎉 Quiz Concluido!</h2>
        <div class="grid" style="margin-top:24px">
          <div class="stat"><span class="num">${r.acertos}</span><span class="label">Acertos</span></div>
          <div class="stat"><span class="num">${r.erros}</span><span class="label">Erros</span></div>
          <div class="stat"><span class="num">${r.pontuacao}</span><span class="label">Pontos</span></div>
          <div class="stat"><span class="num">${r.melhor_sequencia}</span><span class="label">Sequencia</span></div>
        </div>

        <div style="margin-top:24px">
          <p style="color:#94a3b8">Nivel atual</p>
          <p style="font-size:1.3rem;color:var(--accent);font-weight:700">${r.nivel.nivel} - ${r.nivel.nome}</p>
          <div class="progress-bar" style="margin:12px 0"><div style="width:${r.nivel.progresso}%"></div></div>
          <p style="font-size:.85rem;color:#94a3b8">${r.nivel.xpAtual} / ${r.nivel.xpProximo} XP → Proximo: ${r.nivel.proximoNome}</p>
        </div>

        ${r.novas_conquistas && r.novas_conquistas.length ? `
          <div style="margin-top:24px;background:rgba(245,158,11,.1);border:2px solid var(--accent);border-radius:12px;padding:20px">
            <h3 style="color:var(--accent)">🏅 Novas Conquistas Desbloqueadas!</h3>
            <div class="grid" style="margin-top:12px">
              ${r.novas_conquistas.map(c => `
                <div class="conquista">
                  <span class="icon">${c.icone}</span>
                  <strong>${c.nome}</strong>
                  <p style="font-size:.8rem;color:#94a3b8">${c.descricao || ''}</p>
                </div>`).join('')}
            </div>
          </div>` : ''}

        <div style="display:flex;gap:12px;justify-content:center;margin-top:32px;flex-wrap:wrap">
          <button class="btn btn-accent" id="btnVoltarQuizzes">📚 Mais quizzes</button>
          <button class="btn" id="btnIrPainel">🏠 Painel</button>
        </div>
      </div>`;

    document.getElementById('btnVoltarQuizzes').addEventListener('click', telaQuizzes);
    document.getElementById('btnIrPainel').addEventListener('click', telaDashboard);
  } catch(e) {
    console.error('[QUIZ] Erro ao finalizar:', e);
    app.innerHTML = `<div class="card alerta erro">Erro ao finalizar: ${e.message}</div>`;
  }
}

// Exportar globais
window.telaQuizzes = telaQuizzes;
window.iniciarQuiz = iniciarQuiz;
window.responder = responder;
window.finalizarQuiz = finalizarQuiz;


