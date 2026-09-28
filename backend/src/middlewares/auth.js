const jwt = require('jsonwebtoken');

// Garante que o JWT_SECRET sempre existe
const JWT_SECRET = process.env.JWT_SECRET || 'historia_quiz_secret_2024_super_seguro';

function autenticar(req, res, next) {
  let h = req.headers.authorization;

  // Suporte a token via query string (para downloads com <a href>)
  if (!h && req.query.token) h = 'Bearer ' + req.query.token;

  if (!h) {
    console.warn('[AUTH] Token nao informado:', req.method, req.path);
    return res.status(401).json({ erro: 'Token nao informado', codigo: 'SEM_TOKEN' });
  }

  const token = h.startsWith('Bearer ') ? h.slice(7) : h;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    console.warn('[AUTH] Token invalido:', err.message, '| Path:', req.path);
    return res.status(401).json({ 
      erro: 'Sessao invalida. Faca login novamente.',
      codigo: 'TOKEN_INVALIDO'
    });
  }
}

function apenasProfessor(req, res, next) {
  if (req.usuario.tipo !== 'professor') {
    return res.status(403).json({ erro: 'Acesso restrito a professores' });
  }
  next();
}

function apenasAluno(req, res, next) {
  if (req.usuario.tipo !== 'aluno') {
    return res.status(403).json({ erro: 'Acesso restrito a alunos' });
  }
  next();
}

module.exports = { autenticar, apenasProfessor, apenasAluno };
