const { dbWrapper: db } = require('../config/database');
const g = require('../services/gamificationService');
const { verificarConquistas } = require('../services/achievementService');

exports.listarQuizzes = (req, res) => {
  try {
    const lista = db.prepare(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM quiz_perguntas WHERE quiz_id = q.id) AS total_perguntas
      FROM quizzes q 
      WHERE q.status = 'publicado'
      ORDER BY q.data_criacao DESC
    `).all();
    console.log('[QUIZ] Listando', lista.length, 'quizzes');
    res.json(lista);
  } catch(e) {
    console.error('[QUIZ] Erro ao listar:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.obterQuiz = (req, res) => {
  try {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao encontrado' });

    const perguntas = db.prepare(`
      SELECT p.* FROM perguntas p
      JOIN quiz_perguntas qp ON qp.pergunta_id = p.id
      WHERE qp.quiz_id = ?
    `).all(req.params.id);

    console.log('[QUIZ] Quiz', req.params.id, 'tem', perguntas.length, 'perguntas');
    res.json({ quiz, perguntas });
  } catch(e) {
    console.error('[QUIZ] Erro obterQuiz:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.iniciarTentativa = (req, res) => {
  try {
    const { quiz_id } = req.body;
    const aluno_id = req.usuario.id;

    console.log('[TENTATIVA] Aluno', aluno_id, 'iniciando quiz', quiz_id);

    // Verificar se o quiz existe
    const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(quiz_id);
    if (!quiz) return res.status(404).json({ erro: 'Quiz nao existe' });

    // Verificar se o aluno existe
    const aluno = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(aluno_id);
    if (!aluno) {
      return res.status(401).json({ 
        erro: 'Sessao expirada. Faca login novamente.',
        codigo: 'SESSAO_INVALIDA'
      });
    }

    const r = db.prepare('INSERT INTO tentativas (aluno_id, quiz_id) VALUES (?,?)')
      .run(aluno_id, quiz_id);

    console.log('[TENTATIVA] Criada com ID:', r.lastInsertRowid);
    res.status(201).json({ tentativa_id: r.lastInsertRowid });
  } catch(e) {
    console.error('[TENTATIVA] Erro:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.responder = (req, res) => {
  try {
    const { tentativa_id, pergunta_id, resposta } = req.body;

    console.log('[RESPOSTA] Tentativa:', tentativa_id, 'Pergunta:', pergunta_id, 'Resposta:', resposta);
    console.log('[RESPOSTA] Aluno logado:', req.usuario.id);

    const t = db.prepare('SELECT * FROM tentativas WHERE id = ?').get(tentativa_id);
    if (!t) {
      console.error('[RESPOSTA] Tentativa', tentativa_id, 'nao existe no banco');
      return res.status(404).json({ erro: 'Tentativa nao encontrada. Reinicie o quiz.' });
    }

    console.log('[RESPOSTA] Tentativa pertence ao aluno:', t.aluno_id, '| Logado:', req.usuario.id);

    if (t.aluno_id !== req.usuario.id) {
      return res.status(403).json({ 
        erro: 'Esta tentativa nao pertence a voce. Faca login novamente.',
        codigo: 'TENTATIVA_OUTRO_ALUNO'
      });
    }

    if (t.concluida) {
      return res.status(400).json({ erro: 'Esta tentativa ja foi finalizada.' });
    }

    const p = db.prepare('SELECT * FROM perguntas WHERE id = ?').get(pergunta_id);
    if (!p) return res.status(404).json({ erro: 'Pergunta nao encontrada' });

    const correta = resposta === p.resposta_correta ? 1 : 0;

    db.prepare('INSERT INTO respostas (tentativa_id, pergunta_id, resposta_escolhida, correta) VALUES (?,?,?,?)')
      .run(tentativa_id, pergunta_id, resposta, correta);

    let bonus = 0;
    if (correta) {
      const ult = db.prepare('SELECT correta FROM respostas WHERE tentativa_id = ? ORDER BY id DESC LIMIT 3').all(tentativa_id);
      const seq = ult.every(r => r.correta === 1) ? ult.length : 0;
      if (seq >= 3) bonus = g.BONUS_SEQUENCIA;
    }

    res.json({
      correta: correta === 1,
      resposta_correta: p.resposta_correta,
      explicacao: p.explicacao,
      tema: p.tema,
      pontos_ganhos: correta ? g.PONTOS_ACERTO + bonus : 0,
      bonus_sequencia: bonus
    });
  } catch(e) {
    console.error('[RESPOSTA] Erro:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.finalizar = (req, res) => {
  try {
    const { tentativa_id } = req.body;

    console.log('[FINALIZAR] Tentativa:', tentativa_id, 'Aluno:', req.usuario.id);

    const t = db.prepare('SELECT * FROM tentativas WHERE id = ?').get(tentativa_id);
    if (!t) return res.status(404).json({ erro: 'Tentativa nao encontrada' });
    if (t.aluno_id !== req.usuario.id) return res.status(403).json({ erro: 'Sem permissao' });

    const respostas = db.prepare('SELECT correta FROM respostas WHERE tentativa_id = ?').all(tentativa_id);
    const acertos = respostas.filter(r => r.correta === 1).length;
    const erros = respostas.length - acertos;

    let pontos = 0, seq = 0, melhorSeq = 0;
    for (const r of respostas) {
      if (r.correta === 1) {
        seq++; 
        pontos += g.PONTOS_ACERTO;
        if (seq >= 3) pontos += g.BONUS_SEQUENCIA;
        if (seq > melhorSeq) melhorSeq = seq;
      } else {
        seq = 0;
      }
    }
    if (respostas.length > 0) pontos += g.BONUS_QUIZ;

    db.prepare('UPDATE tentativas SET pontuacao=?, quantidade_acertos=?, quantidade_erros=?, melhor_sequencia=?, concluida=1 WHERE id=?')
      .run(pontos, acertos, erros, melhorSeq, tentativa_id);

    const pont = db.prepare('SELECT * FROM pontuacoes WHERE aluno_id = ?').get(req.usuario.id);
    const novoP = (pont.pontos || 0) + pontos;
    const novoXp = (pont.xp || 0) + pontos;
    const melhorGlobal = Math.max(pont.melhor_sequencia || 0, melhorSeq);

    db.prepare('UPDATE pontuacoes SET pontos=?, xp=?, melhor_sequencia=?, data_atualizacao=CURRENT_TIMESTAMP WHERE aluno_id=?')
      .run(novoP, novoXp, melhorGlobal, req.usuario.id);

    const novas = verificarConquistas(req.usuario.id);

    console.log('[FINALIZAR] Quiz finalizado:', { pontos, acertos, erros, melhorSeq });

    res.json({
      pontuacao: pontos,
      acertos, erros,
      melhor_sequencia: melhorSeq,
      bonus_quiz: g.BONUS_QUIZ,
      xp_total: novoXp,
      pontos_total: novoP,
      nivel: g.calcularNivel(novoXp),
      novas_conquistas: novas
    });
  } catch(e) {
    console.error('[FINALIZAR] Erro:', e);
    res.status(500).json({ erro: e.message });
  }
};

exports.historico = (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT t.*, q.titulo, q.tema 
      FROM tentativas t 
      JOIN quizzes q ON q.id = t.quiz_id 
      WHERE t.aluno_id = ? AND t.concluida = 1 
      ORDER BY t.data_realizacao DESC
    `).all(req.usuario.id));
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.dashboardAluno = (req, res) => {
  try {
    const id = req.usuario.id;
    const p = db.prepare('SELECT * FROM pontuacoes WHERE aluno_id = ?').get(id) || { pontos: 0, xp: 0, melhor_sequencia: 0 };
    const tent = db.prepare('SELECT COUNT(*) c FROM tentativas WHERE aluno_id = ? AND concluida = 1').get(id).c;
    const a = db.prepare('SELECT COALESCE(SUM(quantidade_acertos),0) s FROM tentativas WHERE aluno_id = ?').get(id).s;
    const e = db.prepare('SELECT COALESCE(SUM(quantidade_erros),0) s FROM tentativas WHERE aluno_id = ?').get(id).s;
    const conquistas = db.prepare(`
      SELECT c.* FROM conquistas c 
      JOIN aluno_conquistas ac ON ac.conquista_id = c.id 
      WHERE ac.aluno_id = ?
    `).all(id);
    const nivel = g.calcularNivel(p.xp);
    const ranking = db.prepare(`
      SELECT u.nome, p.pontos FROM usuarios u 
      JOIN pontuacoes p ON p.aluno_id = u.id 
      WHERE u.tipo_usuario = 'aluno' 
      ORDER BY p.pontos DESC
    `).all();
    const posicao = ranking.findIndex(r => r.nome === req.usuario.nome) + 1;
    const total = a + e;

    res.json({
      nome: req.usuario.nome,
      pontos: p.pontos,
      xp: p.xp,
      nivel,
      quizzes_realizados: tent,
      taxa_acerto: total > 0 ? Math.round((a / total) * 100) : 0,
      melhor_sequencia: p.melhor_sequencia,
      conquistas,
      posicao_ranking: posicao || null
    });
  } catch(e) { 
    console.error('[DASHBOARD] Erro:', e);
    res.status(500).json({ erro: e.message }); 
  }
};

exports.materiaisEstudo = (req, res) => {
  try {
    const tema = req.query.tema;
    if (tema) res.json(db.prepare('SELECT * FROM materiais_estudo WHERE tema = ?').all(tema));
    else res.json(db.prepare('SELECT * FROM materiais_estudo').all());
  } catch(e) { res.status(500).json({ erro: e.message }); }
};
