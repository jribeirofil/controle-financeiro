import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, collection, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, query, where, orderBy, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyD4XUN5Pem5H-QN6N-xjLPkcAc44cgLXbU",
  authDomain:        "controledin-46b48.firebaseapp.com",
  projectId:         "controledin-46b48",
  storageBucket:     "controledin-46b48.firebasestorage.app",
  messagingSenderId: "754312821887",
  appId:             "1:754312821887:web:2ab4453e97c37f7908934a",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

// ── Categorias padrão ─────────────────────────────────────────────────────────
const CATS_PADRAO = {
  despesa: {
    'Moradia':      ['Aluguel / Financ.', 'Condomínio', 'IPTU', 'Manutenção', 'Outros'],
    'Alimentação':  ['Mercado', 'Restaurante', 'Delivery', 'Padaria / Café', 'Outros'],
    'Transporte':   ['Combustível', 'Uber / Táxi', 'Transporte Público', 'Manutenção Veículo'],
    'Saúde':        ['Plano de Saúde', 'Médico / Dentista', 'Farmácia', 'Exames'],
    'Educação':     ['Escola / Faculdade', 'Cursos', 'Livros / Material'],
    'Casa':         ['Luz', 'Água / Gás', 'Internet', 'Celular', 'Outros'],
    'Lazer':        ['Streaming', 'Cinema / Passeios', 'Viagens', 'Esporte', 'Outros'],
    'Vestuário':    ['Roupas', 'Calçados', 'Acessórios'],
    'Outros':       ['Presente / Doação', 'Imprevistos', 'Outros'],
  },
  receita: {
    'Renda': ['Salário', 'Freelance / Extra', 'Bônus', 'Aluguel Recebido', 'Outros'],
  },
  poupanca: {
    'Poupança': ['Reserva de Emergência', 'Investimentos', 'Outros'],
  }
};

const ICONES = {
  'Moradia':'ti-home','Alimentação':'ti-salad','Transporte':'ti-car',
  'Saúde':'ti-heart','Educação':'ti-book','Casa':'ti-bolt',
  'Lazer':'ti-device-tv','Vestuário':'ti-shirt','Renda':'ti-trending-up',
  'Poupança':'ti-piggy-bank','Outros':'ti-dots',
};

const CORES_CAT = {
  'Moradia':'#4A90D9','Alimentação':'#E67E22','Transporte':'#8E44AD',
  'Saúde':'#E74C3C','Educação':'#2ECC71','Casa':'#F39C12',
  'Lazer':'#1ABC9C','Vestuário':'#E91E8C','Renda':'#1D9E75',
  'Poupança':'#7F77DD','Outros':'#888780',
};

function corCat(cat)      { return CORES_CAT[cat] || '#888780'; }
function corCatClaro(cat) { return corCat(cat) + '22'; }

// ── Estado global ─────────────────────────────────────────────────────────────
let usuarioAtual    = null;
let familiaId       = null;
let familiaData     = null;
let CATS            = JSON.parse(JSON.stringify(CATS_PADRAO));
let limites         = {};
let membros         = [];
let lancamentos     = [];
let tipoAtual       = 'despesa';
let paraQuemAtual   = 'Família';
let filtroAtual     = 'todos';
let filtroMes       = mesAtual();
let filtroMesResumo = mesAtual();
let editandoId      = null;
let paginaAtual     = 1;
let itensPorPagina  = 15;
let unsubLancamentos = null;

function mesAtual() { return new Date().toISOString().substring(0,7); }

// ── Auth ──────────────────────────────────────────────────────────────────────
async function loginGoogle() {
  const btn = document.getElementById('btn-google');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2 spin"></i> Redirecionando...';
  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  } catch(e) {
    mostrarToast('Erro ao entrar. Tente novamente.', 'erro');
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Entrar com Google';
  }
}

async function sair() {
  if (!confirm('Sair da conta?')) return;
  if (unsubLancamentos) unsubLancamentos();
  await signOut(auth);
  fecharConfig();
}

// Captura o resultado do redirect ao voltar do login Google
getRedirectResult(auth).catch(e => {
  if (e.code !== 'auth/no-current-user') {
    mostrarToast('Erro ao entrar. Tente novamente.', 'erro');
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioAtual = user;
    document.getElementById('tela-login').style.display = 'none';
    await verificarFamilia();
  } else {
    usuarioAtual = null;
    familiaId    = null;
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('tela-familia').style.display = 'none';
  }
});

// ── Família ───────────────────────────────────────────────────────────────────
async function verificarFamilia() {
  // Verifica se usuário já pertence a uma família
  const userRef  = doc(db, 'usuarios', usuarioAtual.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists() && userSnap.data().familiaId) {
    familiaId = userSnap.data().familiaId;
    await carregarFamilia();
    iniciarApp();
  } else {
    document.getElementById('tela-familia').style.display = 'flex';
  }
}

function mostrarCriarFamilia() {
  document.getElementById('criar-familia-form').style.display = 'block';
  document.getElementById('entrar-familia-form').style.display = 'none';
}

function mostrarEntrarFamilia() {
  document.getElementById('entrar-familia-form').style.display = 'block';
  document.getElementById('criar-familia-form').style.display = 'none';
}

async function criarFamilia() {
  const nome      = document.getElementById('nome-familia').value.trim();
  const nomeAdulto = document.getElementById('nome-adulto').value.trim();
  if (!nome || !nomeAdulto) { mostrarToast('Preencha todos os campos', 'erro'); return; }

  const codigo = Math.random().toString(36).substring(2,8).toUpperCase();
  const famRef = doc(collection(db, 'familias'));

  await setDoc(famRef, {
    nome,
    codigo,
    criadoEm: new Date().toISOString(),
    membros: [{ uid: usuarioAtual.uid, nome: nomeAdulto, email: usuarioAtual.email, tipo: 'adulto', admin: true }],
    cats: CATS_PADRAO,
    limites: {},
  });

  await setDoc(doc(db, 'usuarios', usuarioAtual.uid), {
    familiaId: famRef.id,
    nome: nomeAdulto,
    email: usuarioAtual.email,
  });

  familiaId = famRef.id;
  await carregarFamilia();
  document.getElementById('tela-familia').style.display = 'none';
  iniciarApp();
  mostrarToast('Família criada!', 'sucesso');
}

async function entrarFamilia() {
  const codigo    = document.getElementById('codigo-familia').value.trim().toUpperCase();
  const nomeMembro = document.getElementById('nome-membro').value.trim();
  if (!codigo || !nomeMembro) { mostrarToast('Preencha todos os campos', 'erro'); return; }

  const q    = query(collection(db, 'familias'), where('codigo', '==', codigo));
  const snap = await getDocs(q);

  if (snap.empty) { mostrarToast('Código inválido', 'erro'); return; }

  const famDoc  = snap.docs[0];
  const famData = famDoc.data();
  const novosMembros = [...famData.membros, {
    uid: usuarioAtual.uid, nome: nomeMembro,
    email: usuarioAtual.email, tipo: 'adulto', admin: false
  }];

  await updateDoc(famDoc.ref, { membros: novosMembros });
  await setDoc(doc(db, 'usuarios', usuarioAtual.uid), {
    familiaId: famDoc.id, nome: nomeMembro, email: usuarioAtual.email,
  });

  familiaId = famDoc.id;
  await carregarFamilia();
  document.getElementById('tela-familia').style.display = 'none';
  iniciarApp();
  mostrarToast('Bem-vindo à família!', 'sucesso');
}

async function carregarFamilia() {
  const snap  = await getDoc(doc(db, 'familias', familiaId));
  familiaData = snap.data();
  membros     = familiaData.membros || [];
  CATS        = familiaData.cats    || JSON.parse(JSON.stringify(CATS_PADRAO));
  limites     = familiaData.limites || {};
}

// ── Iniciar app ───────────────────────────────────────────────────────────────
function iniciarApp() {
  const meuNome = membros.find(m => m.uid === usuarioAtual.uid)?.nome || usuarioAtual.displayName || 'Eu';
  document.getElementById('perfil-badge').textContent = meuNome;
  document.getElementById('mes-ref').textContent = new Date().toLocaleDateString('pt-BR',{month:'short',year:'numeric'});
  document.getElementById('app').style.display = 'block';
  document.getElementById('data').value = new Date().toISOString().split('T')[0];

  popularParaQuem();
  popularCats();
  assinarLancamentos();

  setTimeout(() => document.getElementById('valor').focus(), 500);
}

function popularParaQuem() {
  const adultos  = membros.filter(m => m.tipo === 'adulto').map(m => m.nome);
  const criancas = membros.filter(m => m.tipo === 'crianca').map(m => m.nome);
  const todos    = ['Família', ...adultos, ...criancas];
  const cont     = document.getElementById('paraquem-btns');
  cont.innerHTML = todos.map(n => `
    <button class="paraquem-btn ${n==='Família'?'active':''}" data-nome="${n}" onclick="setParaQuem('${n}',this)">${n}</button>
  `).join('');
}

// ── Firestore realtime ────────────────────────────────────────────────────────
function assinarLancamentos() {
  if (unsubLancamentos) unsubLancamentos();
  const q = query(
    collection(db, 'familias', familiaId, 'lancamentos'),
    orderBy('registradoEm', 'desc')
  );
  unsubLancamentos = onSnapshot(q, (snap) => {
    lancamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHistorico();
    renderResumo();
  });
}

async function carregarDados() {
  mostrarSkeleton();
  await carregarFamilia();
  popularCats();
  popularParaQuem();
  renderResumo();
  renderHistorico();
  mostrarToast('Atualizado!', 'sucesso');
}

function mostrarSkeleton() {
  const lista = document.getElementById('lista');
  if (lista) lista.innerHTML = `
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>`;
}

// ── Configurações ─────────────────────────────────────────────────────────────
function abrirConfig() {
  // Info da família
  document.getElementById('config-nome-familia').textContent = familiaData?.nome || '';
  document.getElementById('config-membros').innerHTML = membros.map(m =>
    `<span class="config-membro-badge">${m.nome}</span>`
  ).join('');

  // Limites
  renderLimitesConfig();

  // Categorias
  renderListaCats();

  document.getElementById('tela-config').classList.add('active');
}

function fecharConfig() {
  document.getElementById('tela-config').classList.remove('active');
}

function copiarCodigo() {
  const codigo = familiaData?.codigo || '';
  navigator.clipboard.writeText(codigo).then(() => mostrarToast('Código copiado: ' + codigo, 'sucesso'));
}

function renderLimitesConfig() {
  const cats = Object.keys(CATS.despesa);
  document.getElementById('limites-lista').innerHTML = cats.map(cat => `
    <div class="limite-item">
      <label class="limite-label">
        <span class="cat-icon-small" style="background:${corCatClaro(cat)};color:${corCat(cat)}">
          <i class="ti ${ICONES[cat]||'ti-circle'}"></i>
        </span>
        ${cat}
      </label>
      <div class="limite-input-wrap">
        <span class="limite-prefix">R$</span>
        <input type="text" inputmode="decimal" class="limite-input"
          data-cat="${cat}"
          value="${limites[cat] ? String(limites[cat]).replace('.',',') : ''}"
          placeholder="Sem limite">
      </div>
    </div>`).join('');
}

async function salvarTodosLimites() {
  const novosLimites = {};
  document.querySelectorAll('.limite-input').forEach(inp => {
    const val = parseFloat(inp.value.replace(',','.'));
    if (val && val > 0) novosLimites[inp.dataset.cat] = val;
  });
  limites = novosLimites;
  await updateDoc(doc(db, 'familias', familiaId), { limites });
  renderResumo();
  mostrarToast('Limites salvos!', 'sucesso');
}

// ── Categorias ────────────────────────────────────────────────────────────────
let catTipoAtual = 'despesa';

function setCatTipo(tipo, btn) {
  catTipoAtual = tipo;
  document.querySelectorAll('.cat-tipo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderListaCats();
}

function renderListaCats() {
  const cats = CATS[catTipoAtual] || {};
  document.getElementById('cats-lista').innerHTML = Object.keys(cats).map(cat => `
    <div class="cat-grupo">
      <div class="cat-grupo-header">
        <span class="cat-icon-small" style="background:${corCatClaro(cat)};color:${corCat(cat)}">
          <i class="ti ${ICONES[cat]||'ti-circle'}"></i>
        </span>
        <span class="cat-nome">${cat}</span>
        <button class="btn-remover-cat" onclick="removerCategoria('${cat}')"><i class="ti ti-trash"></i></button>
      </div>
      <div class="subcats-lista">
        ${cats[cat].map((s,i) => `
          <div class="subcat-item">
            <span>${s}</span>
            <button class="btn-remover-subcat" onclick="removerSubcat('${cat}',${i})"><i class="ti ti-x"></i></button>
          </div>`).join('')}
        <button class="btn-add-subcat" onclick="adicionarSubcat('${cat}')">
          <i class="ti ti-plus"></i> Subcategoria
        </button>
      </div>
    </div>`).join('') +
    `<button class="btn-add-cat" onclick="adicionarCategoria()">
      <i class="ti ti-plus"></i> Nova categoria
    </button>`;
}

function adicionarCategoria() {
  const nome = prompt('Nome da nova categoria:');
  if (!nome?.trim()) return;
  if (CATS[catTipoAtual][nome.trim()]) { mostrarToast('Categoria já existe', 'erro'); return; }
  CATS[catTipoAtual][nome.trim()] = [];
  renderListaCats(); salvarCats();
}

function removerCategoria(cat) {
  if (!confirm(`Remover "${cat}"?`)) return;
  delete CATS[catTipoAtual][cat];
  renderListaCats(); salvarCats();
}

function adicionarSubcat(cat) {
  const nome = prompt(`Nova subcategoria em "${cat}":`);
  if (!nome?.trim()) return;
  CATS[catTipoAtual][cat].push(nome.trim());
  renderListaCats(); salvarCats();
}

function removerSubcat(cat, idx) {
  CATS[catTipoAtual][cat].splice(idx, 1);
  renderListaCats(); salvarCats();
}

async function salvarCats() {
  await updateDoc(doc(db, 'familias', familiaId), { cats: CATS });
  popularCats();
}

// ── Navegação ─────────────────────────────────────────────────────────────────
function irPara(id, btn) {
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active'); btn.setAttribute('aria-selected','true');
  document.getElementById('sec-' + id).classList.add('active');
  if (id === 'resumo')    renderResumo();
  if (id === 'historico') { paginaAtual = 1; renderHistorico(); }
  if (id === 'lancar')    setTimeout(() => { if (!editandoId) document.getElementById('valor').focus(); }, 150);
}

// ── Tipo / Para quem / Filtros ────────────────────────────────────────────────
function setTipo(tipo, btn) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
  popularCats();
  setTimeout(() => document.getElementById('valor').focus(), 100);
}

function setParaQuem(nome, btn) {
  paraQuemAtual = nome;
  document.querySelectorAll('.paraquem-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
}

function setFiltro(filtro, btn) {
  filtroAtual = filtro; paginaAtual = 1;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); renderHistorico();
}

function setFiltroMes(val) { filtroMes = val; paginaAtual = 1; renderHistorico(); }

function popularCats() {
  const sel = document.getElementById('categoria');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione...</option>';
  Object.keys(CATS[tipoAtual]).forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
}

function atualizarSubcat() {
  const cat = document.getElementById('categoria').value;
  const sel = document.getElementById('subcategoria');
  sel.innerHTML = '<option value="">Selecione...</option>';
  if (cat && CATS[tipoAtual][cat]) {
    CATS[tipoAtual][cat].forEach(s => sel.innerHTML += `<option value="${s}">${s}</option>`);
    setTimeout(() => sel.focus(), 100);
  }
}

function popularFiltroMes(selId, valorAtual) {
  const meses = {};
  lancamentos.forEach(l => { if (l.data) { const m = String(l.data).substring(0,7); if(m) meses[m]=true; } });
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos os meses</option>';
  Object.keys(meses).sort().reverse().forEach(m => {
    const [ano, mes] = m.split('-');
    const label = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    sel.innerHTML += `<option value="${m}">${label}</option>`;
  });
  sel.value = valorAtual || '';
}

// ── Lançar / Editar ───────────────────────────────────────────────────────────
async function lancar() {
  const valorRaw = document.getElementById('valor').value.replace(',','.');
  const valor    = parseFloat(valorRaw);
  const cat      = document.getElementById('categoria').value;
  const subcat   = document.getElementById('subcategoria').value;
  const desc     = document.getElementById('descricao').value.trim();
  const data     = document.getElementById('data').value;
  const meuNome  = membros.find(m => m.uid === usuarioAtual.uid)?.nome || 'Eu';
  const hoje     = new Date().toISOString().split('T')[0];

  if (!valor || valor <= 0) { mostrarToast('Informe o valor', 'erro'); return; }
  if (!cat) { mostrarToast('Selecione a categoria', 'erro'); return; }

  const btn = document.querySelector('.btn-lancar');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2 spin"></i> Salvando...';

  const lanc = {
    tipo: tipoAtual, valor, cat, subcat, desc: desc || '',
    paraQuem: paraQuemAtual, registradoPor: meuNome,
    registradoEm: hoje, data,
  };

  try {
    if (editandoId) {
      await updateDoc(doc(db, 'familias', familiaId, 'lancamentos', editandoId), lanc);
      fecharEdicao();
      mostrarToast('Atualizado!', 'sucesso');
    } else {
      await addDoc(collection(db, 'familias', familiaId, 'lancamentos'), lanc);
      document.activeElement?.blur();
      limparFormulario();
      mostrarToast('Lançamento salvo!', 'sucesso');
      verificarAlerteLimite(cat, data);
    }
  } catch(e) {
    mostrarToast('Erro ao salvar.', 'erro');
  } finally {
    btn.disabled = false;
    btn.innerHTML = editandoId
      ? '<i class="ti ti-check"></i> Salvar alterações'
      : '<i class="ti ti-check"></i> Confirmar lançamento';
  }
}

function verificarAlerteLimite(cat, data) {
  if (!limites[cat]) return;
  const mes   = data ? String(data).substring(0,7) : mesAtual();
  const gasto = lancamentos
    .filter(l => l.tipo==='despesa' && l.cat===cat && l.data && String(l.data).substring(0,7)===mes)
    .reduce((s,l) => s+Number(l.valor), 0);
  const pct = gasto / limites[cat];
  if (pct >= 1)        setTimeout(() => mostrarToast(`⚠️ Limite de ${cat} ultrapassado!`, 'erro'), 2600);
  else if (pct >= 0.8) setTimeout(() => mostrarToast(`⚠️ ${cat} em ${Math.round(pct*100)}% do limite`, 'erro'), 2600);
}

function limparFormulario() {
  document.getElementById('valor').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
  paraQuemAtual = 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === 'Família') b.classList.add('active');
  });
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => document.getElementById('valor').focus(), 300);
}

function abrirEdicao(id) {
  const l = lancamentos.find(l => l.id === id);
  if (!l) return;
  editandoId = id;
  document.getElementById('lancar-titulo').textContent = 'Editar lançamento';
  document.querySelector('.btn-lancar').innerHTML = '<i class="ti ti-check"></i> Salvar alterações';
  document.getElementById('btn-cancelar-edicao').style.display = 'flex';
  setTipoSilencioso(l.tipo);
  document.getElementById('valor').value = String(l.valor).replace('.',',');
  popularCats();
  document.getElementById('categoria').value = l.cat;
  atualizarSubcat();
  document.getElementById('subcategoria').value = l.subcat || '';
  const descManual = l.desc && l.desc !== (l.subcat||'') && l.desc !== (l.cat||'');
  document.getElementById('descricao').value = descManual ? l.desc : '';
  paraQuemAtual = l.paraQuem || 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === paraQuemAtual) b.classList.add('active');
  });
  document.getElementById('data').value = l.data || '';
  irPara('lancar', document.querySelectorAll('.tab')[0]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTipoSilencioso(tipo) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => {
    b.classList.remove('active'); b.setAttribute('aria-pressed','false');
    if (b.classList.contains(tipo)) { b.classList.add('active'); b.setAttribute('aria-pressed','true'); }
  });
}

function fecharEdicao() {
  editandoId = null;
  document.getElementById('lancar-titulo').textContent = 'Novo lançamento';
  document.querySelector('.btn-lancar').innerHTML = '<i class="ti ti-check"></i> Confirmar lançamento';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
  limparFormulario(); setTipoSilencioso('despesa');
}

function duplicar(id) {
  const l = lancamentos.find(l => l.id === id);
  if (!l) return;
  editandoId = null;
  document.getElementById('lancar-titulo').textContent = 'Duplicar lançamento';
  document.querySelector('.btn-lancar').innerHTML = '<i class="ti ti-copy"></i> Confirmar duplicação';
  document.getElementById('btn-cancelar-edicao').style.display = 'flex';
  setTipoSilencioso(l.tipo);
  document.getElementById('valor').value = String(l.valor).replace('.',',');
  popularCats();
  document.getElementById('categoria').value = l.cat;
  atualizarSubcat();
  document.getElementById('subcategoria').value = l.subcat || '';
  const descManual = l.desc && l.desc !== (l.subcat||'') && l.desc !== (l.cat||'');
  document.getElementById('descricao').value = descManual ? l.desc : '';
  paraQuemAtual = l.paraQuem || 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === paraQuemAtual) b.classList.add('active');
  });
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  irPara('lancar', document.querySelectorAll('.tab')[0]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Modal exclusão ────────────────────────────────────────────────────────────
let _deletarId = null, _deletarBtn = null;

function deletar(id, btn) {
  _deletarId = id; _deletarBtn = btn;
  document.getElementById('modal-exclusao').classList.add('active');
  document.getElementById('modal-btn-confirmar').onclick = confirmarExclusao;
}

function fecharModal() { document.getElementById('modal-exclusao').classList.remove('active'); }

async function confirmarExclusao() {
  const id = _deletarId, btn = _deletarBtn;
  fecharModal(); _deletarId = null; _deletarBtn = null;
  if (!id) return;
  if (btn) btn.disabled = true;
  try {
    await deleteDoc(doc(db, 'familias', familiaId, 'lancamentos', id));
    mostrarToast('Removido', 'sucesso');
  } catch(e) {
    mostrarToast('Erro ao remover', 'erro');
    if (btn) btn.disabled = false;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function mostrarToast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show ' + (tipo||'');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtBRL(v) { return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function parseFmtData(d) {
  try { const p=String(d).substring(0,10).split('-'); if(p.length===3) return new Date(p[0],p[1]-1,p[2]).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}); } catch(e){}
  return '';
}

// ── Resumo ────────────────────────────────────────────────────────────────────
function renderResumo() {
  popularFiltroMes('resumo-mes-sel', filtroMesResumo);
  const mes     = filtroMesResumo;
  const filtrar = arr => mes ? arr.filter(l => l.data && String(l.data).substring(0,7)===mes) : arr;

  const totalReceita  = filtrar(lancamentos.filter(l=>l.tipo==='receita')).reduce((s,l)=>s+Number(l.valor),0);
  const totalDespesa  = filtrar(lancamentos.filter(l=>l.tipo==='despesa')).reduce((s,l)=>s+Number(l.valor),0);
  const totalPoupanca = filtrar(lancamentos.filter(l=>l.tipo==='poupanca')).reduce((s,l)=>s+Number(l.valor),0);
  const saldo = totalReceita - totalDespesa - totalPoupanca;

  document.getElementById('cards-resumo').innerHTML = `
    <div class="stat-card"><div class="stat-label"><i class="ti ti-arrow-down-circle"></i>Renda total</div><div class="stat-val verde">${fmtBRL(totalReceita)}</div></div>
    <div class="stat-card"><div class="stat-label"><i class="ti ti-arrow-up-circle"></i>Despesas</div><div class="stat-val vermelho">${fmtBRL(totalDespesa)}</div></div>
    <div class="stat-card"><div class="stat-label"><i class="ti ti-piggy-bank"></i>Poupança</div><div class="stat-val roxo">${fmtBRL(totalPoupanca)}</div></div>
    <div class="stat-card"><div class="stat-label"><i class="ti ti-wallet"></i>Saldo livre</div><div class="stat-val ${saldo>=0?'verde':'vermelho'}">${fmtBRL(saldo)}</div></div>`;

  const porCat = {};
  filtrar(lancamentos.filter(l=>l.tipo==='despesa')).forEach(l=>{ porCat[l.cat]=(porCat[l.cat]||0)+Number(l.valor); });
  const sorted = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  const maxVal = sorted.length ? sorted[0][1] : 1;

  document.getElementById('barras-cat').innerHTML = !sorted.length
    ? '<div class="empty-state"><i class="ti ti-chart-bar"></i>Nenhuma despesa ainda</div>'
    : sorted.map(([cat,val]) => {
        const cor = corCat(cat);
        const lim = limites[cat];
        let pct, classe, labelLimite = '';
        if (lim) {
          pct = Math.min(Math.round((val/lim)*100),100);
          classe = pct>=100?'alerta':pct>=80?'aviso':'ok';
          labelLimite = `<span class="limite-pct ${classe}">${pct}%</span>`;
        } else { pct = Math.round((val/maxVal)*100); classe='ok'; }
        return `<div class="barra-wrap">
          <div class="barra-label">
            <span class="barra-cat-label">
              <span class="bolinha-cat" style="background:${cor}"></span>
              ${escHtml(cat)}
            </span>
            <span class="barra-valores">${fmtBRL(val)}${lim?` <span class="limite-ref">/ ${fmtBRL(lim)}</span>`:''}${labelLimite}</span>
          </div>
          <div class="barra-bg"><div class="barra-fill ${classe}" style="width:${pct}%;${classe==='ok'?'background:'+cor:''}"></div></div>
        </div>`;
      }).join('');

  const porMembro = {};
  filtrar(lancamentos.filter(l=>l.tipo==='despesa')).forEach(l=>{ const m=l.paraQuem||'Família'; porMembro[m]=(porMembro[m]||0)+Number(l.valor); });
  const sortedM = Object.entries(porMembro).sort((a,b)=>b[1]-a[1]);
  document.getElementById('breakdown-membros').innerHTML = !sortedM.length ? '' :
    `<p class="secao-title" style="margin-top:1.5rem">Gastos por membro</p>` +
    sortedM.map(([m,val],i) => {
      const total = sortedM.length;
      const classe = total===1?'ok':i===0?'alerta':i===total-1?'ok':'aviso';
      const pct    = Math.round((val/sortedM[0][1])*100);
      return `<div class="barra-wrap">
        <div class="barra-label"><span>${escHtml(m)}</span><span>${fmtBRL(val)}</span></div>
        <div class="barra-bg"><div class="barra-fill ${classe}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
}

// ── Histórico ─────────────────────────────────────────────────────────────────
function renderHistorico() {
  const lista = document.getElementById('lista');
  if (!lista) return;
  popularFiltroMes('filtro-mes', filtroMes);

  let filtrados = filtroAtual==='todos' ? [...lancamentos] : lancamentos.filter(l=>l.tipo===filtroAtual);
  if (filtroMes) filtrados = filtrados.filter(l => l.data && String(l.data).substring(0,7)===filtroMes);

  const total  = filtrados.length;
  const inicio = (paginaAtual-1)*itensPorPagina;
  const pagina = filtrados.slice(inicio, inicio+itensPorPagina);

  if (!pagina.length) {
    lista.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i>Nenhum lançamento encontrado</div>';
    renderPaginacao(0); return;
  }

  const hoje = new Date().toISOString().split('T')[0];
  lista.innerHTML = pagina.map(l => {
    const sinal    = l.tipo==='despesa'?'–':'+';
    const icone    = ICONES[l.cat]||'ti-circle';
    const cor      = corCat(l.cat);
    const dataFmt  = l.data ? parseFmtData(l.data) : '';
    const paraQuem = l.paraQuem||l.resp||'';
    const porQuem  = l.registradoPor ? ' · por '+l.registradoPor : '';
    const ehHoje   = l.registradoEm && String(l.registradoEm).substring(0,10)===hoje;
    const badge    = ehHoje ? '<span class="badge-recente">Recente</span>' : '';
    return `
      <div class="lanc-item">
        <div class="lanc-icon ${l.tipo}" style="background:${corCatClaro(l.cat)};color:${cor}">
          <i class="ti ${icone}"></i>
        </div>
        <div class="lanc-info">
          <div class="lanc-desc">${escHtml(l.desc||l.subcat||l.cat)}</div>
          <div class="lanc-sub">${escHtml(l.subcat||l.cat)}${paraQuem?' · '+escHtml(paraQuem):''}${porQuem}${dataFmt?' · '+dataFmt:''}</div>
        </div>
        <div class="lanc-val-wrap">
          ${badge}
          <div class="lanc-val ${l.tipo}">${sinal} ${fmtBRL(l.valor)}</div>
        </div>
        <button class="btn-edit" onclick="abrirEdicao('${escHtml(String(l.id))}')" aria-label="Editar"><i class="ti ti-pencil"></i></button>
        <button class="btn-copy" onclick="duplicar('${escHtml(String(l.id))}')" aria-label="Duplicar"><i class="ti ti-copy"></i></button>
        <button class="btn-del" onclick="deletar('${escHtml(String(l.id))}',this)" aria-label="Remover"><i class="ti ti-trash"></i></button>
      </div>`;
  }).join('');

  renderPaginacao(total);
}

function renderPaginacao(total) {
  const el = document.getElementById('paginacao');
  if (!el) return;
  if (total <= itensPorPagina) { el.innerHTML = ''; return; }
  const totalPags = Math.ceil(total/itensPorPagina);
  el.innerHTML = `
    <div class="pag-info">${total} lançamentos</div>
    <div class="pag-controles">
      <button class="pag-btn" onclick="irPagina(${paginaAtual-1})" ${paginaAtual<=1?'disabled':''}><i class="ti ti-chevron-left"></i></button>
      <span class="pag-label">${paginaAtual} / ${totalPags}</span>
      <button class="pag-btn" onclick="irPagina(${paginaAtual+1})" ${paginaAtual>=totalPags?'disabled':''}><i class="ti ti-chevron-right"></i></button>
    </div>
    <select class="pag-select" onchange="setItensPorPagina(this.value)">
      <option value="15" ${itensPorPagina===15?'selected':''}>15 por página</option>
      <option value="30" ${itensPorPagina===30?'selected':''}>30 por página</option>
      <option value="60" ${itensPorPagina===60?'selected':''}>60 por página</option>
    </select>`;
}

function irPagina(p) {
  let filtrados = filtroAtual==='todos' ? [...lancamentos] : lancamentos.filter(l=>l.tipo===filtroAtual);
  if (filtroMes) filtrados = filtrados.filter(l => l.data && String(l.data).substring(0,7)===filtroMes);
  const totalPags = Math.ceil(filtrados.length/itensPorPagina);
  if (p<1||p>totalPags) return;
  paginaAtual = p; renderHistorico();
  document.getElementById('sec-historico').scrollTo({top:0,behavior:'smooth'});
}

function setItensPorPagina(val) { itensPorPagina=parseInt(val); paginaAtual=1; renderHistorico(); }

// ── Expor funções para o HTML (necessário com type="module") ──────────────────
Object.assign(window, {
  loginGoogle, sair,
  mostrarCriarFamilia, mostrarEntrarFamilia, criarFamilia, entrarFamilia,
  abrirConfig, fecharConfig, copiarCodigo, salvarTodosLimites,
  setCatTipo, adicionarCategoria, removerCategoria, adicionarSubcat, removerSubcat,
  irPara, setTipo, setParaQuem, setFiltro, setFiltroMes, atualizarSubcat,
  lancar, fecharEdicao, abrirEdicao, duplicar,
  deletar, fecharModal, confirmarExclusao,
  renderResumo, carregarDados,
  irPagina, setItensPorPagina,
});
