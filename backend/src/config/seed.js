const bcrypt = require('bcryptjs');
const perguntasData = require('../data/perguntas');
const materiaisData = require('../data/materiais');

function gerarCodigoConvite() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '23456789';
  let codigo = 'HIST-';
  for (let i = 0; i < 2; i++) codigo += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 2; i++) codigo += numeros[Math.floor(Math.random() * numeros.length)];
  return codigo;
}

function seed(db) {
  console.log('[SEED] Populando banco com conteudo completo...');
  const hash = bcrypt.hashSync('123456', 10);

  // Turmas
  db.run("INSERT INTO turmas (nome, codigo_convite) VALUES (?,?), (?,?), (?,?)",
    ['1 Ano A', gerarCodigoConvite(), '2 Ano B', gerarCodigoConvite(), '3 Ano C', gerarCodigoConvite()]);

  // Professor
  db.run("INSERT INTO usuarios (nome,email,senha,tipo_usuario,turma_id) VALUES (?,?,?,?,?)",
    ['Prof. Carlos Andrade', 'professor@escola.com', hash, 'professor', null]);

  // Alunos
  const nomes = ['Ana Souza','Bruno Lima','Carla Dias','Diego Rocha','Eduarda Reis','Felipe Nunes','Gabriela Prado','Henrique Melo','Isabela Castro','Joao Pedro'];
  nomes.forEach((n, i) => {
    db.run("INSERT INTO usuarios (nome,email,senha,tipo_usuario,turma_id) VALUES (?,?,?,?,?)",
      [n, n.split(' ')[0].toLowerCase() + '@aluno.com', hash, 'aluno', (i % 3) + 1]);
  });

  db.run("INSERT INTO pontuacoes (aluno_id) SELECT id FROM usuarios WHERE tipo_usuario='aluno'");

  // Perguntas
  const profId = db.exec("SELECT id FROM usuarios WHERE email='professor@escola.com'")[0].values[0][0];
  console.log(`[SEED] Inserindo ${perguntasData.length} perguntas...`);
  perguntasData.forEach(p => {
    db.run("INSERT INTO perguntas (enunciado,alternativa_a,alternativa_b,alternativa_c,alternativa_d,resposta_correta,explicacao,tema,dificuldade,professor_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], profId]);
  });

  // Quizzes
  const temas = [...new Set(perguntasData.map(p => p[7]))];
  console.log(`[SEED] Criando ${temas.length} quizzes...`);
  temas.forEach(tema => {
    db.run("INSERT INTO quizzes (titulo,descricao,tema,dificuldade,professor_id,status) VALUES (?,?,?,?,?,'publicado')",
      [`Quiz de ${tema}`, `Teste seus conhecimentos sobre ${tema}`, tema, 'medio', profId]);
    const qid = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    const rows = db.exec(`SELECT id FROM perguntas WHERE tema='${tema}' LIMIT 5`);
    if (rows[0]) rows[0].values.forEach(r => {
      db.run("INSERT INTO quiz_perguntas (quiz_id,pergunta_id) VALUES (?,?)", [qid, r[0]]);
    });
  });

  // Conquistas
  const conquistas = [
    ['Primeiro Passo','Realize seu primeiro quiz','primeiro_quiz','🎯'],
    ['Historiador','Acerte 50 perguntas','50_acertos','📚'],
    ['Mestre da Historia','Acerte 100 perguntas','100_acertos','🏛️'],
    ['Imbatível','Acerte 10 perguntas consecutivas','10_sequencia','🔥'],
    ['Conhecimento Historico','Complete quizzes de 5 temas','5_temas','🌍'],
    ['Perfeito','Complete um quiz sem errar','quiz_perfeito','⭐'],
    ['Dedicado','Realize 5 quizzes','5_quizzes','💪'],
    ['Maratonista','Realize 10 quizzes','10_quizzes','🏃'],
    ['Nivel 3','Alcance o nivel Estudante','nivel_3','🥉'],
    ['Nivel 5','Alcance Mestre da Historia','nivel_5','👑']
  ];
  conquistas.forEach(c => db.run("INSERT INTO conquistas (nome,descricao,requisito,icone) VALUES (?,?,?,?)", c));

  // Materiais de estudo
  console.log(`[SEED] Inserindo ${materiaisData.length} materiais de estudo...`);
  materiaisData.forEach(m => {
    db.run("INSERT INTO materiais_estudo (tema,tipo,titulo,conteudo,url) VALUES (?,?,?,?,?)",
      [m.tema, m.tipo, m.titulo, m.conteudo, m.url || null]);
  });

  console.log('[SEED] ✅ Banco populado!');
  console.log('[SEED] Professor: professor@escola.com / 123456');
  console.log('[SEED] Aluno: ana@aluno.com / 123456');
}

module.exports = { seed };

