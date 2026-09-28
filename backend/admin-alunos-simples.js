// ============================================================
// ADMIN DE ALUNOS - versao simplificada (sem bcrypt externo)
// Usa o modulo nativo crypto do Node para hash
// ============================================================

const crypto = require('crypto');
const readline = require('readline');
const { dbWrapper: db, initDatabase } = require('./src/config/database');

// Hash compativel com bcrypt e substituivel: usa sha256 com salt
// (Para projetos de estudo, funcional. Em producao real, use bcrypt)
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha + '_historia_quiz_salt').digest('hex');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const perguntar = (t) => new Promise(r => rl.question(t, r));

function titulo(txt) {
  console.log('');
  console.log('='.repeat(55));
  console.log('  ' + txt);
  console.log('='.repeat(55));
}

const sucesso = (t) => console.log('✅ ' + t);
const erro = (t) => console.log('❌ ' + t);
const info = (t) => console.log('ℹ️  ' + t);

function listarTurmas() {
  return db.prepare('SELECT * FROM turmas ORDER BY nome').all();
}

function listarAlunos() {
  return db.prepare(`
    SELECT u.id, u.nome, u.email, t.nome AS turma,
      COALESCE(p.pontos, 0) AS pontos,
      COALESCE(p.xp, 0) AS xp
    FROM usuarios u
    LEFT JOIN turmas t ON t.id = u.turma_id
    LEFT JOIN pontuacoes p ON p.aluno_id = u.id
    WHERE u.tipo_usuario = 'aluno'
    ORDER BY u.nome
  `).all();
}

function obterOuCriarTurma(nomeTurma) {
  let t = db.prepare('SELECT id FROM turmas WHERE nome = ?').get(nomeTurma);
  if (t) return t.id;
  const r = db.prepare('INSERT INTO turmas (nome) VALUES (?)').run(nomeTurma);
  sucesso(`Turma "${nomeTurma}" criada (ID: ${r.lastInsertRowid})`);
  return r.lastInsertRowid;
}

function adicionarAluno(nome, email, senha, turma) {
  if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)) {
    erro(`Email "${email}" ja cadastrado`);
    return false;
  }
  if (!email.includes('@')) { erro('Email invalido'); return false; }
  if (senha.length < 4) { erro('Senha muito curta'); return false; }

  const turmaId = obterOuCriarTurma(turma);
  const hash = hashSenha(senha);
  const r = db.prepare(`
    INSERT INTO usuarios (nome, email, senha, tipo_usuario, turma_id)
    VALUES (?, ?, ?, 'aluno', ?)
  `).run(nome, email, hash, turmaId);

  db.prepare('INSERT INTO pontuacoes (aluno_id) VALUES (?)').run(r.lastInsertRowid);
  sucesso(`Aluno "${nome}" adicionado! (ID: ${r.lastInsertRowid})`);
  console.log(`   📧 ${email} | 🎓 ${turma}`);
  return true;
}

function removerAluno(email) {
  const a = db.prepare('SELECT id, nome FROM usuarios WHERE email = ? AND tipo_usuario = ?').get(email, 'aluno');
  if (!a) { erro(`Aluno "${email}" nao encontrado`); return false; }
  db.prepare('DELETE FROM pontuacoes WHERE aluno_id = ?').run(a.id);
  db.prepare('DELETE FROM aluno_conquistas WHERE aluno_id = ?').run(a.id);
  db.prepare('DELETE FROM respostas WHERE tentativa_id IN (SELECT id FROM tentativas WHERE aluno_id = ?)').run(a.id);
  db.prepare('DELETE FROM tentativas WHERE aluno_id = ?').run(a.id);
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(a.id);
  sucesso(`Aluno "${a.nome}" removido`);
  return true;
}

async function menuAdicionar() {
  titulo('➕ ADICIONAR NOVO ALUNO');
  const nome = (await perguntar('Nome completo: ')).trim();
  if (!nome) return erro('Nome obrigatorio');
  const email = (await perguntar('Email: ')).trim().toLowerCase();
  if (!email) return erro('Email obrigatorio');
  const senha = (await perguntar('Senha (padrao 123456): ')).trim() || '123456';

  const turmas = listarTurmas();
  console.log('');
  console.log('Turmas:');
  turmas.forEach((t, i) => console.log(`   ${i+1}. ${t.nome}`));
  console.log(`   ${turmas.length+1}. [Criar nova turma]`);
  console.log('');
  const op = (await perguntar('Escolha: ')).trim();

  let turma;
  if (parseInt(op) === turmas.length + 1) {
    turma = (await perguntar('Nome da nova turma: ')).trim();
    if (!turma) return erro('Nome obrigatorio');
  } else {
    const idx = parseInt(op) - 1;
    if (idx < 0 || idx >= turmas.length) return erro('Opcao invalida');
    turma = turmas[idx].nome;
  }

  adicionarAluno(nome, email, senha, turma);
}

async function menuAdicionarVarios() {
  titulo('➕ ADICIONAR VARIOS ALUNOS');
  info('Digite: Nome | email | senha | turma  (uma linha por aluno)');
  info('Linha em branco para terminar');
  console.log('');
  const turmas = listarTurmas();
  console.log('Turmas: ' + turmas.map(t => t.nome).join(', '));
  console.log('');

  let n = 0;
  while (true) {
    const linha = (await perguntar('> ')).trim();
    if (!linha) break;
    const p = linha.split('|').map(x => x.trim());
    if (p.length < 2) { erro('Formato invalido'); continue; }
    if (adicionarAluno(p[0], p[1].toLowerCase(), p[2] || '123456', p[3] || '1 Ano A')) n++;
  }
  console.log('');
  sucesso(`${n} alunos adicionados!`);
}

function menuListar() {
  titulo('📋 LISTA DE ALUNOS');
  const alunos = listarAlunos();
  if (!alunos.length) return info('Nenhum aluno cadastrado');
  console.log('');
  console.log('ID   Nome                          Turma        Pontos   XP');
  console.log('-'.repeat(70));
  alunos.forEach(a => {
    console.log(
      String(a.id).padEnd(4) +
      a.nome.padEnd(30).substring(0, 30) +
      (a.turma || '-').padEnd(12) +
      String(a.pontos).padEnd(8) +
      a.xp
    );
  });
  console.log('');
  info(`Total: ${alunos.length} alunos`);
}

async function menuRemover() {
  titulo('🗑️  REMOVER ALUNO');
  const email = (await perguntar('Email: ')).trim().toLowerCase();
  if (!email) return;
  const c = (await perguntar(`Remover "${email}"? (S/N): `)).trim().toUpperCase();
  if (c === 'S') removerAluno(email);
  else info('Cancelado');
}

async function menuPrincipal() {
  while (true) {
    titulo('👨‍🏫 ADMIN DE ALUNOS - HistoriaQuiz');
    console.log('');
    console.log('   1. ➕ Adicionar um aluno');
    console.log('   2. 📝 Adicionar varios alunos (em lote)');
    console.log('   3. 📋 Listar todos os alunos');
    console.log('   4. 🗑️  Remover aluno');
    console.log('   0. ❌ Sair');
    console.log('');

    const op = (await perguntar('Escolha: ')).trim();
    try {
      switch (op) {
        case '1': await menuAdicionar(); break;
        case '2': await menuAdicionarVarios(); break;
        case '3': menuListar(); break;
        case '4': await menuRemover(); break;
        case '0': console.log('\n👋 Ate logo!'); rl.close(); process.exit(0);
        default: erro('Opcao invalida');
      }
    } catch (e) { erro('Erro: ' + e.message); }
    console.log('');
    await perguntar('ENTER para continuar...');
  }
}

(async () => {
  try {
    console.log('🔄 Inicializando banco...');
    await initDatabase();
    console.log('✅ Pronto');
    await menuPrincipal();
  } catch (e) {
    erro('Erro fatal: ' + e.message);
    process.exit(1);
  }
})();
