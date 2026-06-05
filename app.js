// ── Dados de categorias ──────────────────────────────────────────────────────
const CATS = {
  despesa: {
    'Moradia':       ['Aluguel / Financ.', 'Condomínio', 'IPTU', 'Manutenção', 'Outros'],
    'Alimentação':   ['Mercado', 'Restaurante', 'Delivery', 'Padaria / Café', 'Outros'],
    'Transporte':    ['Combustível', 'Uber / Táxi', 'Transporte Público', 'Manutenção Veículo'],
    'Saúde':         ['Plano de Saúde', 'Médico / Dentista', 'Farmácia', 'Exames'],
    'Educação':      ['Escola / Faculdade', 'Cursos', 'Livros / Material'],
    'Casa':          ['Luz', 'Água / Gás', 'Internet', 'Celular', 'Outros'],
    'Lazer':         ['Streaming', 'Cinema / Passeios', 'Viagens', 'Esporte', 'Outros'],
    'Vestuário':     ['Roupas', 'Calçados', 'Acessórios'],
    'Outros':        ['Presente / Doação', 'Imprevistos', 'Outros'],
  },
  receita: {
    'Renda':         ['Salário', 'Freelance / Extra', 'Bônus', 'Aluguel Recebido', 'Outros'],
  },
  poupanca: {
    'Poupança':      ['Reserva de Emergência', 'Investimentos', 'Outros'],
  }
};

const ICONES = {
  'Moradia': 'ti-home', 'Alimentação': 'ti-salad', 'Transporte': 'ti-car',
  'Saúde': 'ti-heart', 'Educação': 'ti-book', 'Casa': 'ti-bolt',
  'Lazer': 'ti-device-tv', 'Vestuário': 'ti-shirt', 'Renda': 'ti-trending-up',
  'Poupança': 'ti-piggy-bank', 'Outros': 'ti-dots',
};

// ── Estado ────────────────────────────────────────────────────────────────────
let tipoAtual = 'despesa';
let respAtual = 'Pessoa 1';
let filtroAtual = 'todos';

function carregarLancamentos() {
  try {
    const raw = localStorage.getItem('lancamentos_cf');
    return raw ? JSON.parse(raw) : dadosExemplo();
  } catch (e) {
    return dadosExemplo();
  }
}

function salvarLancamentos() {
  try {
    localStorage.setItem('lancamentos_cf', JSON.stringify(lancamentos));
  } catch (e) {}
}

function dadosExemplo() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return [
    { tipo: 'receita',  valor: 5000, cat: 'Renda',        subcat: 'Salário',            desc: 'Salário – Pessoa 1',    resp: 'Pessoa 1', data: `${ano}-${mes}-02` },
    { tipo: 'receita',  valor: 3800, cat: 'Renda',        subcat: 'Salário',            desc: 'Salário – Pessoa 2',    resp: 'Pessoa 2', data: `${ano}-${mes}-02` },
    { tipo: 'despesa',  valor: 2200, cat: 'Moradia',      subcat: 'Aluguel / Financ.',  desc: 'Aluguel do mês',        resp: 'Casal',    data: `${ano}-${mes}-01` },
    { tipo: 'despesa',  valor: 450,  cat: 'Alimentação',  subcat: 'Mercado',            desc: 'Compra semana 1',       resp: 'Casal',    data: `${ano}-${mes}-05` },
    { tipo: 'despesa',  valor: 180,  cat: 'Transporte',   subcat: 'Combustível',        desc: 'Gasolina',              resp: 'Pessoa 1', data: `${ano}-${mes}-08` },
    { tipo: 'despesa',  valor: 320,  cat: 'Saúde',        subcat: 'Plano de Saúde',     desc: 'Mensalidade plano',     resp: 'Pessoa 2', data: `${ano}-${mes}-10` },
    { tipo: 'poupanca', valor: 500,  cat: 'Poupança',     subcat: 'Reserva de Emergência', desc: 'Reserva mensal',   resp: 'Casal',    data: `${ano}-${mes}-22` },
  ];
}

let lancamentos = carregarLancamentos();

// ── Navegação ─────────────────────────────────────────────────────────────────
function irPara(id, btn) {
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  document.getElementById('sec-' + id).classList.add('active');
  if (id === 'resumo') renderResumo();
  if (id === 'historico') renderHistorico();
}

// ── Tipo e Responsável ────────────────────────────────────────────────────────
function setTipo(tipo, btn) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  popularCats();
}

function setResp(resp, btn) {
  respAtual = resp;
  document.querySelectorAll('.resp-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
}

function setFiltro(filtro, btn) {
  filtroAtual = filtro;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistorico();
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

// ── Lançar ────────────────────────────────────────────────────────────────────
function lancar() {
  const valorInput = document.getElementById('valor').value;
  const valor = parseFloat(valorInput);
  const cat   = document.getElementById('categoria').value;
  const subcat = document.getElementById('subcategoria').value;
  const desc  = document.getElementById('descricao').value.trim();
  const data  = document.getElementById('data').value;

  if (!valor || valor <= 0) { mostrarToast('Informe o valor', 'erro'); return; }
  if (!cat) { mostrarToast('Selecione a categoria', 'erro'); return; }

  lancamentos.unshift({
    id: Date.now(),
    tipo: tipoAtual,
    valor,
    cat,
    subcat,
    desc: desc || (subcat || cat),
    resp: respAtual,
    data,
  });

  salvarLancamentos();

  document.getElementById('valor').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
  document.getElementById('valor').focus();

  mostrarToast('Lançamento registrado!', 'sucesso');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function mostrarToast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

// ── Resumo ────────────────────────────────────────────────────────────────────
function renderResumo() {
  const totalReceita  = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const totalDespesa  = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const totalPoupanca = lancamentos.filter(l => l.tipo === 'poupanca').reduce((s, l) => s + l.valor, 0);
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
      <div class="stat-val ${saldo >= 0 ? 'verde' : 'vermelho'}">${fmtBRL(saldo)}</div>
    </div>
  `;

  const porCat = {};
  lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
    porCat[l.cat] = (porCat[l.cat] || 0) + l.valor;
  });
  const sorted = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted.length ? sorted[0][1] : 1;

  if (!sorted.length) {
    document.getElementById('barras-cat').innerHTML =
      '<div class="empty-state"><i class="ti ti-chart-bar" aria-hidden="true"></i>Nenhuma despesa ainda</div>';
    return;
  }

  document.getElementById('barras-cat').innerHTML = sorted.map(([cat, val]) => {
    const pct = Math.round((val / maxVal) * 100);
    return `
      <div class="barra-wrap">
        <div class="barra-label"><span>${cat}</span><span>${fmtBRL(val)}</span></div>
        <div class="barra-bg"><div class="barra-fill ${pct > 80 ? 'alerta' : 'ok'}" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

// ── Histórico ─────────────────────────────────────────────────────────────────
function renderHistorico() {
  const filtrados = filtroAtual === 'todos'
    ? lancamentos
    : lancamentos.filter(l => l.tipo === filtroAtual);

  if (!filtrados.length) {
    document.getElementById('lista').innerHTML =
      '<div class="empty-state"><i class="ti ti-inbox" aria-hidden="true"></i>Nenhum lançamento ainda</div>';
    return;
  }

  const sorted = [...filtrados].sort((a, b) => (b.data || '') > (a.data || '') ? 1 : -1);

  document.getElementById('lista').innerHTML = sorted.map(l => {
    const sinal = l.tipo === 'despesa' ? '–' : '+';
    const icone = ICONES[l.cat] || 'ti-circle';
    let dataFmt = '';
    if (l.data) {
      try {
        dataFmt = new Date(l.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      } catch(e) {}
    }
    return `
      <div class="lanc-item">
        <div class="lanc-icon ${l.tipo}"><i class="ti ${icone}" aria-hidden="true"></i></div>
        <div class="lanc-info">
          <div class="lanc-desc">${escHtml(l.desc)}</div>
          <div class="lanc-sub">${escHtml(l.subcat || l.cat)} · ${escHtml(l.resp)}${dataFmt ? ' · ' + dataFmt : ''}</div>
        </div>
        <div class="lanc-val ${l.tipo}">${sinal} ${fmtBRL(l.valor)}</div>
      </div>`;
  }).join('');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  const hoje = new Date();
  document.getElementById('data').value = hoje.toISOString().split('T')[0];
  document.getElementById('mes-ref').textContent =
    hoje.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  popularCats();
})();
