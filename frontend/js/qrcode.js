// ============================================================
// QR CODE - Compartilhar turma via QR Code
// ============================================================

// Detecta o IP da rede local (nao localhost) para o QR Code
async function obterURLBase() {
  // Tenta pegar o IP do servidor
  try {
    const r = await fetch('/api/qrcode/ip-base').catch(() => null);
    if (r && r.ok) {
      const d = await r.json();
      if (d.url) return d.url;
    }
  } catch(e) {}
  
  // Fallback: usa a URL atual
  return window.location.origin;
}

// ============================================================
// MODAL COM QR CODE
// ============================================================
async function abrirQRCodeTurma(turmaId) {
  // Cria o modal
  const modal = document.createElement('div');
  modal.id = 'modalQRCode';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;overflow-y:auto;';
  modal.innerHTML = `
    <div class="card" style="max-width:500px;width:100%;text-align:center">
      <button class="btn" id="btnFecharQR" style="position:absolute;top:12px;right:12px;padding:6px 12px">✕</button>
      <h2 style="margin:0 0 8px 0">QR Code da Turma</h2>
      <p style="color:#94a3b8;font-size:.85rem;margin-bottom:16px" id="qrNomeTurma">Carregando...</p>

      <div id="qrLoading" style="padding:40px">
        <p style="color:#94a3b8">Gerando QR Code...</p>
      </div>

      <div id="qrConteudo" class="hidden">
        <div style="background:white;padding:16px;border-radius:12px;display:inline-block;margin-bottom:16px">
          <img id="qrImagem" style="display:block;max-width:100%;width:300px;height:300px" alt="QR Code" />
        </div>

        <div style="background:#0f172a;padding:12px;border-radius:8px;margin-bottom:16px">
          <p style="color:#94a3b8;font-size:.75rem;margin-bottom:4px">Código de convite</p>
          <p id="qrCodigo" style="font-size:1.6rem;font-weight:700;color:var(--accent);letter-spacing:3px;font-family:monospace">
            ————
          </p>
        </div>

        <div style="background:#0f172a;padding:12px;border-radius:8px;margin-bottom:16px">
          <p style="color:#94a3b8;font-size:.75rem;margin-bottom:4px">Link de convite</p>
          <p id="qrURL" style="font-size:.8rem;color:#e2e8f0;word-break:break-all;font-family:monospace">
            —
          </p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <button class="btn btn-accent" id="btnBaixarQR">⬇ Baixar QR</button>
          <button class="btn" id="btnCopiarLink">📋 Copiar link</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn" id="btnCopiarCodigo">📋 Copiar código</button>
          <button class="btn" id="btnImprimirQR">🖨️ Imprimir</button>
        </div>

        <p style="color:#64748b;font-size:.75rem;margin-top:16px;line-height:1.5">
          💡 <strong>Como usar:</strong> mostre este QR Code na tela ou imprima um cartaz. 
          Os alunos escaneiam com a câmera do celular e entram automaticamente na turma.
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Fechar
  document.getElementById('btnFecharQR').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Buscar QR code
  try {
    const data = await api('/qrcode/turma/' + turmaId);

    document.getElementById('qrNomeTurma').textContent = data.turma.nome;
    document.getElementById('qrImagem').src = data.qrcode;
    document.getElementById('qrCodigo').textContent = data.turma.codigo;
    document.getElementById('qrURL').textContent = data.url;

    document.getElementById('qrLoading').classList.add('hidden');
    document.getElementById('qrConteudo').classList.remove('hidden');

    // Botões
    document.getElementById('btnBaixarQR').addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = data.qrcode;
      link.download = 'qrcode-' + data.turma.nome.replace(/\s+/g, '-') + '.png';
      link.click();
    });

    document.getElementById('btnCopiarLink').addEventListener('click', (e) => {
      navigator.clipboard.writeText(data.url);
      e.target.textContent = '✅ Copiado!';
      setTimeout(() => e.target.textContent = '📋 Copiar link', 1500);
    });

    document.getElementById('btnCopiarCodigo').addEventListener('click', (e) => {
      navigator.clipboard.writeText(data.turma.codigo);
      e.target.textContent = '✅ Copiado!';
      setTimeout(() => e.target.textContent = '📋 Copiar código', 1500);
    });

    document.getElementById('btnImprimirQR').addEventListener('click', () => {
      const win = window.open('', '_blank');
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code - ${data.turma.nome}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { color: #0f172a; margin-bottom: 8px; }
            h2 { color: #64748b; font-size: 1.2rem; margin-bottom: 24px; }
            img { width: 400px; height: 400px; }
            .codigo { font-size: 2rem; font-weight: 700; color: #f59e0b; letter-spacing: 4px; font-family: monospace; margin: 16px 0; }
            .instrucoes { margin-top: 32px; color: #64748b; font-size: .9rem; }
          </style>
        </head>
        <body>
          <h1>📱 Entre na turma</h1>
          <h2>${data.turma.nome}</h2>
          <img src="${data.qrcode}" />
          <div class="codigo">${data.turma.codigo}</div>
          <div class="instrucoes">
            Escaneie o QR Code com a câmera do celular<br>
            ou acesse: <strong>${data.url}</strong>
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }<\/script>
        </body>
        </html>
      `);
      win.document.close();
    });
  } catch(e) {
    document.getElementById('qrLoading').innerHTML = '<p style="color:#ef4444">Erro: ' + e.message + '</p>';
  }
}

// ============================================================
// Verifica se URL tem ?turma=CODIGO (após escanear QR Code)
// ============================================================
async function verificarConviteNaURL() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('turma');

  if (!codigo) return false;

  // Guarda o código na sessão
  sessionStorage.setItem('convite_pendente', codigo);
  console.log('[QR] Convite detectado:', codigo);

  // Remove o parâmetro da URL (limpa)
  window.history.replaceState({}, '', window.location.pathname);

  // Se o usuário já está logado como aluno, entra direto
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (usuario && usuario.tipo === 'aluno') {
    await entrarNaTurmaComConvite(codigo);
    return true;
  }

  // Se não está logado, mostra mensagem
  return false;
}

// ============================================================
// Entra na turma com o código do convite
// ============================================================
async function entrarNaTurmaComConvite(codigo) {
  try {
    const r = await api('/turmas/entrar', {
      method: 'POST',
      body: JSON.stringify({ codigo })
    });

    // Mensagem de sucesso
    const notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#10b981,#059669);color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-weight:600;box-shadow:0 4px 20px rgba(16,185,129,.5);';
    notif.innerHTML = '✅ ' + r.mensagem;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 3000);

    // Redireciona para a tela da turma
    setTimeout(() => {
      if (typeof telaMinhaTurma === 'function') telaMinhaTurma();
    }, 500);
  } catch(e) {
    // Se já estiver na turma, não é erro crítico
    if (e.message.includes('ja esta')) {
      console.log('[QR] Aluno ja esta na turma');
      if (typeof telaMinhaTurma === 'function') telaMinhaTurma();
    } else {
      const notif = document.createElement('div');
      notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:16px 24px;border-radius:12px;z-index:99999;font-weight:600;';
      notif.innerHTML = '❌ ' + e.message;
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 4000);
    }
  }
}

// ============================================================
// Processa convite pendente após login
// ============================================================
async function processarConvitePendente() {
  const codigo = sessionStorage.getItem('convite_pendente');
  if (!codigo) return;

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!usuario || usuario.tipo !== 'aluno') return;

  sessionStorage.removeItem('convite_pendente');
  await entrarNaTurmaComConvite(codigo);
}

// Exportar
window.abrirQRCodeTurma = abrirQRCodeTurma;
window.verificarConviteNaURL = verificarConviteNaURL;
window.processarConvitePendente = processarConvitePendente;
