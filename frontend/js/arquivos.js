// ============================================================
// TELA DE ARQUIVOS - Upload e gerenciamento (professor)
// ============================================================

async function telaProfArquivos() {
  app.innerHTML = '<div class="card">Carregando arquivos...</div>';
  try {
    const arquivos = await api('/arquivos');
    app.innerHTML = `
      <div class="card">
        <h2>📎 Gerenciar Arquivos</h2>
        <p style="color:#94a3b8">Envie PDFs, imagens, slides, videos e audios para seus alunos</p>
        <button class="btn btn-accent" id="btnNovoArquivo" style="margin-top:12px">+ Enviar novo arquivo</button>
        <div id="formArquivo" style="margin-top:16px"></div>
      </div>
      <div class="card">
        <h3>📁 Arquivos enviados (${arquivos.length})</h3>
        ${arquivos.length === 0 ? '<p style="color:#94a3b8">Nenhum arquivo enviado ainda.</p>' : `
        <div class="grid" style="margin-top:12px">
          ${arquivos.map(a => `
            <div class="card" style="background:#0f172a">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <span class="badge">${getIcone(a.tipo_mime)} ${a.tipo_mime.split('/')[1]}</span>
                <span class="badge" style="background:${a.visivel_aluno ? 'rgba(16,185,129,.2)' : 'rgba(148,163,184,.2)'}">
                  ${a.visivel_aluno ? '👁️ Visivel' : '🔒 Oculto'}
                </span>
              </div>
              <h4 style="margin:8px 0;color:#e2e8f0">${a.titulo}</h4>
              ${a.descricao ? `<p style="color:#94a3b8;font-size:.85rem">${a.descricao}</p>` : ''}
              ${a.tema ? `<span class="badge">${a.tema}</span>` : ''}
              <p style="color:#64748b;font-size:.75rem;margin-top:8px">
                📄 ${a.nome_original} (${formatarTamanho(a.tamanho)})
              </p>
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                <a href="/api/arquivos/${a.id}/download?token=${localStorage.getItem('token')}" 
                   target="_blank" class="btn btn-accent" style="text-decoration:none;text-align:center">
                  👁️ Ver
                </a>
                <button class="btn btn-danger" data-excluir="${a.id}">🗑️ Excluir</button>
              </div>
            </div>
          `).join('')}
        </div>`}
      </div>`;

    document.getElementById('btnNovoArquivo').addEventListener('click', formNovoArquivo);
    app.querySelectorAll('button[data-excluir]').forEach(btn => {
      btn.addEventListener('click', () => excluirArquivo(parseInt(btn.dataset.excluir)));
    });
  } catch(e) { app.innerHTML = `<div class="card alerta erro">${e.message}</div>`; }
}

function getIcone(mime) {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word')) return '📘';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📙';
  if (mime.startsWith('video/')) return '🎥';
  if (mime.startsWith('audio/')) return '🎧';
  return '📄';
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formNovoArquivo() {
  const TEMAS = ['Historia do Brasil','Segunda Guerra Mundial','Revolucao Francesa','Revolucao Industrial','Antiguidade','Idade Media','Idade Moderna','Idade Contemporanea'];
  
  document.getElementById('formArquivo').innerHTML = `
    <div class="card" style="background:#0f172a">
      <h3>📤 Enviar novo arquivo</h3>
      <div style="background:rgba(59,130,246,.1);border-left:4px solid var(--accent2);padding:12px;border-radius:8px;margin:12px 0;font-size:.85rem;color:#94a3b8">
        <strong>Tipos aceitos:</strong> PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, GIF, WEBP, MP4, MP3, TXT<br>
        <strong>Tamanho maximo:</strong> 50 MB
      </div>
      <label>Titulo *</label>
      <input id="arq_titulo" placeholder="Ex: Slides da aula de Brasil Colonial" />
      <label>Descricao (opcional)</label>
      <textarea id="arq_desc" rows="2" placeholder="Uma breve descricao do arquivo"></textarea>
      <label>Tema (opcional)</label>
      <select id="arq_tema">
        <option value="">-- Sem tema especifico --</option>
        ${TEMAS.map(t => `<option>${t}</option>`).join('')}
      </select>
      <label>Arquivo *</label>
      <input type="file" id="arq_file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mp3,.txt" />
      <label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer">
        <input type="checkbox" id="arq_visivel" checked style="width:auto;margin:0" />
        Visivel para os alunos
      </label>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-accent" id="btnEnviarArquivo">📤 Enviar</button>
        <button class="btn" id="btnCancelarArquivo">Cancelar</button>
      </div>
      <div id="progressoUpload" style="margin-top:12px"></div>
    </div>`;

  document.getElementById('btnEnviarArquivo').addEventListener('click', enviarArquivo);
  document.getElementById('btnCancelarArquivo').addEventListener('click', () => {
    document.getElementById('formArquivo').innerHTML = '';
  });
}

async function enviarArquivo() {
  const titulo = document.getElementById('arq_titulo').value.trim();
  const descricao = document.getElementById('arq_desc').value.trim();
  const tema = document.getElementById('arq_tema').value;
  const visivel = document.getElementById('arq_visivel').checked;
  const fileInput = document.getElementById('arq_file');

  if (!titulo) return alert('Digite um titulo');
  if (!fileInput.files[0]) return alert('Selecione um arquivo');

  const formData = new FormData();
  formData.append('titulo', titulo);
  formData.append('descricao', descricao);
  formData.append('tema', tema);
  formData.append('visivel_aluno', visivel ? 'true' : 'false');
  formData.append('arquivo', fileInput.files[0]);

  const prog = document.getElementById('progressoUpload');
  prog.innerHTML = '<p style="color:#94a3b8">📤 Enviando...</p>';

  try {
    const res = await fetch('/api/arquivos', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro no upload');
    
    prog.innerHTML = '<p style="color:#10b981">✅ Enviado com sucesso!</p>';
    setTimeout(() => telaProfArquivos(), 800);
  } catch(e) {
    prog.innerHTML = `<p style="color:#ef4444">❌ ${e.message}</p>`;
  }
}

async function excluirArquivo(id) {
  if (!confirm('Excluir este arquivo? Essa acao nao pode ser desfeita.')) return;
  try {
    await api('/arquivos/' + id, { method: 'DELETE' });
    telaProfArquivos();
  } catch(e) { alert(e.message); }
}

// ------------------------------------------------------------
// Tela de arquivos para o ALUNO (dentro de Estudar)
// ------------------------------------------------------------
async function telaArquivosAluno(tema) {
  try {
    const url = tema ? '/arquivos?tema=' + encodeURIComponent(tema) : '/arquivos';
    const arquivos = await api(url);
    return arquivos;
  } catch(e) { return []; }
}

window.telaProfArquivos = telaProfArquivos;
window.telaArquivosAluno = telaArquivosAluno;
