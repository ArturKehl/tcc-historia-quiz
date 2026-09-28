// ============================================================
// ADMIN DE ALUNOS - Rodar no terminal
// Uso: node admin-alunos.js
// ============================================================
// Este script permite gerenciar alunos direto do terminal:
//   - Adicionar aluno (nome, email, senha, turma)
//   - Listar todos os alunos
//   - Remover aluno por email
//   - Redefinir senha de um aluno
//   - Criar turmas
// ============================================================

const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

// Carrega o banco
const { dbWrapper: db, initDatabase } = require('./src/config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntar(texto) {
  return new Promise(resolve => rl.question(texto, resolve));
}

function titulo(texto) {
  console.log('');
  console.log('='.repeat(55));
  console.log('  ' + texto);
  console.log('='.repeat(55));
}

function sucesso(texto) { console.log('✅ ' + texto); }
function erro(texto) { console.log('❌ ' + texto); }
function info(texto) { console.log('ℹ️  ' + texto); }

// ============================================================
// FUNÇÕES DE BANCO
// ============================================================

function listarTurmas() {
  return db.prepare('SELECT * FROM turmas ORDER BY nome').all();
}

function listarAlunos() {
  return db.prepare(`
    SELECT u.id, u.nome, u.email, t.nome AS turma, u.data_cadastro,
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
  let turma = db.prepare('SELECT id FROM turmas WHERE nome = ?').get(nomeTurma);
  if (turma) return turma.id;

  const r = db.prepare('INSERT INTO turmas (nome) VALUES (?)').run(nomeTurma);
  sucesso(`Turma "${nomeTurma}" criada automaticamente (ID: ${r.lastInsertRowid})`);
  return r.lastInsertRowid;
}

function adicionarAluno(nome, email, senha, turma) {
  // Verificar email duplicado
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) {
    erro(`Email "${email}" já está cadastrado!`);
    return false;
  }

  // Validar email
  if (!email.includes('@')) {
    erro('Email inválido');
    return false;
  }

  // Validar senha
  if (senha.length < 4) {
    erro('Senha muito curta (mínimo 4 caracteres)');
    return false;
  }

  // Obter ou criar turma
  const turmaId = obterOuCriarTurma(turma);

  // Criar aluno
  const hash = bcrypt.hashSync(senha, 10);
  const r = db.prepare(`
    INSERT INTO usuarios (nome, email, senha, tipo_usuario, turma_id)
    VALUES (?, ?, ?, 'aluno', ?)
  `).run(nome, email, hash, turmaId);

  // Criar pontuação inicial
  db.prepare('INSERT INTO pontuacoes (aluno_id) VALUES (?)').run(r.lastInsertRowid);

  sucesso(`Aluno "${nome}" adicionado! (ID: ${r.lastInsertRowid})`);
  console.log(`   📧 Email: ${email}`);
  console.log(`   🎓 Turma: ${turma}`);
  return true;
}

function removerAluno(email) {
  const aluno = db.prepare('SELECT id, nome FROM usuarios WHERE email = ? AND tipo_usuario = ?').get(email, 'aluno');
  if (!aluno) {
    erro(`Aluno com email "${email}" não encontrado`);
    return false;
  }

  // Remover dados relacionados
  db.prepare('DELETE FROM pontuacoes WHERE aluno_id = ?').run(aluno.id);
  db.prepare('DELETE FROM aluno_conquistas WHERE aluno_id = ?').run(aluno.id);
  db.prepare('DELETE FROM respostas WHERE tentativa_id IN (SELECT id FROM tentativas WHERE aluno_id = ?)').run(aluno.id);
  db.prepare('DELETE FROM tentativas WHERE aluno_id = ?').run(aluno.id);
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(aluno.id);

  sucesso(`Aluno "${aluno.nome}" (${email}) removido`);
  return true;
}

function redefinirSenha(email, novaSenha) {
  const aluno = db.prepare('SELECT id, nome FROM usuarios WHERE email = ?').get(email);
  if (!aluno) {
    erro(`Usuário com email "${email}" não encontrado`);
    return false;
  }

  if (novaSenha.length < 4) {
    erro('Senha muito curta');
    return false;
  }

  const hash = bcrypt.hashSync(novaSenha, 10);
  db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(hash, aluno.id);
  sucesso(`Senha de "${aluno.nome}" redefinida`);
  return true;
}

// ============================================================
// MENU INTERATIVO
// ============================================================

async function menuAdicionar() {
  titulo('➕ ADICIONAR NOVO ALUNO');

  const nome = (await perguntar('Nome completo: ')).trim();
  if (!nome) return erro('Nome obrigatório');

  const email = (await perguntar('Email: ')).trim().toLowerCase();
  if (!email) return erro('Email obrigatório');

  const senha = (await perguntar('Senha (padrão 123456): ')).trim() || '123456';

  // Listar turmas disponíveis
  const turmas = listarTurmas();
  console.log('');
  console.log('Turmas disponíveis:');
  turmas.forEach((t, i) => console.log(`   ${i + 1}. ${t.nome}`));
  console.log(`   ${turmas.length + 1}. [Criar nova turma]`);
  console.log('');

  const opcao = (await perguntar('Escolha uma turma (número): ')).trim();
  let turma;

  if (parseInt(opcao) === turmas.length + 1) {
    turma = (await perguntar('Nome da nova turma: ')).trim();
    if (!turma) return erro('Nome da turma obrigatório');
  } else {
    const idx = parseInt(opcao) - 1;
    if (idx < 0 || idx >= turmas.length) return erro('Opção inválida');
    turma = turmas[idx].nome;
  }

  adicionarAluno(nome, email, senha, turma);
}

async function menuAdicionarVarios() {
  titulo('➕ ADICIONAR VÁRIOS ALUNOS');
  info('Digite um aluno por linha no formato: Nome | email | senha | turma');
  info('Linha em branco para terminar. Senha padrão: 123456');
  console.log('');

  const turmas = listarTurmas();
  console.log('Turmas existentes: ' + turmas.map(t => t.nome).join(', '));
  console.log('');

  let adicionados = 0;
  while (true) {
    const linha = (await perguntar('> ')).trim();
    if (!linha) break;

    const partes = linha.split('|').map(p => p.trim());
    if (partes.length < 2) {
      erro('Formato inválido. Use: Nome | email | senha | turma');
      continue;
    }

    const nome = partes[0];
    const email = partes[1].toLowerCase();
    const senha = partes[2] || '123456';
    const turma = partes[3] || '1 Ano A';

    if (adicionarAluno(nome, email, senha, turma)) adicionados++;
  }

  console.log('');
  sucesso(`${adicionados} alunos adicionados!`);
}

function menuListar() {
  titulo('📋 LISTA DE ALUNOS');

  const alunos = listarAlunos();
  if (alunos.length === 0) {
    info('Nenhum aluno cadastrado');
    return;
  }

  console.log('');
  console.log('ID   Nome                          Turma        Pontos   XP');
  console.log('-'.repeat(75));
  alunos.forEach(a => {
    const id = String(a.id).padEnd(4);
    const nome = a.nome.padEnd(30).substring(0, 30);
    const turma = (a.turma || '-').padEnd(12);
    const pontos = String(a.pontos).padEnd(8);
    const xp = a.xp;
    console.log(`${id} ${nome} ${turma} ${pontos} ${xp}`);
  });
  console.log('');
  info(`Total: ${alunos.length} alunos`);
}

async function menuRemover() {
  titulo('🗑️  REMOVER ALUNO');
  const email = (await perguntar('Email do aluno a remover: ')).trim().toLowerCase();
  if (!email) return;

  const confirmar = (await perguntar(`Tem certeza que quer remover "${email}"? (S/N): `)).trim().toUpperCase();
  if (confirmar === 'S') {
    removerAluno(email);
  } else {
    info('Cancelado');
  }
}

async function menuRedefinirSenha() {
  titulo('🔑 REDEFINIR SENHA');
  const email = (await perguntar('Email do aluno: ')).trim().toLowerCase();
  const novaSenha = (await perguntar('Nova senha: ')).trim();
  if (email && novaSenha) redefinirSenha(email, novaSenha);
}

async function menuPrincipal() {
  while (true) {
    titulo('👨‍🏫 ADMIN DE ALUNOS - HistoriaQuiz');
    console.log('');
    console.log('   1. ➕ Adicionar um aluno');
    console.log('   2. 📝 Adicionar vários alunos (em lote)');
    console.log('   3. 📋 Listar todos os alunos');
    console.log('   4. 🗑️  Remover aluno');
    console.log('   5. 🔑 Redefinir senha de um aluno');
    console.log('   0. ❌ Sair');
    console.log('');

    const opcao = (await perguntar('Escolha uma opção: ')).trim();

    try {
      switch (opcao) {
        case '1': await menuAdicionar(); break;
        case '2': await menuAdicionarVarios(); break;
        case '3': menuListar(); break;
        case '4': await menuRemover(); break;
        case '5': await menuRedefinirSenha(); break;
        case '0':
          console.log('');
          console.log('👋 Até logo!');
          rl.close();
          process.exit(0);
        default:
          erro('Opção inválida');
      }
    } catch (e) {
      erro('Erro: ' + e.message);
    }

    console.log('');
    await perguntar('Pressione ENTER para continuar...');
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

(async () => {
  try {
    console.log('🔄 Inicializando banco de dados...');
    await initDatabase();
    console.log('✅ Banco de dados pronto');
    await menuPrincipal();
  } catch (e) {
    erro('Erro fatal: ' + e.message);
    process.exit(1);
  }
})();
