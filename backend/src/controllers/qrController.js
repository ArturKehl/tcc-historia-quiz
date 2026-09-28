const QRCode = require('qrcode');
const { dbWrapper: db } = require('../config/database');

// Gera QR Code (PNG em base64) para uma turma
exports.gerarQRCodeTurma = async (req, res) => {
  try {
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    // URL que o aluno vai abrir ao escanear
    // Formato: http://SEU_IP:3000/?turma=HIST-XXXX
    const baseUrl = req.protocol + '://' + req.get('host');
    const url = baseUrl + '/?turma=' + turma.codigo_convite;

    // Gera QR Code em base64 (data URI)
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',   // azul escuro
        light: '#ffffff'   // branco
      },
      errorCorrectionLevel: 'M'
    });

    res.json({
      turma: { id: turma.id, nome: turma.nome, codigo: turma.codigo_convite },
      url,
      qrcode: qrDataUrl
    });
  } catch(e) {
    console.error('[QR] Erro:', e);
    res.status(500).json({ erro: e.message });
  }
};

// Gera QR Code em formato SVG (alternativa ao PNG)
exports.gerarQRCodeTurmaSVG = async (req, res) => {
  try {
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    const baseUrl = req.protocol + '://' + req.get('host');
    const url = baseUrl + '/?turma=' + turma.codigo_convite;

    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
};

// Retorna a URL de convite (sem QR code)
exports.urlConvite = (req, res) => {
  try {
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    const baseUrl = req.protocol + '://' + req.get('host');
    const url = baseUrl + '/?turma=' + turma.codigo_convite;

    res.json({
      codigo: turma.codigo_convite,
      url,
      instrucoes: 'Compartilhe este link ou QR Code com os alunos. Ao acessar, eles serao direcionados para entrar na turma.'
    });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
};

// Retorna a URL base com IP da rede local (para QR Code funcionar no celular)
exports.ipBase = (req, res) => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let ipLocal = null;
  
  for (const nome in nets) {
    for (const net of nets[nome]) {
      if (net.family === 'IPv4' && !net.internal) {
        ipLocal = net.address;
        break;
      }
    }
    if (ipLocal) break;
  }
  
  const host = req.get('host');
  const porta = host.split(':')[1] || '3000';
  const url = ipLocal ? 'http://' + ipLocal + ':' + porta : req.protocol + '://' + host;
  
  res.json({ ip: ipLocal, porta, url });
};