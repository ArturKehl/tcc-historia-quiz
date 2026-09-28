const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { dbWrapper: db } = require('../config/database');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Tipos permitidos
const TIPOS_PERMITIDOS = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
  'text/plain': '.txt'
};

// Configuracao do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nomeUnico = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, nomeUnico);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (TIPOS_PERMITIDOS[file.mimetype]) return cb(null, true);
    cb(new Error('Tipo de arquivo nao permitido: ' + file.mimetype));
  }
});

// Middleware exportado
exports.middlewareUpload = upload.single('arquivo');

// POST /api/arquivos - Upload
exports.uploadArquivo = (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

  const { titulo, descricao, tema, visivel_aluno } = req.body;

  if (!titulo) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ erro: 'Titulo e obrigatorio' });
  }

  const r = db.prepare(`
    INSERT INTO arquivos (titulo, descricao, nome_arquivo, nome_original, tipo_mime, tamanho, tema, professor_id, visivel_aluno)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(
    titulo,
    descricao || '',
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    tema || null,
    req.usuario.id,
    visivel_aluno === 'false' ? 0 : 1
  );

  res.status(201).json({
    id: r.lastInsertRowid,
    mensagem: 'Arquivo enviado com sucesso!',
    arquivo: {
      id: r.lastInsertRowid,
      titulo,
      nome_original: req.file.originalname,
      tamanho: req.file.size,
      tipo_mime: req.file.mimetype
    }
  });
};

// GET /api/arquivos - Lista (professor ve todos os seus; aluno ve apenas visiveis)
exports.listarArquivos = (req, res) => {
  const { tema } = req.query;
  const ehProfessor = req.usuario.tipo === 'professor';

  let sql = `
    SELECT a.*, u.nome AS professor_nome
    FROM arquivos a
    JOIN usuarios u ON u.id = a.professor_id
    WHERE 1=1
  `;
  const params = [];

  if (!ehProfessor) {
    sql += ' AND a.visivel_aluno = 1';
  } else {
    sql += ' AND a.professor_id = ?';
    params.push(req.usuario.id);
  }

  if (tema) {
    sql += ' AND a.tema = ?';
    params.push(tema);
  }

  sql += ' ORDER BY a.data_upload DESC';

  res.json(db.prepare(sql).all(...params));
};

// GET /api/arquivos/:id/download - Download / visualizacao
exports.downloadArquivo = (req, res) => {
  const arq = db.prepare('SELECT * FROM arquivos WHERE id = ?').get(req.params.id);
  if (!arq) return res.status(404).json({ erro: 'Arquivo nao encontrado' });

  if (req.usuario.tipo === 'aluno' && !arq.visivel_aluno) {
    return res.status(403).json({ erro: 'Arquivo nao disponivel' });
  }

  const caminho = path.join(UPLOAD_DIR, arq.nome_arquivo);
  if (!fs.existsSync(caminho)) {
    return res.status(404).json({ erro: 'Arquivo fisico nao encontrado' });
  }

  // Para imagens e PDFs, exibir no navegador; para outros, forcar download
  const inline = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'].includes(arq.tipo_mime);
  const disposition = inline ? 'inline' : 'attachment';

  res.setHeader('Content-Type', arq.tipo_mime);
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(arq.nome_original)}"`);
  res.setHeader('Content-Length', arq.tamanho);

  fs.createReadStream(caminho).pipe(res);
};

// DELETE /api/arquivos/:id - Professor exclui
exports.excluirArquivo = (req, res) => {
  const arq = db.prepare('SELECT * FROM arquivos WHERE id = ?').get(req.params.id);
  if (!arq) return res.status(404).json({ erro: 'Arquivo nao encontrado' });
  if (arq.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

  const caminho = path.join(UPLOAD_DIR, arq.nome_arquivo);
  if (fs.existsSync(caminho)) fs.unlinkSync(caminho);

  db.prepare('DELETE FROM arquivos WHERE id = ?').run(req.params.id);
  res.json({ mensagem: 'Arquivo excluido' });
};

// GET /api/arquivos/:id - Detalhes
exports.obterArquivo = (req, res) => {
  const arq = db.prepare('SELECT * FROM arquivos WHERE id = ?').get(req.params.id);
  if (!arq) return res.status(404).json({ erro: 'Arquivo nao encontrado' });
  if (req.usuario.tipo === 'aluno' && !arq.visivel_aluno) return res.status(403).json({ erro: 'Sem permissao' });
  res.json(arq);
};
