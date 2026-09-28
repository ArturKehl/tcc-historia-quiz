const { dbWrapper: db } = require('../config/database');

exports.rankingGeral = (req, res) => {
  res.json(db.prepare(`
    SELECT u.id, u.nome, t.nome AS turma,
      COALESCE(p.pontos,0) AS pontos, COALESCE(p.xp,0) AS xp,
      (SELECT COUNT(*) FROM tentativas WHERE aluno_id=u.id AND concluida=1) AS quizzes
    FROM usuarios u
    LEFT JOIN pontuacoes p ON p.aluno_id = u.id
    LEFT JOIN turmas t ON t.id = u.turma_id
    WHERE u.tipo_usuario='aluno'
    ORDER BY pontos DESC, quizzes DESC LIMIT 100
  `).all());
};

exports.rankingTurma = (req, res) => {
  res.json(db.prepare(`
    SELECT u.nome, t.nome AS turma, COALESCE(p.pontos,0) AS pontos,
      (SELECT COUNT(*) FROM tentativas WHERE aluno_id=u.id AND concluida=1) AS quizzes
    FROM usuarios u
    LEFT JOIN pontuacoes p ON p.aluno_id = u.id
    LEFT JOIN turmas t ON t.id = u.turma_id
    WHERE u.tipo_usuario='aluno' AND u.turma_id=?
    ORDER BY pontos DESC
  `).all(req.params.turma_id));
};

exports.rankingPeriodo = (req, res) => {
  const dias = parseInt(req.params.dias) || 7;
  res.json(db.prepare(`
    SELECT u.nome, COALESCE(SUM(t.pontuacao),0) AS pontos, COUNT(t.id) AS quizzes
    FROM usuarios u
    LEFT JOIN tentativas t ON t.aluno_id = u.id AND t.concluida=1
      AND t.data_realizacao >= datetime('now', '-' || ? || ' days')
    WHERE u.tipo_usuario='aluno'
    GROUP BY u.id ORDER BY pontos DESC LIMIT 50
  `).all(dias));
};
