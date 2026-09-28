const { dbWrapper: db } = require('../config/database');

function verificarConquistas(alunoId) {
  const novas = [];
  const q = (sql, p) => db.prepare(sql).get(...p);
  const quizzes = q("SELECT COUNT(*) c FROM tentativas WHERE aluno_id=? AND concluida=1", [alunoId]).c;
  const acertos = q("SELECT COALESCE(SUM(quantidade_acertos),0) s FROM tentativas WHERE aluno_id=?", [alunoId]).s;
  const seqMax = q("SELECT COALESCE(MAX(melhor_sequencia),0) s FROM tentativas WHERE aluno_id=?", [alunoId]).s;
  const temas = q("SELECT COUNT(DISTINCT q.tema) c FROM tentativas t JOIN quizzes q ON q.id=t.quiz_id WHERE t.aluno_id=? AND t.concluida=1", [alunoId]).c;
  const perfeitos = q("SELECT COUNT(*) c FROM tentativas WHERE aluno_id=? AND quantidade_erros=0 AND concluida=1 AND quantidade_acertos>0", [alunoId]).c;
  const pont = q("SELECT COALESCE(xp,0) xp FROM pontuacoes WHERE aluno_id=?", [alunoId]);
  const xp = pont ? pont.xp : 0;

  const regras = [
    { r: 'primeiro_quiz', ok: quizzes >= 1 },
    { r: '50_acertos', ok: acertos >= 50 },
    { r: '100_acertos', ok: acertos >= 100 },
    { r: '10_sequencia', ok: seqMax >= 10 },
    { r: '5_temas', ok: temas >= 5 },
    { r: 'quiz_perfeito', ok: perfeitos >= 1 },
    { r: '5_quizzes', ok: quizzes >= 5 },
    { r: '10_quizzes', ok: quizzes >= 10 },
    { r: 'nivel_3', ok: xp >= 1500 },
    { r: 'nivel_5', ok: xp >= 6000 }
  ];
  for (const r of regras) {
    if (!r.ok) continue;
    const c = q("SELECT id, nome, icone, descricao FROM conquistas WHERE requisito=?", [r.r]);
    if (!c) continue;
    const ja = q("SELECT id FROM aluno_conquistas WHERE aluno_id=? AND conquista_id=?", [alunoId, c.id]);
    if (!ja) {
      db.prepare("INSERT INTO aluno_conquistas (aluno_id, conquista_id) VALUES (?,?)").run(alunoId, c.id);
      novas.push(c);
    }
  }
  return novas;
}
module.exports = { verificarConquistas };
