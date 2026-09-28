const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbWrapper: db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'historia_quiz_secret_2024_super_seguro';

exports.cadastrar = (req, res) => {
  try {
    const { nome, email, senha, turma } = req.body;
    if (!nome || !email || !senha || !turma)
      return res.status(400).json({ erro: 'Preencha todos os campos' });

    if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email))
      return res.status(400).json({ erro: 'E-mail ja cadastrado' });

    let t = db.prepare('SELECT id FROM turmas WHERE nome = ?').get(turma);
    const turmaId = t ? t.id : db.prepare('INSERT INTO turmas (nome) VALUES (?)').run(turma).lastInsertRowid;

    const hash = bcrypt.hashSync(senha, 10);
    const r = db.prepare('INSERT INTO usuarios (nome,email,senha,tipo_usuario,turma_id) VALUES (?,?,?,?,?)')
      .run(nome, email, hash, 'aluno', turmaId);

    db.prepare('INSERT INTO pontuacoes (aluno_id) VALUES (?)').run(r.lastInsertRowid);

    console.log('[AUTH] Novo aluno cadastrado:', email, 'ID:', r.lastInsertRowid);
    res.status(201).json({ mensagem: 'Cadastro realizado!', id: r.lastInsertRowid });
  } catch(e) {
    console.error('[AUTH] Erro no cadastro:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.login = (req, res) => {
  try {
    const { email, senha } = req.body;
    console.log('[AUTH] Tentativa de login:', email);

    const u = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    if (!u) {
      console.warn('[AUTH] Usuario nao encontrado:', email);
      return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    if (!bcrypt.compareSync(senha, u.senha)) {
      console.warn('[AUTH] Senha incorreta para:', email);
      return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    const token = jwt.sign(
      { id: u.id, nome: u.nome, tipo: u.tipo_usuario },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[AUTH] Login OK:', email, '| Tipo:', u.tipo_usuario, '| ID:', u.id);

    res.json({
      token,
      usuario: { id: u.id, nome: u.nome, tipo: u.tipo_usuario }
    });
  } catch(e) {
    console.error('[AUTH] Erro no login:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.perfil = (req, res) => {
  try {
    const u = db.prepare('SELECT id, nome, email, tipo_usuario, turma_id FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (!u) return res.status(404).json({ erro: 'Usuario nao encontrado' });
    res.json(u);
  } catch(e) { res.status(500).json({ erro: e.message }); }
};
