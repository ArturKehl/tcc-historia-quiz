async function telaDashboard() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando painel...</div>';

  try {
    const d = await api('/quizzes/dashboard');
    app.innerHTML = `
      <div class="card">
        <h2>Ola, ${d.nome}! 👋</h2>
        <p style="color:#94a3b8">Nivel ${d.nivel.nivel} - ${d.nivel.nome}</p>
        <div class="progress-bar" style="margin:12px 0"><div style="width:${d.nivel.progresso}%"></div></div>
        <p style="font-size:.85rem;color:#94a3b8">${d.nivel.xpAtual} / ${d.nivel.xpProximo} XP → Proximo: ${d.nivel.proximoNome}</p>
      </div>

      <div class="grid">
        <div class="stat"><span class="num">${d.pontos}</span><span class="label">Pontuacao</span></div>
        <div class="stat"><span class="num">${d.quizzes_realizados}</span><span class="label">Quizzes</span></div>
        <div class="stat"><span class="num">${d.taxa_acerto}%</span><span class="label">Taxa Acerto</span></div>
        <div class="stat"><span class="num">${d.posicao_ranking || '-'}</span><span class="label">Ranking</span></div>
        <div class="stat"><span class="num">${d.melhor_sequencia}</span><span class="label">Melhor Seq.</span></div>
        <div class="stat"><span class="num">${d.conquistas.length}</span><span class="label">Conquistas</span></div>
      </div>

      <div class="card" style="margin-top:20px">
        <h3>🏅 Conquistas (${d.conquistas.length})</h3>
        <div class="grid">
          ${d.conquistas.length
            ? d.conquistas.map(c => `
                <div class="conquista">
                  <span class="icon">${c.icone}</span>
                  <strong>${c.nome}</strong>
                  <p style="font-size:.8rem;color:#94a3b8">${c.descricao}</p>
                </div>`).join('')
            : '<p style="color:#94a3b8">Nenhuma conquista ainda. Complete quizzes para desbloquear!</p>'}
        </div>
      </div>

      <div class="card">
        <h3>🎯 Acoes rapidas</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-accent" id="btnIrQuizzes">📚 Fazer um quiz</button>
          <button class="btn" id="btnIrEstudos">📖 Estudar</button>
          <button class="btn" id="btnIrRanking">🏆 Ver ranking</button>
        </div>
      </div>`;

    document.getElementById('btnIrQuizzes').addEventListener('click', telaQuizzes);
    document.getElementById('btnIrEstudos').addEventListener('click', telaEstudos);
    document.getElementById('btnIrRanking').addEventListener('click', telaRanking);
  } catch(e) {
    console.error('[DASHBOARD] Erro:', e);
    app.innerHTML = `<div class="card alerta erro">Erro: ${e.message}</div>`;
  }
}

async function telaHistorico() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando historico...</div>';

  try {
    const h = await api('/quizzes/historico');
    app.innerHTML = `
      <div class="card">
        <h2>📜 Historico de Atividades</h2>
        ${h.length === 0
          ? '<p style="color:#94a3b8">Nenhum quiz realizado ainda. Comece a jogar!</p>'
          : `<div style="overflow-x:auto"><table>
              <thead><tr><th>Quiz</th><th>Tema</th><th>Acertos</th><th>Erros</th><th>Pontos</th><th>Data</th></tr></thead>
              <tbody>${h.map(t => `
                <tr>
                  <td>${t.titulo}</td>
                  <td>${t.tema}</td>
                  <td style="color:var(--success)">${t.quantidade_acertos}</td>
                  <td style="color:var(--danger)">${t.quantidade_erros}</td>
                  <td><strong>${t.pontuacao}</strong></td>
                  <td>${new Date(t.data_realizacao).toLocaleString('pt-BR')}</td>
                </tr>`).join('')}</tbody>
            </table></div>`}
      </div>`;
  } catch(e) {
    app.innerHTML = `<div class="card alerta erro">${e.message}</div>`;
  }
}

window.telaDashboard = telaDashboard;
window.telaHistorico = telaHistorico;
