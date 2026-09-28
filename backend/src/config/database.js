// ============================================================
// DATABASE - sql.js com todas as tabelas (incluindo skins)
// ============================================================

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../../data/historia.db');
let db = null;
let ready = false;
let saveTimer = null;

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function saveNow() {
  if (!db) return;
  try {
    ensureDir(DB_PATH);
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch(e) { console.error('[DB] Erro ao salvar:', e); }
}

function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveNow(); saveTimer = null; }, 200);
}

function saveImmediate() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  saveNow();
}

async function initDatabase() {
  if (ready) return;

  const SQL = await initSqlJs();
  ensureDir(DB_PATH);

  if (fs.existsSync(DB_PATH)) {
    try {
      const buf = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buf);
      console.log('[DB] Banco carregado do disco (' + buf.length + ' bytes)');
    } catch (err) {
      console.error('[DB] Banco corrompido, criando novo:', err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('[DB] Banco novo criado');
  }

  // ============================================================
  // CRIA TODAS AS TABELAS
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE,
      codigo_convite TEXT UNIQUE,
      professor_id INTEGER,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      senha TEXT,
      tipo_usuario TEXT,
      turma_id INTEGER,
      data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS perguntas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enunciado TEXT,
      alternativa_a TEXT,
      alternativa_b TEXT,
      alternativa_c TEXT,
      alternativa_d TEXT,
      resposta_correta TEXT,
      explicacao TEXT,
      tema TEXT,
      dificuldade TEXT,
      professor_id INTEGER,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT,
      descricao TEXT,
      tema TEXT,
      dificuldade TEXT,
      professor_id INTEGER,
      status TEXT DEFAULT 'rascunho',
      turma_id INTEGER,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quiz_perguntas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER,
      pergunta_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS tentativas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER,
      quiz_id INTEGER,
      pontuacao INTEGER DEFAULT 0,
      quantidade_acertos INTEGER DEFAULT 0,
      quantidade_erros INTEGER DEFAULT 0,
      melhor_sequencia INTEGER DEFAULT 0,
      concluida INTEGER DEFAULT 0,
      data_realizacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS respostas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tentativa_id INTEGER,
      pergunta_id INTEGER,
      resposta_escolhida TEXT,
      correta INTEGER,
      data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conquistas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE,
      descricao TEXT,
      requisito TEXT,
      icone TEXT DEFAULT 'X'
    );

    CREATE TABLE IF NOT EXISTS aluno_conquistas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER,
      conquista_id INTEGER,
      data_desbloqueio DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pontuacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER UNIQUE,
      pontos INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      melhor_sequencia INTEGER DEFAULT 0,
      data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materiais_estudo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tema TEXT,
      tipo TEXT,
      titulo TEXT,
      conteudo TEXT,
      url TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS arquivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT,
      descricao TEXT,
      nome_arquivo TEXT,
      nome_original TEXT,
      tipo_mime TEXT,
      tamanho INTEGER,
      tema TEXT,
      professor_id INTEGER,
      visivel_aluno INTEGER DEFAULT 1,
      data_upload DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    `);

  console.log('[DB] Todas as tabelas criadas/verificadas');

  // Verificar seed
  const r = db.exec("SELECT COUNT(*) c FROM usuarios");
  const count = r[0] ? r[0].values[0][0] : 0;
  if (count === 0) {
    console.log('[DB] Banco vazio, executando seed...');
    try {
      require('./seed').seed(db);
    } catch(seedErr) {
      console.error('[DB] Erro no seed:', seedErr.message);
      throw seedErr;
    }
  } else {
    console.log(`[DB] Banco tem ${count} usuarios`);
  }

  saveNow();
  ready = true;
  console.log('[DB] Inicializacao completa');
}

function _run(sql, params) {
  try {
    db.run(sql, params);
    saveDebounced();
    const r = db.exec("SELECT last_insert_rowid() as id");
    return { lastInsertRowid: r[0] ? r[0].values[0][0] : null };
  } catch(e) {
    console.error('[DB] Erro em run():', sql.substring(0, 100), '|', e.message);
    throw e;
  }
}

function _get(sql, params) {
  try {
    const s = db.prepare(sql);
    s.bind(params);
    if (s.step()) { const o = s.getAsObject(); s.free(); return o; }
    s.free();
    return undefined;
  } catch(e) {
    console.error('[DB] Erro em get():', sql.substring(0, 100), '|', e.message);
    throw e;
  }
}

function _all(sql, params) {
  try {
    const s = db.prepare(sql);
    s.bind(params);
    const rows = [];
    while (s.step()) rows.push(s.getAsObject());
    s.free();
    return rows;
  } catch(e) {
    console.error('[DB] Erro em all():', sql.substring(0, 100), '|', e.message);
    throw e;
  }
}

const dbWrapper = {
  prepare: (sql) => ({
    run: (...a) => _run(sql, a.length === 1 && Array.isArray(a[0]) ? a[0] : a),
    get: (...a) => _get(sql, a.length === 1 && Array.isArray(a[0]) ? a[0] : a),
    all: (...a) => _all(sql, a.length === 1 && Array.isArray(a[0]) ? a[0] : a)
  }),
  exec: (sql) => { db.run(sql); saveDebounced(); },
  _raw: () => db
};

process.on('exit', saveImmediate);
process.on('SIGINT', () => { saveImmediate(); process.exit(0); });
process.on('SIGTERM', () => { saveImmediate(); process.exit(0); });

module.exports = { dbWrapper, initDatabase };


