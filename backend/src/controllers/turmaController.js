const { dbWrapper: db } = require('../config/database');

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '23456789';
  let codigo;
  do {
    codigo = 'HIST-';
    for (let i = 0; i < 2; i++) codigo += letras[Math.floor(Math.random() * letras.length)];
    for (let i = 0; i < 2; i++) codigo += numeros[Math.floor(Math.random() * numeros.length)];
  } while (db.prepare('SELECT id FROM turmas WHERE codigo_convite = ?').get(codigo));
  return codigo;
}

exports.criarTurma = (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome da turma e obrigatorio' });
    if (db.prepare('SELECT id FROM turmas WHERE nome = ?').get(nome))
      return res.status(400).json({ erro: 'Turma com este nome ja existe' });

    const codigo = gerarCodigo();
    const r = db.prepare('INSERT INTO turmas (nome, codigo_convite, professor_id) VALUES (?,?,?)')
      .run(nome, codigo, req.usuario.id);

    res.status(201).json({ id: r.lastInsertRowid, nome, codigo_convite: codigo, mensagem: 'Turma criada!' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.minhasTurmas = (req, res) => {
  try {
    const turmas = db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM usuarios WHERE turma_id = t.id AND tipo_usuario = 'aluno') AS total_alunos
      FROM turmas t WHERE t.professor_id = ? ORDER BY t.criado_em DESC
    `).all(req.usuario.id);
    res.json(turmas);
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.detalhesTurma = (req, res) => {
  try {
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id && turma.professor_id !== req.usuario.id)
      return res.status(403).json({ erro: 'Sem permissao' });

    const alunos = db.prepare(`
      SELECT u.id, u.nome, u.email,
        COALESCE(p.pontos, 0) AS pontos,
        (SELECT COUNT(*) FROM tentativas WHERE aluno_id = u.id AND concluida = 1) AS quizzes,
        (SELECT COALESCE(SUM(quantidade_acertos), 0) FROM tentativas WHERE aluno_id = u.id) AS acertos
      FROM usuarios u
      LEFT JOIN pontuacoes p ON p.aluno_id = u.id
      WHERE u.turma_id = ? AND u.tipo_usuario = 'aluno'
      ORDER BY pontos DESC
    `).all(req.params.id);

    res.json({ turma, alunos });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.regenerarCodigo = (req, res) => {
  try {
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    const novo = gerarCodigo();
    db.prepare('UPDATE turmas SET codigo_convite = ? WHERE id = ?').run(novo, req.params.id);
    res.json({ codigo_convite: novo, mensagem: 'Codigo regenerado' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.excluirTurma = (req, res) => {
  try {
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    db.prepare('UPDATE usuarios SET turma_id = NULL WHERE turma_id = ?').run(req.params.id);
    db.prepare('DELETE FROM turmas WHERE id = ?').run(req.params.id);
    res.json({ mensagem: 'Turma excluida' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.entrarNaTurma = (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ erro: 'Digite o codigo' });

    const turma = db.prepare('SELECT * FROM turmas WHERE UPPER(codigo_convite) = ?').get(codigo.trim().toUpperCase());
    if (!turma) return res.status(404).json({ erro: 'Codigo invalido' });

    const aluno = db.prepare('SELECT turma_id FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (aluno.turma_id === turma.id) return res.status(400).json({ erro: 'Voce ja esta nesta turma' });

    db.prepare('UPDATE usuarios SET turma_id = ? WHERE id = ?').run(turma.id, req.usuario.id);
    res.json({ mensagem: `Voce entrou na turma "${turma.nome}"!`, turma: { id: turma.id, nome: turma.nome } });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.minhaTurma = (req, res) => {
  try {
    const u = db.prepare('SELECT turma_id FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (!u.turma_id) return res.json({ turma: null });

    const turma = db.prepare('SELECT id, nome, codigo_convite FROM turmas WHERE id = ?').get(u.turma_id);
    const colegas = db.prepare(`
      SELECT u.id, u.nome, COALESCE(p.pontos, 0) AS pontos
      FROM usuarios u LEFT JOIN pontuacoes p ON p.aluno_id = u.id
      WHERE u.turma_id = ? AND u.tipo_usuario = 'aluno'
      ORDER BY pontos DESC LIMIT 20
    `).all(u.turma_id);

    res.json({ turma, colegas });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.removerAlunoDaTurma = (req, res) => {
  try {
    const { turma_id, aluno_id } = req.params;
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(turma_id);
    if (!turma) return res.status(404).json({ erro: 'Turma nao encontrada' });
    if (turma.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    db.prepare('UPDATE usuarios SET turma_id = NULL WHERE id = ? AND turma_id = ?').run(aluno_id, turma_id);
    res.json({ mensagem: 'Aluno removido' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.listarTodasTurmas = (req, res) => {
  try { res.json(db.prepare('SELECT id, nome FROM turmas ORDER BY nome').all()); }
  catch(e) { res.status(500).json({ erro: e.message }); }
};
