const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytuEnOItCWqncrChzMe_kINOPQtLfjIPxaO-yCvo3bb9tAph-j2KqdxCDRASEvs4bG/exec';

// ── Membros da família ────────────────────────────────────────────────────────
const ADULTOS       = ['Jayme', 'Rita'];
const CRIANCAS      = ['Davi', 'Lucas'];
const TODOS_MEMBROS = ['Família', ...ADULTOS, ...CRIANCAS];

// ── Categorias ────────────────────────────────────────────────────────────────
const CATS = {
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

// ── Estado ────────────────────────────────────────────────────────────────────
let tipoAtual     = 'despesa';
let paraQuemAtual = 'Família';
let filtroAtual   = 'todos';
let filtroMes     = '';  // 'YYYY-MM' ou '' para todos
let lancamentos   = [];
let editandoId    = null;  // ID do lançamento em edição

function scriptConfigurado() {
  return SCRIPT_URL && SCRIPT_URL !== 'COLE_A_URL_DO_APPS_SCRIPT_AQUI';
}

// ── Perfil do dispositivo ─────────────────────────────────────────────────────
function getPerfil() {
  return localStorage.getItem('perfil_usuario');
}
function setPerfil(nome) {
  localStorage.setItem('perfil_usuario', nome);
}
function escolherPerfil(nome) {
  setPerfil(nome);
  document.getElementById('tela-perfil').classList.remove('active');
  document.getElementById('perfil-badge').textContent = nome;
  mostrarToast('Olá, ' + nome + '!', 'sucesso');
}
function trocarPerfil() {
  if (!confirm('Trocar de usuário?')) return;
  localStorage.removeItem('perfil_usuario');
  document.getElementById('tela-perfil').classList.add('active');
}

// ── API Google Sheets ─────────────────────────────────────────────────────────
async function apiListar() {
  const res = await fetch(`${SCRIPT_URL}?action=listar`);
  const json = await res.json();
  return json.lancamentos || [];
}
async function apiAdicionar(lanc) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ ...lanc, action: 'adicionar' }),
  });
  return res.json();
}
async function apiAtualizar(lanc) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ ...lanc, action: 'atualizar' }),
  });
  return res.json();
}
async function apiDeletar(id) {
  const res = await fetch(`${SCRIPT_URL}?action=deletar&id=${id}`);
  return res.json();
}

// ── Carregar lançamentos ──────────────────────────────────────────────────────
async function carregarDados(silencioso) {
  if (!scriptConfigurado()) {
    renderHistorico();
    renderResumo();
    return;
  }
  mostrarSkeleton();
  try {
    lancamentos = await apiListar();
  } catch (e) {
    mostrarToast('Erro ao carregar. Verifique a conexão.', 'erro');
  }
  renderHistorico();
  renderResumo();
  const abaAtiva = document.querySelector('.section.active');
  if (abaAtiva && abaAtiva.id === 'sec-resumo')    renderResumo();
  if (abaAtiva && abaAtiva.id === 'sec-historico') renderHistorico();
}

function mostrarSkeleton() {
  const lista = document.getElementById('lista');
  if (lista) {
    lista.innerHTML = `
      <div class="skeleton-item"></div>
      <div class="skeleton-item"></div>
      <div class="skeleton-item"></div>`;
  }
}

// ── Navegação ─────────────────────────────────────────────────────────────────
function irPara(id, btn) {
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  btn.setAttribute('aria-selected','true');
  document.getElementById('sec-' + id).classList.add('active');
  if (id === 'resumo')    renderResumo();
  if (id === 'historico') renderHistorico();
}

// ── Tipo ──────────────────────────────────────────────────────────────────────
function setTipo(tipo, btn) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed','true');
  popularCats();
}

// ── Para quem ─────────────────────────────────────────────────────────────────
function setParaQuem(nome, btn) {
  paraQuemAtual = nome;
  document.querySelectorAll('.paraquem-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed','true');
}

// ── Filtro tipo ───────────────────────────────────────────────────────────────
function setFiltro(filtro, btn) {
  filtroAtual = filtro;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistorico();
}

// ── Filtro mês ────────────────────────────────────────────────────────────────
function setFiltroMes(val) {
  filtroMes = val;
  renderHistorico();
}

function popularFiltroMes() {
  const meses = {};
  lancamentos.forEach(l => {
    if (l.data) {
      const m = String(l.data).substring(0, 7);
      if (m) meses[m] = true;
    }
  });
  const sel = document.getElementById('filtro-mes');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todos os meses</option>';
  Object.keys(meses).sort().reverse().forEach(m => {
    const [ano, mes] = m.split('-');
    const label = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    sel.innerHTML += `<option value="${m}">${label}</option>`;
  });
  if (atual) sel.value = atual;
}

// ── Categorias ────────────────────────────────────────────────────────────────
function popularCats() {
  const sel = document.getElementById('categoria');
  sel.innerHTML = '<option value="">Selecione...</option>';
  Object.keys(CATS[tipoAtual]).forEach(c => {
    sel.innerHTML += `<option value="${c}">${c}</option>`;
  });
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
}

function atualizarSubcat() {
  const cat = document.getElementById('categoria').value;
  const sel = document.getElementById('subcategoria');
  sel.innerHTML = '<option value="">Selecione...</option>';
  if (cat && CATS[tipoAtual][cat]) {
    CATS[tipoAtual][cat].forEach(s => {
      sel.innerHTML += `<option value="${s}">${s}</option>`;
    });
  }
}

// ── Lançar / Salvar edição ────────────────────────────────────────────────────
async function lancar() {
  const valorRaw = document.getElementById('valor').value.replace(',', '.');
  const valor    = parseFloat(valorRaw);
  const cat      = document.getElementById('categoria').value;
  const subcat   = document.getElementById('subcategoria').value;
  const desc     = document.getElementById('descricao').value.trim();
  const data     = document.getElementById('data').value;
  const registradoPor = getPerfil() || 'Não identificado';

  if (!valor || valor <= 0) { mostrarToast('Informe o valor', 'erro'); return; }
  if (!cat) { mostrarToast('Selecione a categoria', 'erro'); return; }

  const btnLancar = document.querySelector('.btn-lancar');
  btnLancar.disabled = true;

  // Modo edição
  if (editandoId) {
    const lanc = {
      id: editandoId,
      tipo: tipoAtual, valor, cat, subcat,
      desc: desc || (subcat || cat),
      paraQuem: paraQuemAtual,
      registradoPor,
      data,
    };
    btnLancar.innerHTML = '<i class="ti ti-loader-2 spin" aria-hidden="true"></i> Salvando...';
    try {
      if (scriptConfigurado()) await apiAtualizar(lanc);
      const idx = lancamentos.findIndex(l => l.id === editandoId);
      if (idx !== -1) lancamentos[idx] = lanc;
      fecharEdicao();
      mostrarToast('Lançamento atualizado!', 'sucesso');
      renderHistorico();
      renderResumo();
    } catch (e) {
      mostrarToast('Erro ao atualizar. Tente novamente.', 'erro');
    } finally {
      btnLancar.disabled = false;
      btnLancar.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Confirmar lançamento';
    }
    return;
  }

  // Modo novo lançamento
  const lanc = {
    id: String(Date.now()),
    tipo: tipoAtual, valor, cat, subcat,
    desc: desc || (subcat || cat),
    paraQuem: paraQuemAtual,
    registradoPor,
    data,
  };

  if (!scriptConfigurado()) {
    lancamentos.unshift(lanc);
    limparFormulario();
    mostrarToast('Lançamento salvo localmente', 'sucesso');
    btnLancar.disabled = false;
    return;
  }

  btnLancar.innerHTML = '<i class="ti ti-loader-2 spin" aria-hidden="true"></i> Salvando...';
  try {
    await apiAdicionar(lanc);
    lancamentos.unshift(lanc);
    limparFormulario();
    mostrarToast('Lançamento salvo!', 'sucesso');
  } catch (e) {
    mostrarToast('Erro ao salvar. Tente novamente.', 'erro');
  } finally {
    btnLancar.disabled = false;
    btnLancar.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Confirmar lançamento';
  }
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
  const hoje = new Date();
  document.getElementById('data').value = hoje.toISOString().split('T')[0];
}

// ── Editar ────────────────────────────────────────────────────────────────────
function abrirEdicao(id) {
  const l = lancamentos.find(l => l.id === id);
  if (!l) return;

  editandoId = id;

  // Muda título e botão
  document.getElementById('lancar-titulo').textContent = 'Editar lançamento';
  const btn = document.querySelector('.btn-lancar');
  btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Salvar alterações';
  document.getElementById('btn-cancelar-edicao').style.display = 'flex';

  // Preenche tipo
  setTipoSilencioso(l.tipo);

  // Preenche valor
  document.getElementById('valor').value = String(l.valor).replace('.', ',');

  // Preenche categoria e subcategoria
  popularCats();
  const selCat = document.getElementById('categoria');
  selCat.value = l.cat;
  atualizarSubcat();
  document.getElementById('subcategoria').value = l.subcat || '';

  // Preenche descrição
  document.getElementById('descricao').value = l.desc || '';

  // Preenche para quem
  paraQuemAtual = l.paraQuem || 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === paraQuemAtual) b.classList.add('active');
  });

  // Preenche data
  document.getElementById('data').value = l.data || '';

  // Navega para aba lançar
  const tabLancar = document.querySelector('.tab[aria-controls="sec-lancar"], .tab:first-child');
  irPara('lancar', document.querySelectorAll('.tab')[0]);

  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTipoSilencioso(tipo) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
    if (b.classList.contains(tipo)) {
      b.classList.add('active');
      b.setAttribute('aria-pressed', 'true');
    }
  });
}

function fecharEdicao() {
  editandoId = null;
  document.getElementById('lancar-titulo').textContent = 'Novo lançamento';
  const btn = document.querySelector('.btn-lancar');
  btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Confirmar lançamento';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
  limparFormulario();
  setTipoSilencioso('despesa');
}

// ── Deletar ───────────────────────────────────────────────────────────────────
async function deletar(id, btn) {
  if (!confirm('Remover este lançamento?')) return;
  btn.disabled = true;

  if (!scriptConfigurado()) {
    lancamentos = lancamentos.filter(l => l.id !== id);
    renderHistorico();
    renderResumo();
    mostrarToast('Removido', 'sucesso');
    return;
  }

  try {
    await apiDeletar(id);
    lancamentos = lancamentos.filter(l => l.id !== id);
    renderHistorico();
    renderResumo();
    mostrarToast('Removido', 'sucesso');
  } catch (e) {
    mostrarToast('Erro ao remover', 'erro');
    btn.disabled = false;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function mostrarToast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (tipo || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
}
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function parseFmtData(dataStr) {
  try {
    const partes = String(dataStr).substring(0,10).split('-');
    if (partes.length === 3) {
      return new Date(partes[0], partes[1]-1, partes[2]).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    }
  } catch(e){}
  return '';
}

// ── Resumo ────────────────────────────────────────────────────────────────────
function renderResumo() {
  const totalReceita  = lancamentos.filter(l=>l.tipo==='receita').reduce((s,l)=>s+Number(l.valor),0);
  const totalDespesa  = lancamentos.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+Number(l.valor),0);
  const totalPoupanca = lancamentos.filter(l=>l.tipo==='poupanca').reduce((s,l)=>s+Number(l.valor),0);
  const saldo = totalReceita - totalDespesa - totalPoupanca;

  document.getElementById('cards-resumo').innerHTML = `
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-arrow-down-circle" aria-hidden="true"></i>Renda total</div>
      <div class="stat-val verde">${fmtBRL(totalReceita)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-arrow-up-circle" aria-hidden="true"></i>Despesas</div>
      <div class="stat-val vermelho">${fmtBRL(totalDespesa)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-piggy-bank" aria-hidden="true"></i>Poupança</div>
      <div class="stat-val roxo">${fmtBRL(totalPoupanca)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-wallet" aria-hidden="true"></i>Saldo livre</div>
      <div class="stat-val ${saldo>=0?'verde':'vermelho'}">${fmtBRL(saldo)}</div>
    </div>`;

  const porCat = {};
  lancamentos.filter(l=>l.tipo==='despesa').forEach(l=>{ porCat[l.cat]=(porCat[l.cat]||0)+Number(l.valor); });
  const sorted = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  const maxVal = sorted.length ? sorted[0][1] : 1;

  document.getElementById('barras-cat').innerHTML = !sorted.length
    ? '<div class="empty-state"><i class="ti ti-chart-bar" aria-hidden="true"></i>Nenhuma despesa ainda</div>'
    : sorted.map(([cat,val]) => {
        const pct = Math.round((val/maxVal)*100);
        return `<div class="barra-wrap">
          <div class="barra-label"><span>${escHtml(cat)}</span><span>${fmtBRL(val)}</span></div>
          <div class="barra-bg"><div class="barra-fill ${pct>80?'alerta':'ok'}" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
}

// ── Histórico ─────────────────────────────────────────────────────────────────
function renderHistorico() {
  const lista = document.getElementById('lista');
  if (!lista) return;

  popularFiltroMes();

  let filtrados = filtroAtual==='todos' ? [...lancamentos] : lancamentos.filter(l=>l.tipo===filtroAtual);

  // Filtro de mês
  if (filtroMes) {
    filtrados = filtrados.filter(l => l.data && String(l.data).substring(0,7) === filtroMes);
  }

  if (!filtrados.length) {
    lista.innerHTML = '<div class="empty-state"><i class="ti ti-inbox" aria-hidden="true"></i>Nenhum lançamento encontrado</div>';
    return;
  }

  lista.innerHTML = filtrados.map(l => {
    const sinal    = l.tipo==='despesa' ? '–' : '+';
    const icone    = ICONES[l.cat] || 'ti-circle';
    const dataFmt  = l.data ? parseFmtData(l.data) : '';
    const paraQuem = l.paraQuem || l.resp || '';
    const porQuem  = l.registradoPor ? ' · por ' + l.registradoPor : '';
    return `
      <div class="lanc-item">
        <div class="lanc-icon ${l.tipo}"><i class="ti ${icone}" aria-hidden="true"></i></div>
        <div class="lanc-info">
          <div class="lanc-desc">${escHtml(l.desc)}</div>
          <div class="lanc-sub">${escHtml(l.subcat||l.cat)}${paraQuem?' · '+escHtml(paraQuem):''}${porQuem}${dataFmt?' · '+dataFmt:''}</div>
        </div>
        <div class="lanc-val ${l.tipo}">${sinal} ${fmtBRL(l.valor)}</div>
        <button class="btn-edit" onclick="abrirEdicao('${escHtml(String(l.id))}')" aria-label="Editar">
          <i class="ti ti-pencil" aria-hidden="true"></i>
        </button>
        <button class="btn-del" onclick="deletar('${escHtml(String(l.id))}',this)" aria-label="Remover">
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>`;
  }).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  const hoje = new Date();
  document.getElementById('data').value = hoje.toISOString().split('T')[0];
  document.getElementById('mes-ref').textContent =
    hoje.toLocaleDateString('pt-BR',{month:'short',year:'numeric'});

  const perfil = getPerfil();
  if (perfil) {
    document.getElementById('perfil-badge').textContent = perfil;
  } else {
    document.getElementById('tela-perfil').classList.add('active');
  }

  popularCats();
  renderResumo();
  renderHistorico();

  if (scriptConfigurado()) carregarDados();
})();
