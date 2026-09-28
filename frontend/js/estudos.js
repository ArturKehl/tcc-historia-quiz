// ============================================================
// TELA DE ESTUDOS - materiais + arquivos do professor
// ============================================================

async function telaEstudos() {
  app.innerHTML = '<div class="card">Carregando temas...</div>';
  try {
    const temas = await api('/materiais/temas');
    let completos = [];
    let arquivos = [];
    try { completos = await api('/conteudos/completos'); } catch(e) {}
    try { arquivos = await api('/arquivos'); } catch(e) {}

    // Agrupa arquivos por tema
    const arquivosPorTema = {};
    arquivos.forEach(a => {
      const t = a.tema || 'Geral';
      if (!arquivosPorTema[t]) arquivosPorTema[t] = [];
      arquivosPorTema[t].push(a);
    });

    app.innerHTML = `
      <div class="card">
        <h2>📖 Estude este conteudo</h2>
        <p style="color:#94a3b8">Escolha um tema. Voce pode ler, assistir, ouvir e acessar arquivos enviados pelo professor.</p>
      </div>
      <div class="grid">
        ${temas.map(t => {
          const c = completos.find(x => x.tema === t);
          const arqs = arquivosPorTema[t] || [];
          return `
            <div class="card">
              <h3>${t}</h3>
              <p style="color:#94a3b8;font-size:.85rem;min-height:40px">${c ? c.subtitulo : 'Texto, video, audio e resumo'}</p>
              ${c ? `<p style="color:#64748b;font-size:.75rem">⏱️ ${c.duracao} • 📚 ${c.totalSecoes} secoes</p>` : ''}
              ${arqs.length ? `<p style="color:#f59e0b;font-size:.75rem;margin-top:4px">📎 ${arqs.length} arquivo(s) do professor</p>` : ''}
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                <button class="btn" data-abrir="${t}">📚 Materiais</button>
                ${c ? `<button class="btn btn-accent" data-aula="${t}">📖 Aula completa</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${arquivos.filter(a => !a.tema).length ? `
      <div class="card" style="margin-top:24px">
        <h3>📎 Arquivos gerais do professor</h3>
        <div class="grid" style="margin-top:12px">
          ${arquivos.filter(a => !a.tema).map(a => renderCardArquivo(a)).join('')}
        </div>
      </div>` : ''}
    `;

    app.querySelectorAll('button[data-abrir]').forEach(btn => {
      btn.addEventListener('click', () => abrirTema(btn.dataset.abrir));
    });
    app.querySelectorAll('button[data-aula]').forEach(btn => {
      btn.addEventListener('click', () => telaAulaCompleta(btn.dataset.aula));
    });
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

function renderCardArquivo(a) {
  const icone = a.tipo_mime.startsWith('image/') ? '🖼️'
    : a.tipo_mime === 'application/pdf' ? '📕'
    : a.tipo_mime.includes('video') ? '🎥'
    : a.tipo_mime.includes('audio') ? '🎧' : '📄';
  return `
    <div class="card" style="background:#0f172a">
      <span class="badge">${icone} ${a.tipo_mime.split('/')[1]}</span>
      <h4 style="margin:8px 0;color:#e2e8f0">${a.titulo}</h4>
      ${a.descricao ? `<p style="color:#94a3b8;font-size:.8rem">${a.descricao}</p>` : ''}
      <p style="color:#64748b;font-size:.75rem;margin-top:8px">
        Prof. ${a.professor_nome} • ${formatarTamanho(a.tamanho)}
      </p>
      <a href="/api/arquivos/${a.id}/download?token=${localStorage.getItem('token')}" 
         target="_blank" class="btn btn-accent" style="text-decoration:none;text-align:center;margin-top:12px;display:block">
        👁️ Abrir
      </a>
    </div>`;
}

async function abrirTema(tema) {
  app.innerHTML = '<div class="card">Carregando material...</div>';
  try {
    const materiais = await api('/materiais/tema/' + encodeURIComponent(tema));
    let arquivos = [];
    try { arquivos = await api('/arquivos?tema=' + encodeURIComponent(tema)); } catch(e) {}
    
    const tipos = { texto: '📄 Texto', video: '🎥 Video', audio: '🎧 Audio', resumo: '⚡ Resumo' };
    const tiposOrdem = ['texto', 'video', 'audio', 'resumo'];

    app.innerHTML = `
      <div class="card">
        <button class="btn" id="btnVoltarEstudos">← Voltar</button>
        <h2 style="margin-top:16px">${tema}</h2>
        <p style="color:#94a3b8">Escolha o formato que preferir para estudar</p>
      </div>

      ${arquivos.length ? `
      <div class="card" style="background:rgba(245,158,11,.08);border-left:4px solid var(--accent)">
        <h3>📎 Arquivos enviados pelo professor (${arquivos.length})</h3>
        <div class="grid" style="margin-top:12px">
          ${arquivos.map(a => renderCardArquivo(a)).join('')}
        </div>
      </div>` : ''}

      <div class="card">
        ${tiposOrdem.map(tipo => {
          const lista = materiais.filter(x => x.tipo === tipo);
          if (lista.length === 0) return '';
          return lista.map(m => `
            <div style="background:#0f172a;padding:16px;border-radius:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
              <div>
                <strong style="color:var(--accent)">${tipos[tipo]}</strong>
                <p style="color:#cbd5e1;font-size:.9rem;margin-top:4px">${m.titulo}</p>
              </div>
              <button class="btn btn-accent" data-material="${m.id}">Abrir</button>
            </div>
          `).join('');
        }).join('')}
      </div>`;

    document.getElementById('btnVoltarEstudos').addEventListener('click', telaEstudos);
    app.querySelectorAll('button[data-material]').forEach(btn => {
      btn.addEventListener('click', () => abrirMaterial(parseInt(btn.dataset.material)));
    });
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

async function abrirMaterial(id) {
  app.innerHTML = '<div class="card">Carregando...</div>';
  try {
    const m = await api('/materiais/' + id);
    let conteudoHtml = '';

    if (m.tipo === 'video' || m.tipo === 'audio') {
      conteudoHtml = `
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:16px 0">
          <iframe src="${m.url}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"
            allowfullscreen></iframe>
        </div>`;
    } else {
      conteudoHtml = `<pre style="white-space:pre-wrap;font-family:inherit;line-height:1.7;background:#0f172a;padding:20px;border-radius:12px;margin:16px 0;font-size:.95rem">${m.conteudo}</pre>`;
    }

    app.innerHTML = `
      <div class="card">
        <button class="btn" id="btnVoltarMaterial">← Voltar</button>
        <h2 style="margin-top:16px">${m.titulo}</h2>
        <span class="badge">${m.tema}</span>
        <span class="badge">${m.tipo}</span>
        ${conteudoHtml}
      </div>`;
    document.getElementById('btnVoltarMaterial').addEventListener('click', () => abrirTema(m.tema));
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

window.telaEstudos = telaEstudos;
window.abrirTema = abrirTema;
window.abrirMaterial = abrirMaterial;
