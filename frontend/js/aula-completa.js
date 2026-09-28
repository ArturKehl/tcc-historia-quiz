// ============================================================
// TELA DE AULA COMPLETA - conteudo didatico aprofundado
// ============================================================

async function telaAulaCompleta(tema) {
  app.innerHTML = '<div class="card">Carregando aula...</div>';
  try {
    const c = await api('/conteudos/completo/' + encodeURIComponent(tema));
    app.innerHTML = `
      <div class="card" style="max-width:900px;margin:0 auto">
        <button class="btn" id="btnVoltarAula">← Voltar aos temas</button>
        
        <div style="margin-top:20px">
          <span class="badge" style="background:var(--accent);color:#1a1a1a">📖 AULA COMPLETA</span>
          <h1 style="font-size:2rem;margin:12px 0;color:var(--accent)">${c.tema}</h1>
          <p style="font-size:1.1rem;color:#94a3b8;font-style:italic">${c.subtitulo}</p>
          <p style="color:#64748b;font-size:.85rem;margin-top:8px">
            ⏱️ ${c.duracao} • 📚 ${c.secoes.length} secoes • ✍️ ${c.questoesComentadas.length} questoes comentadas
          </p>
        </div>

        <div class="card" style="background:rgba(59,130,246,.1);border-left:4px solid var(--accent2);margin-top:24px">
          <h3 style="margin-bottom:8px">📌 Introducao</h3>
          <p style="line-height:1.7;color:#e2e8f0">${c.introducao}</p>
        </div>

        <div style="margin-top:32px">
          <h2 style="color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:8px">📑 Sumario</h2>
          <ol style="margin:16px 0 32px 24px;line-height:2;color:#94a3b8">
            ${c.secoes.map(s => `<li>${s.titulo}</li>`).join('')}
          </ol>
        </div>

        ${c.secoes.map((s, i) => `
          <div style="margin-top:32px">
            <h2 style="color:var(--accent2);border-left:4px solid var(--accent2);padding-left:12px">${s.titulo}</h2>
            <div style="line-height:1.8;color:#cbd5e1;white-space:pre-wrap;margin-top:16px;font-size:.95rem">${s.conteudo}</div>
          </div>
        `).join('')}

        <div class="card" style="background:rgba(245,158,11,.1);border-left:4px solid var(--accent);margin-top:40px">
          <h2 style="color:var(--accent)">🗓️ Linha do Tempo</h2>
          <div style="margin-top:16px">
            ${c.linhaDoTempo.map(l => `
              <div style="display:flex;gap:16px;padding:8px 0;border-bottom:1px solid #334155">
                <strong style="color:var(--accent);min-width:110px">${l.ano}</strong>
                <span style="color:#cbd5e1">${l.evento}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card" style="background:rgba(16,185,129,.1);border-left:4px solid var(--success);margin-top:24px">
          <h2 style="color:var(--success)">🔑 Conceitos-Chave</h2>
          <div style="margin-top:16px">
            ${c.conceitosChave.map(cp => `
              <div style="margin-bottom:16px">
                <strong style="color:var(--accent)">${cp.termo}</strong>
                <p style="color:#cbd5e1;font-size:.9rem;margin-top:4px;line-height:1.6">${cp.definicao}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card" style="background:rgba(239,68,68,.1);border-left:4px solid var(--danger);margin-top:24px">
          <h2 style="color:var(--danger)">✍️ Questoes Comentadas</h2>
          <div style="margin-top:16px">
            ${c.questoesComentadas.map((q, i) => `
              <div style="margin-bottom:24px;padding:16px;background:#0f172a;border-radius:8px">
                <strong style="color:var(--accent)">Q${i+1}: ${q.pergunta}</strong>
                <p style="color:var(--success);margin-top:8px"><strong>Resposta:</strong> ${q.resposta}</p>
                <p style="color:#94a3b8;font-size:.9rem;margin-top:8px;line-height:1.6"><em>💬 ${q.comentario}</em></p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card" style="background:rgba(148,163,184,.05);margin-top:24px">
          <h3 style="color:#94a3b8">📚 Bibliografia</h3>
          <ul style="margin:12px 0 0 24px;line-height:2;color:#94a3b8;font-size:.9rem">
            ${c.bibliografia.map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>

        <div style="display:flex;gap:12px;justify-content:center;margin-top:32px">
          <button class="btn btn-accent" id="btnFazerQuizAula">🎯 Fazer quiz deste tema</button>
          <button class="btn" id="btnVoltarAula2">← Voltar</button>
        </div>
      </div>`;

    document.getElementById('btnVoltarAula').addEventListener('click', telaEstudos);
    document.getElementById('btnVoltarAula2').addEventListener('click', telaEstudos);
    document.getElementById('btnFazerQuizAula').addEventListener('click', telaQuizzes);
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

window.telaAulaCompleta = telaAulaCompleta;
