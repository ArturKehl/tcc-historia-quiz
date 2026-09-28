const { dbWrapper: db } = require('../config/database');

// ============================================================
// DASHBOARD
// ============================================================
exports.dashboard = (req, res) => {
  try {
    const totalAlunos = db.prepare("SELECT COUNT(*) c FROM usuarios WHERE tipo_usuario='aluno'").get().c;
    const totalQuizzes = db.prepare('SELECT COUNT(*) c FROM quizzes').get().c;
    const totalPerguntas = db.prepare('SELECT COUNT(*) c FROM perguntas').get().c;
    const totalTentativas = db.prepare('SELECT COUNT(*) c FROM tentativas WHERE concluida=1').get().c;

    const soma = db.prepare('SELECT COALESCE(SUM(quantidade_acertos),0) a, COALESCE(SUM(quantidade_erros),0) e FROM tentativas WHERE concluida=1').get();
    const total = soma.a + soma.e;
    const mediaAcertos = total > 0 ? Math.round((soma.a / total) * 100) : 0;
    const mediaPontos = db.prepare('SELECT COALESCE(AVG(pontuacao),0) m FROM tentativas WHERE concluida=1').get().m;

    const perguntasMaisErradas = db.prepare(`
      SELECT p.id, p.enunciado, p.tema, COUNT(*) AS total,
        SUM(CASE WHEN r.correta=0 THEN 1 ELSE 0 END) AS erros
      FROM respostas r JOIN perguntas p ON p.id = r.pergunta_id
      GROUP BY p.id HAVING erros > 0 ORDER BY erros DESC LIMIT 10
    `).all();

    const temasDificuldade = db.prepare(`
      SELECT p.tema, COUNT(*) AS total,
        SUM(CASE WHEN r.correta=0 THEN 1 ELSE 0 END) AS erros,
        ROUND(SUM(CASE WHEN r.correta=1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS taxa_acerto
      FROM respostas r JOIN perguntas p ON p.id = r.pergunta_id
      GROUP BY p.tema ORDER BY taxa_acerto ASC
    `).all();

    res.json({ totalAlunos, totalQuizzes, totalPerguntas, totalTentativas, mediaAcertos, mediaPontos: Math.round(mediaPontos), perguntasMaisErradas, temasDificuldade });
  } catch(e) {
    console.error('[PROF] Erro dashboard:', e);
    res.status(500).json({ erro: e.message });
  }
};

// ============================================================
// ALUNOS
// ============================================================
exports.listarAlunos = (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT u.id, u.nome, u.email, t.nome AS turma,
        COALESCE(p.pontos,0) AS pontos, COALESCE(p.xp,0) AS xp,
        (SELECT COUNT(*) FROM tentativas WHERE aluno_id=u.id AND concluida=1) AS quizzes,
        (SELECT COALESCE(SUM(quantidade_acertos),0) FROM tentativas WHERE aluno_id=u.id) AS acertos,
        (SELECT COALESCE(SUM(quantidade_erros),0) FROM tentativas WHERE aluno_id=u.id) AS erros,
        (SELECT COUNT(*) FROM aluno_conquistas WHERE aluno_id=u.id) AS conquistas
      FROM usuarios u
      LEFT JOIN pontuacoes p ON p.aluno_id = u.id
      LEFT JOIN turmas t ON t.id = u.turma_id
      WHERE u.tipo_usuario='aluno' ORDER BY pontos DESC
    `).all());
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.desempenhoAluno = (req, res) => {
  try {
    const aluno = db.prepare('SELECT id,nome,email,turma_id FROM usuarios WHERE id=? AND tipo_usuario=?').get(req.params.id, 'aluno');
    if (!aluno) return res.status(404).json({ erro: 'Aluno nao encontrado' });
    const tentativas = db.prepare('SELECT t.*, q.titulo FROM tentativas t JOIN quizzes q ON q.id=t.quiz_id WHERE t.aluno_id=? AND t.concluida=1 ORDER BY t.data_realizacao DESC').all(req.params.id);
    const conquistas = db.prepare('SELECT c.* FROM conquistas c JOIN aluno_conquistas ac ON ac.conquista_id=c.id WHERE ac.aluno_id=?').all(req.params.id);
    res.json({ aluno, tentativas, conquistas });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.listarTurmas = (req, res) => {
  try { res.json(db.prepare('SELECT * FROM turmas').all()); }
  catch(e) { res.status(500).json({ erro: e.message }); }
};

// ============================================================
// PERGUNTAS - CRUD COMPLETO
// ============================================================
exports.listarPerguntas = (req, res) => {
  try {
    const { tema, dificuldade, busca } = req.query;
    let sql = 'SELECT * FROM perguntas WHERE 1=1';
    const params = [];

    if (tema) { sql += ' AND tema = ?'; params.push(tema); }
    if (dificuldade) { sql += ' AND dificuldade = ?'; params.push(dificuldade); }
    if (busca) { sql += ' AND enunciado LIKE ?'; params.push('%' + busca + '%'); }

    sql += ' ORDER BY data_criacao DESC';
    res.json(db.prepare(sql).all(...params));
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.obterPergunta = (req, res) => {
  try {
    const p = db.prepare('SELECT * FROM perguntas WHERE id=?').get(req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pergunta nao encontrada' });
    res.json(p);
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.criarPergunta = (req, res) => {
  try {
    const b = req.body;
    const obrigatorios = ['enunciado','alternativa_a','alternativa_b','alternativa_c','alternativa_d','resposta_correta','explicacao','tema','dificuldade'];
    for (const campo of obrigatorios) {
      if (!b[campo]) return res.status(400).json({ erro: 'Campo obrigatorio: ' + campo });
    }
    if (!['A','B','C','D'].includes(b.resposta_correta)) {
      return res.status(400).json({ erro: 'Resposta correta deve ser A, B, C ou D' });
    }

    const r = db.prepare(`
      INSERT INTO perguntas 
      (enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, explicacao, tema, dificuldade, professor_id) 
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      b.enunciado, b.alternativa_a, b.alternativa_b, b.alternativa_c, b.alternativa_d,
      b.resposta_correta, b.explicacao, b.tema, b.dificuldade, req.usuario.id
    );

    console.log('[PROF] Pergunta criada ID:', r.lastInsertRowid);
    res.status(201).json({ id: r.lastInsertRowid, mensagem: 'Pergunta criada!' });
  } catch(e) { 
    console.error('[PROF] Erro criarPergunta:', e);
    res.status(500).json({ erro: e.message }); 
  }
};

exports.editarPergunta = (req, res) => {
  try {
    const p = db.prepare('SELECT * FROM perguntas WHERE id=?').get(req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pergunta nao encontrada' });
    if (p.professor_id && p.professor_id !== req.usuario.id)
      return res.status(403).json({ erro: 'Sem permissao' });

    const b = req.body;
    db.prepare(`
      UPDATE perguntas SET enunciado=?, alternativa_a=?, alternativa_b=?, alternativa_c=?, 
        alternativa_d=?, resposta_correta=?, explicacao=?, tema=?, dificuldade=? 
      WHERE id=?
    `).run(
      b.enunciado, b.alternativa_a, b.alternativa_b, b.alternativa_c, b.alternativa_d,
      b.resposta_correta, b.explicacao, b.tema, b.dificuldade, req.params.id
    );

    res.json({ mensagem: 'Pergunta atualizada' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.excluirPergunta = (req, res) => {
  try {
    const p = db.prepare('SELECT * FROM perguntas WHERE id=?').get(req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pergunta nao encontrada' });
    if (p.professor_id && p.professor_id !== req.usuario.id)
      return res.status(403).json({ erro: 'Sem permissao' });

    // Verificar se esta em algum quiz
    const emQuiz = db.prepare('SELECT COUNT(*) c FROM quiz_perguntas WHERE pergunta_id=?').get(req.params.id).c;
    if (emQuiz > 0) {
      return res.status(400).json({ 
        erro: `Esta pergunta esta em ${emQuiz} quiz(es). Remova dos quizzes antes de excluir.` 
      });
    }

    db.prepare('DELETE FROM perguntas WHERE id=?').run(req.params.id);
    res.json({ mensagem: 'Pergunta excluida' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

// ============================================================
// QUIZZES - CRUD COMPLETO
// ============================================================
exports.listarQuizzes = (req, res) => {
  try {
    const quizzes = db.prepare(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM quiz_perguntas WHERE quiz_id=q.id) AS total_perguntas,
        u.nome AS professor_nome
      FROM quizzes q
      LEFT JOIN usuarios u ON u.id = q.professor_id
      ORDER BY q.data_criacao DESC
    `).all();
    res.json(quizzes);
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.obterQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });

    const perguntas = db.prepare(`
      SELECT p.*, qp.id AS quiz_pergunta_id
      FROM perguntas p
      JOIN quiz_perguntas qp ON qp.pergunta_id = p.id
      WHERE qp.quiz_id = ?
      ORDER BY qp.id
    `).all(req.params.id);

    res.json({ ...quiz, perguntas });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.criarQuiz = (req, res) => {
  try {
    const { titulo, descricao, tema, dificuldade, perguntas, turma_id } = req.body;
    if (!titulo || !tema || !dificuldade) {
      return res.status(400).json({ erro: 'Titulo, tema e dificuldade sao obrigatorios' });
    }

    const r = db.prepare(`
      INSERT INTO quizzes (titulo, descricao, tema, dificuldade, professor_id, status, turma_id) 
      VALUES (?,?,?,?,?,'publicado',?)
    `).run(titulo, descricao || '', tema, dificuldade, req.usuario.id, turma_id || null);

    const quizId = r.lastInsertRowid;

    // Adicionar perguntas
    if (Array.isArray(perguntas) && perguntas.length > 0) {
      const stmt = db.prepare('INSERT INTO quiz_perguntas (quiz_id, pergunta_id) VALUES (?,?)');
      perguntas.forEach(pid => stmt.run(quizId, pid));
    }

    console.log('[PROF] Quiz criado ID:', quizId, '| Perguntas:', perguntas?.length || 0);
    res.status(201).json({ 
      id: quizId, 
      mensagem: 'Quiz criado!',
      total_perguntas: perguntas?.length || 0
    });
  } catch(e) { 
    console.error('[PROF] Erro criarQuiz:', e);
    res.status(500).json({ erro: e.message }); 
  }
};

exports.editarQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });
    if (quiz.professor_id && quiz.professor_id !== req.usuario.id)
      return res.status(403).json({ erro: 'Sem permissao' });

    const { titulo, descricao, tema, dificuldade, status, turma_id, perguntas } = req.body;

    db.prepare(`
      UPDATE quizzes SET titulo=?, descricao=?, tema=?, dificuldade=?, status=?, turma_id=?
      WHERE id=?
    `).run(
      titulo || quiz.titulo, descricao !== undefined ? descricao : quiz.descricao,
      tema || quiz.tema, dificuldade || quiz.dificuldade,
      status || quiz.status, turma_id !== undefined ? turma_id : quiz.turma_id,
      req.params.id
    );

    // Atualizar perguntas se enviadas
    if (Array.isArray(perguntas)) {
      db.prepare('DELETE FROM quiz_perguntas WHERE quiz_id=?').run(req.params.id);
      const stmt = db.prepare('INSERT INTO quiz_perguntas (quiz_id, pergunta_id) VALUES (?,?)');
      perguntas.forEach(pid => stmt.run(req.params.id, pid));
    }

    res.json({ mensagem: 'Quiz atualizado' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.excluirQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });
    if (quiz.professor_id && quiz.professor_id !== req.usuario.id)
      return res.status(403).json({ erro: 'Sem permissao' });

    db.prepare('DELETE FROM quiz_perguntas WHERE quiz_id=?').run(req.params.id);
    db.prepare('DELETE FROM quizzes WHERE id=?').run(req.params.id);
    res.json({ mensagem: 'Quiz excluido' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.publicarQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });
    if (quiz.professor_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    const totalPerguntas = db.prepare('SELECT COUNT(*) c FROM quiz_perguntas WHERE quiz_id=?').get(req.params.id).c;
    if (totalPerguntas === 0) {
      return res.status(400).json({ erro: 'Adicione pelo menos 1 pergunta antes de publicar' });
    }

    const novoStatus = quiz.status === 'publicado' ? 'rascunho' : 'publicado';
    db.prepare('UPDATE quizzes SET status=? WHERE id=?').run(novoStatus, req.params.id);

    res.json({ 
      mensagem: novoStatus === 'publicado' ? 'Quiz publicado!' : 'Quiz despublicado',
      status: novoStatus
    });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.duplicarQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });

    const r = db.prepare(`
      INSERT INTO quizzes (titulo, descricao, tema, dificuldade, professor_id, status, turma_id)
      VALUES (?, ?, ?, ?, ?, 'rascunho', ?)
    `).run(
      quiz.titulo + ' (copia)',
      quiz.descricao,
      quiz.tema,
      quiz.dificuldade,
      req.usuario.id,
      quiz.turma_id
    );

    const novoId = r.lastInsertRowid;
    const perguntas = db.prepare('SELECT pergunta_id FROM quiz_perguntas WHERE quiz_id=?').all(req.params.id);
    const stmt = db.prepare('INSERT INTO quiz_perguntas (quiz_id, pergunta_id) VALUES (?,?)');
    perguntas.forEach(p => stmt.run(novoId, p.pergunta_id));

    res.status(201).json({ id: novoId, mensagem: 'Quiz duplicado' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

// ============================================================
// ESTATISTICAS
// ============================================================
exports.estatisticasQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });

    const tentativas = db.prepare(`
      SELECT COUNT(*) total, 
        COALESCE(AVG(pontuacao),0) media_pontos,
        COALESCE(AVG(quantidade_acertos),0) media_acertos,
        COALESCE(MAX(pontuacao),0) melhor_pontuacao
      FROM tentativas WHERE quiz_id=? AND concluida=1
    `).get(req.params.id);

    const alunosQueFizeram = db.prepare(`
      SELECT u.nome, t.pontuacao, t.quantidade_acertos, t.quantidade_erros, t.data_realizacao
      FROM tentativas t JOIN usuarios u ON u.id = t.aluno_id
      WHERE t.quiz_id=? AND t.concluida=1
      ORDER BY t.pontuacao DESC LIMIT 20
    `).all(req.params.id);

    res.json({ quiz, tentativas, alunosQueFizeram });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};
