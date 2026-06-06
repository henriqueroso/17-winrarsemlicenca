// ===== NAVIGATION =====
const pages = {
  'dashboard': 'Dashboard',
  'suppliers': 'Fornecedores',
  'supplier-detail': 'Fornecedores / Fazenda São Bento',
  'map': 'Mapa',
  'analysis': 'Análises IA / Fazenda São Bento',
  'marketplace': 'Especialistas',
  'reports': 'Relatórios',
  'settings': 'Configurações',
};

function navigate(pageId) {
  closeAllDropdowns();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + pageId);
  if (!pageEl) return;
  pageEl.classList.add('active');

  document.getElementById('main-content').scrollTop = 0;

  const navItem = document.querySelector('[data-page="' + pageId + '"]') ||
    document.querySelector('[data-page="' + pageId.split('-')[0] + '"]');
  if (navItem) navItem.classList.add('active');

  const bc = document.getElementById('breadcrumb');
  const label = pages[pageId] || pageId;
  const parts = label.split(' / ');
  if (parts.length === 1) {
    bc.innerHTML = `<i class="ti ti-home" style="font-size:13px"></i><span>${parts[0]}</span>`;
  } else {
    bc.innerHTML = `<i class="ti ti-home" style="font-size:13px"></i>
      <span style="color:var(--text3);cursor:pointer" onclick="navigate('${pageId.split('-')[0]}')">${parts[0]}</span>
      <i class="ti ti-chevron-right" style="font-size:11px;color:var(--text3)"></i>
      <span>${parts[1]}</span>`;
  }
}

// ===== CLOSE ALL DROPDOWNS =====
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-panel').forEach(d => d.style.display = 'none');
  isNotifOpen = false;
  isAccountOpen = false;
}

// ===== LIVE CLOCK =====
function updateClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  const now = new Date();
  const mins = Math.floor((Date.now() - window._appStart) / 60000);
  el.textContent = mins === 0 ? 'Atualizado agora mesmo' : `Atualizado há ${mins} min`;
}
window._appStart = Date.now();
setInterval(updateClock, 30000);

// ===== GLOBAL SEARCH =====
const appState = {
  currentPage: 'dashboard',
  selectedSupplierId: 'sao-bento',
  supplierFilter: 'all',
  mapRiskFilter: { low: true, moderate: true, high: true },
  marketplaceCategory: 'all',
  reports: [
    { id: 1, name: 'Conformidade_Novembro2024', type: 'Conformidade', status: 'Pronto', createdAt: '2026-06-05' },
    { id: 2, name: 'Risco_Critico_PA_MT_Q4', type: 'Risco Crítico', status: 'Pronto', createdAt: '2026-06-04' }
  ]
};

// ===== CONFIGURAÇÃO SUPABASE =====
const supabase = window.supabase.createClient('SUA_URL_DO_SUPABASE', 'SUA_ANON_KEY');

// Estado global dos dados
let state = {
    suppliers: []
};

// ===== FUNÇÃO PARA BUSCAR DADOS (API) =====
async function fetchSuppliers() {
    const { data, error } = await supabase.from('fornecedores').select('*');
    if (error) {
        console.error("Erro ao buscar:", error);
        return;
    }
    state.suppliers = data; // Atualiza a lista com o que veio do banco
    
    // Após carregar, atualiza a interface e o mapa
    renderTable(); 
    atualizarDadosDoMapa();
}

const experts = [
  { name: 'Dra. Renata Costa', category: 'ambiental', service: 'Regularização CAR e IBAMA', price: 'R$ 3.800' },
  { name: 'Prof. Marcos Alves', category: 'car', service: 'Retificação de CAR', price: 'R$ 2.900' },
  { name: 'Beatriz Fonseca', category: 'document', service: 'Due diligence documental', price: 'R$ 3.200' },
  { name: 'Jorge Oliveira', category: 'licenc', service: 'Defesa administrativa agrária', price: 'R$ 4.100' },
  { name: 'Luciana Silva', category: 'sanit', service: 'Regularização sanitária', price: 'R$ 2.600' },
  { name: 'Thiago Rocha', category: 'ambiental', service: 'Plano corretivo ambiental', price: 'R$ 3.450' }
];

function getSelectedSupplier() {
  return suppliers.find(s => s.id === appState.selectedSupplierId) || suppliers[0];
}

function getRiskBadge(level) {
  if (level === 'red') return '<span class="badge badge-red">Risco crítico</span>';
  if (level === 'yellow') return '<span class="badge badge-yellow">Risco moderado</span>';
  return '<span class="badge badge-green">Conforme</span>';
}

function getScoreColor(level) {
  if (level === 'red') return 'var(--red)';
  if (level === 'yellow') return 'var(--yellow)';
  return 'var(--green)';
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.style.background = type === 'error' ? 'var(--red)' : 'var(--green2)';
  t.style.display = 'flex';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}

function openSupplierById(id) {
  appState.selectedSupplierId = id;
  renderSuppliersTable();
  renderSupplierDetail();
  renderAnalysisPage();
  renderMarketplaceRecommendations();
  navigate('supplier-detail');
}

const allSuppliers = [
  { name: 'Fazenda São Bento', owner: 'João M. Ferreira', loc: 'Santarém, PA', score: 18, level: 'red', page: 'supplier-detail' },
  { name: 'Agro Vale Verde', owner: 'Maria C. dos Santos', loc: 'Barra do Garças, MT', score: 23, level: 'red', page: 'supplier-detail' },
  { name: 'Fazenda Nova Esperança', owner: 'Carlos R. Souza', loc: 'Uruará, PA', score: 29, level: 'red', page: 'supplier-detail' },
  { name: 'Estância Bom Retiro', owner: 'Antônio P. Lima', loc: 'Sinop, MT', score: 41, level: 'yellow', page: 'supplier-detail' },
  { name: 'Agropecuária Cerrado', owner: 'Roberto A. Oliveira', loc: 'Rio Verde, GO', score: 48, level: 'yellow', page: 'supplier-detail' },
  { name: 'Fazenda Boa Vista', owner: 'Luciana C. Almeida', loc: 'Passo Fundo, RS', score: 88, level: 'green', page: 'supplier-detail' },
];

let searchOpen = false;
const searchInput = document.querySelector('.search-wrap input');
const searchResults = document.createElement('div');
searchResults.id = 'search-results';
searchResults.style.cssText = `position:fixed;top:52px;left:50%;transform:translateX(-50%);width:400px;background:var(--surface);border:1px solid var(--border2);border-radius:10px;z-index:300;display:none;box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden;`;
document.body.appendChild(searchResults);

searchInput.addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  if (!q) { searchResults.style.display = 'none'; return; }
  const hits = allSuppliers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.owner.toLowerCase().includes(q) ||
    s.loc.toLowerCase().includes(q)
  );
  if (!hits.length) {
    searchResults.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">Nenhum resultado encontrado</div>`;
  } else {
    searchResults.innerHTML = hits.map(s => `
      <div onclick="navigate('${s.page}');searchInput.value='';searchResults.style.display='none'"
        style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .1s"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
        <div class="score-sm" style="width:28px;height:28px;font-size:10px;color:var(--${s.level === 'red' ? 'red' : s.level === 'yellow' ? 'yellow' : 'green'});border-color:var(--${s.level === 'red' ? 'red' : s.level === 'yellow' ? 'yellow' : 'green'})">${s.score}</div>
        <div style="flex:1"><div style="font-size:12px;font-weight:500">${s.name}</div><div style="font-size:10px;color:var(--text3)">${s.owner} · ${s.loc}</div></div>
        <i class="ti ti-arrow-right" style="color:var(--text3);font-size:13px"></i>
      </div>`).join('');
  }
  searchResults.style.display = 'block';
});

searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { this.value = ''; searchResults.style.display = 'none'; }
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-wrap') && !e.target.closest('#search-results')) {
    searchResults.style.display = 'none';
  }
});

// ===== NOTIFICATIONS PANEL =====
let isNotifOpen = false;
const notifBtn = document.querySelector('.icon-btn:first-child');
const notifPanel = document.createElement('div');
notifPanel.className = 'dropdown-panel';
notifPanel.style.cssText = `position:fixed;top:52px;right:120px;width:320px;background:var(--surface);border:1px solid var(--border2);border-radius:12px;z-index:300;display:none;box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden;`;
notifPanel.innerHTML = `
  <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:13px;font-weight:500">Notificações</span>
    <span style="font-size:10px;color:var(--text3);cursor:pointer" onclick="markAllRead()">Marcar todas como lidas</span>
  </div>
  <div style="max-height:300px;overflow-y:auto">
    ${[
      { dot: 'red', title: 'Alerta crítico: Fazenda São Bento', desc: 'Desmatamento de 312ha detectado · PRODES', time: 'há 2h', read: false },
      { dot: 'red', title: 'Nova multa IBAMA detectada', desc: 'Agro Vale Verde · R$ 485.000', time: 'há 4h', read: false },
      { dot: 'yellow', title: 'CAR com prazo vencido', desc: 'Fazenda Nova Esperança · retificação pendente', time: 'há 9h', read: false },
      { dot: 'yellow', title: 'Concentração de risco no PA', desc: 'Aumento de 18% em 30 dias detectado', time: 'há 12h', read: true },
      { dot: 'green', title: '3 fornecedores regularizados', desc: 'MT e GO · situação sanitária', time: 'há 1d', read: true },
    ].map((n, i) => `
      <div id="notif-${i}" style="display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);cursor:pointer;${n.read ? '' : 'background:rgba(255,255,255,0.02)'}"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='${n.read ? '' : 'rgba(255,255,255,0.02)'}'">
        <div style="width:7px;height:7px;border-radius:50%;background:var(--${n.dot});margin-top:5px;flex-shrink:0"></div>
        <div style="flex:1"><div style="font-size:12px;font-weight:${n.read ? '400' : '500'}">${n.title}</div><div style="font-size:10.5px;color:var(--text2);margin-top:1px">${n.desc}</div><div style="font-size:10px;color:var(--text3);margin-top:2px">${n.time}</div></div>
        ${!n.read ? '<div style="width:6px;height:6px;border-radius:50%;background:var(--blue);margin-top:5px;flex-shrink:0"></div>' : ''}
      </div>`).join('')}
  </div>
`;
document.body.appendChild(notifPanel);

function markAllRead() {
  notifPanel.querySelectorAll('[id^=notif-]').forEach(el => {
    el.style.background = '';
    const dot = el.querySelector('div:last-child');
    if (dot && dot.style.background.includes('blue')) dot.remove();
    el.querySelector('div:nth-child(2) div:first-child').style.fontWeight = '400';
  });
  document.querySelector('.notif-dot').style.display = 'none';
  showToast('Todas as notificações marcadas como lidas');
}

notifBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  isNotifOpen = !isNotifOpen;
  notifPanel.style.display = isNotifOpen ? 'block' : 'none';
  isAccountOpen = false;
  accountPanel.style.display = 'none';
});

// ===== ACCOUNT DROPDOWN =====
let isAccountOpen = false;
const accountTriggers = document.querySelectorAll('.avatar, .acct-label');
const accountPanel = document.createElement('div');
accountPanel.className = 'dropdown-panel';
accountPanel.style.cssText = `position:fixed;top:52px;right:16px;width:220px;background:var(--surface);border:1px solid var(--border2);border-radius:12px;z-index:300;display:none;box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden;`;
accountPanel.innerHTML = `
  <div style="padding:14px;border-bottom:1px solid var(--border)">
    <div style="font-size:13px;font-weight:500">Raízen Commodities</div>
    <div style="font-size:11px;color:var(--text3);margin-top:2px">rc.compliance@raizen.com.br</div>
    <span class="badge badge-green" style="margin-top:6px">Plano Enterprise</span>
  </div>
  ${[
    { icon: 'ti-user', label: 'Meu perfil' },
    { icon: 'ti-settings', label: 'Configurações', action: "navigate('settings')" },
    { icon: 'ti-building', label: 'Minha empresa' },
    { icon: 'ti-credit-card', label: 'Plano e cobrança' },
  ].map(item => `
    <div onclick="${item.action || ''};closeAllDropdowns()" style="display:flex;align-items:center;gap:9px;padding:9px 14px;cursor:pointer;font-size:12px;color:var(--text2)"
      onmouseover="this.style.background='var(--surface2)';this.style.color='var(--text)'" onmouseout="this.style.background='';this.style.color='var(--text2)'">
      <i class="ti ${item.icon}" style="font-size:15px"></i>${item.label}
    </div>`).join('')}
  <div style="border-top:1px solid var(--border)">
    <div onclick="showLogoutConfirm()" style="display:flex;align-items:center;gap:9px;padding:9px 14px;cursor:pointer;font-size:12px;color:var(--red)"
      onmouseover="this.style.background='var(--rdim)'" onmouseout="this.style.background=''">
      <i class="ti ti-logout" style="font-size:15px"></i>Sair da conta
    </div>
  </div>`;
document.body.appendChild(accountPanel);

accountTriggers.forEach(el => el.addEventListener('click', function(e) {
  e.stopPropagation();
  isAccountOpen = !isAccountOpen;
  accountPanel.style.display = isAccountOpen ? 'block' : 'none';
  isNotifOpen = false;
  notifPanel.style.display = 'none';
}));

document.addEventListener('click', function(e) {
  if (!e.target.closest('.dropdown-panel') && !e.target.closest('.icon-btn') && !e.target.closest('.avatar') && !e.target.closest('.acct-label')) {
    closeAllDropdowns();
  }
});

// ===== SETTINGS PAGE INJECTION =====
const settingsPage = document.createElement('div');
settingsPage.className = 'page';
settingsPage.id = 'page-settings';
settingsPage.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
    <div><h1 style="font-size:17px;font-weight:500">Configurações</h1><p style="font-size:12px;color:var(--text3);margin-top:2px">Preferências da conta e da plataforma</p></div>
  </div>
  <div style="display:grid;grid-template-columns:200px 1fr;gap:16px">
    <div style="display:flex;flex-direction:column;gap:2px">
      ${[
        ['ti-user','Perfil',true],['ti-bell','Notificações',false],['ti-shield','Privacidade',false],
        ['ti-plug','Integrações',false],['ti-users','Equipe',false],['ti-credit-card','Plano',false]
      ].map(([icon,label,active]) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;font-size:12px;cursor:pointer;${active ? 'background:var(--gdim);color:var(--green);border:1px solid var(--gborder)' : 'color:var(--text2);border:1px solid transparent'}"
          onmouseover="if(!this.classList.contains('s-active'))this.style.background='var(--surface2)'" onmouseout="if(!this.classList.contains('s-active'))this.style.background=''">
          <i class="ti ${icon}" style="font-size:15px"></i>${label}
        </div>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card card-body">
        <div style="font-size:13px;font-weight:500;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">Informações da conta</div>
        ${[
          ['Nome completo','Rafael Costa'],['E-mail','rc.compliance@raizen.com.br'],['Empresa','Raízen Commodities S.A.'],['Cargo','Gerente de Compliance']
        ].map(([label,val]) => `
          <div style="margin-bottom:12px">
            <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">${label}</div>
            <input value="${val}" style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px 12px;outline:none;font-family:inherit"
              onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border2)'">
          </div>`).join('')}
        <button class="btn btn-success" onclick="showToast('Perfil salvo com sucesso!')"><i class="ti ti-check" style="font-size:13px"></i> Salvar alterações</button>
      </div>
      <div class="card card-body">
        <div style="font-size:13px;font-weight:500;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">Preferências de notificação</div>
        ${[
          ['Alertas de risco crítico (score < 30)','notif-critical',true],
          ['Novos alertas PRODES/IBAMA','notif-prodes',true],
          ['Resumo diário por e-mail','notif-email',false],
          ['Atualizações de análise IA','notif-ai',true]
        ].map(([label,id,checked]) => `
          <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
            <span style="font-size:12px;color:var(--text2)">${label}</span>
            <input type="checkbox" ${checked ? 'checked' : ''} id="${id}" style="accent-color:var(--green);width:15px;height:15px;cursor:pointer">
          </label>`).join('')}
      </div>
    </div>
  </div>`;
document.getElementById('main-content').appendChild(settingsPage);

// ===== NAV ITEMS (settings/support/logout) =====
document.querySelectorAll('.nav-item').forEach(item => {
  if (item.textContent.includes('Configurações') && !item.getAttribute('onclick')) {
    item.setAttribute('onclick', "navigate('settings')");
    item.setAttribute('data-page', 'settings');
  }
  if (item.textContent.includes('Suporte')) {
    item.setAttribute('onclick', "openSupportModal()");
  }
  if (item.textContent.includes('Sair')) {
    item.setAttribute('onclick', "showLogoutConfirm()");
  }
});

// ===== SUPPORT MODAL =====
const supportModal = document.createElement('div');
supportModal.className = 'modal-overlay';
supportModal.id = 'support-modal';
supportModal.innerHTML = `
  <div class="modal" style="width:420px">
    <div class="modal-header">
      <div class="modal-title">Central de Suporte</div>
      <div class="modal-close" onclick="document.getElementById('support-modal').classList.remove('open')">×</div>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;gap:10px">
        <div style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px;cursor:pointer;text-align:center"
          onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
          <i class="ti ti-mail" style="font-size:20px;color:var(--blue);display:block;margin-bottom:6px"></i>
          <div style="font-size:12px;font-weight:500">E-mail</div>
          <div style="font-size:10px;color:var(--text3)">suporte@traceverde.com.br</div>
        </div>
        <div style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px;cursor:pointer;text-align:center"
          onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--border)'">
          <i class="ti ti-brand-whatsapp" style="font-size:20px;color:var(--green);display:block;margin-bottom:6px"></i>
          <div style="font-size:12px;font-weight:500">WhatsApp</div>
          <div style="font-size:10px;color:var(--text3)">(11) 99999-0001</div>
        </div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Enviar mensagem</div>
        <textarea placeholder="Descreva sua dúvida ou problema..." style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:10px;outline:none;font-family:inherit;resize:vertical;min-height:80px"
          onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border2)'"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="document.getElementById('support-modal').classList.remove('open')">Fechar</button>
      <button class="btn btn-primary" onclick="document.getElementById('support-modal').classList.remove('open');showToast('Mensagem enviada! Retornaremos em até 2h')"><i class="ti ti-send" style="font-size:13px"></i> Enviar</button>
    </div>
  </div>`;
document.body.appendChild(supportModal);

function openSupportModal() {
  document.getElementById('support-modal').classList.add('open');
}

// ===== LOGOUT CONFIRM =====
const logoutModal = document.createElement('div');
logoutModal.className = 'modal-overlay';
logoutModal.id = 'logout-modal';
logoutModal.innerHTML = `
  <div class="modal" style="width:360px">
    <div class="modal-header">
      <div class="modal-title">Confirmar saída</div>
      <div class="modal-close" onclick="document.getElementById('logout-modal').classList.remove('open')">×</div>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text2);line-height:1.5">Tem certeza que deseja sair da sua conta? Sua sessão será encerrada.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="document.getElementById('logout-modal').classList.remove('open')">Cancelar</button>
      <button class="btn btn-danger" onclick="document.getElementById('logout-modal').classList.remove('open');showToast('Sessão encerrada com sucesso')">Sair da conta</button>
    </div>
  </div>`;
document.body.appendChild(logoutModal);

function showLogoutConfirm() {
  closeAllDropdowns();
  document.getElementById('logout-modal').classList.add('open');
}

// ===== MAP PIN SELECT =====
function selectPin(name, loc, score, level) {
  document.getElementById('mpd-name').textContent = name;
  document.getElementById('mpd-loc').innerHTML = `<i class="ti ti-map-pin" style="font-size:11px"></i> ${loc}`;
  document.getElementById('mpd-score-val').textContent = score;

  const colors = {
    red: { c: 'var(--red)', dim: 'var(--rdim)', border: 'var(--rborder)', label: 'Risco Crítico', cls: 'badge-red' },
    yellow: { c: 'var(--yellow)', dim: 'var(--ydim)', border: 'var(--yborder)', label: 'Risco Moderado', cls: 'badge-yellow' },
    green: { c: 'var(--green)', dim: 'var(--gdim)', border: 'var(--gborder)', label: 'Baixo Risco', cls: 'badge-green' }
  };
  const col = colors[level];

  document.getElementById('mpd-score-val').style.color = col.c;
  document.getElementById('mpd-ring').style.stroke = col.c;
  const offset = 175.9 - (score / 100) * 175.9;
  document.getElementById('mpd-ring').setAttribute('stroke-dashoffset', offset);

  const badge = document.getElementById('mpd-badge');
  badge.textContent = col.label;
  badge.className = 'badge ' + col.cls;
  badge.style.marginBottom = '8px';

  // Update area/culture based on supplier
  const supplierData = {
    'Fazenda São Bento': { area: '2.840 ha', cultura: 'Soja/Milho' },
    'Agro Vale Verde': { area: '1.200 ha', cultura: 'Soja' },
    'Fazenda Nova Esperança': { area: '980 ha', cultura: 'Milho/Cana' },
    'Estância Bom Retiro': { area: '1.450 ha', cultura: 'Soja' },
    'Agropecuária Cerrado': { area: '870 ha', cultura: 'Cana/Soja' },
    'Fazenda Boa Vista': { area: '620 ha', cultura: 'Soja/Trigo' },
    'Cerealista São Lucas': { area: '540 ha', cultura: 'Soja' },
    'Agro Goiás Sul': { area: '730 ha', cultura: 'Soja/Milho' },
    'Fazenda Nova Terra': { area: '1.100 ha', cultura: 'Soja' },
    'Grão Pará Agro': { area: '890 ha', cultura: 'Soja' },
  };
  const info = supplierData[name] || { area: '—', cultura: '—' };
  const cells = document.querySelectorAll('#map-detail-selected .score-ring-container ~ div div div');
  const gridCells = document.querySelectorAll('#map-detail-selected [style*="grid-template-columns"] > div');
  if (gridCells[0]) gridCells[0].querySelector('div:last-child').textContent = info.area;
  if (gridCells[1]) gridCells[1].querySelector('div:last-child').textContent = info.cultura;
}

// ===== MAP FILTERS =====
document.querySelectorAll('#page-map input[type=checkbox]').forEach(cb => {
  cb.addEventListener('change', applyMapFilters);
});
document.querySelector('#page-map select')?.addEventListener('change', applyMapFilters);

function applyMapFilters() {
  const checkboxes = document.querySelectorAll('#page-map input[type=checkbox]');
  const showLow = checkboxes[0]?.checked;
  const showMed = checkboxes[1]?.checked;
  const showHigh = checkboxes[2]?.checked;

  // Red pins = high risk
  document.querySelectorAll('#page-map circle[fill="var(--red)"]').forEach(c => {
    const g = c.closest('g');
    if (g) g.style.display = showHigh ? '' : 'none';
  });
  // Yellow pins
  document.querySelectorAll('#page-map circle[fill="var(--yellow)"]').forEach(c => {
    const g = c.closest('g');
    if (g) g.style.display = showMed ? '' : 'none';
  });
  // Green pins
  document.querySelectorAll('#page-map circle[fill="var(--green)"]').forEach(c => {
    const g = c.closest('g');
    if (g) g.style.display = showLow ? '' : 'none';
  });

  // Update visible count
  const countEl = document.querySelector('#page-map strong');
  if (countEl) {
    let count = 0;
    if (showHigh) count += 87;
    if (showMed) count += 269;
    if (showLow) count += 892;
    countEl.textContent = count.toLocaleString('pt-BR');
  }
}

// ===== SUPPLIERS FILTER CHIPS =====
const supplierRows = {
  all: [0,1,2,3,4,5],
  risk: [0,1,2],
  moderate: [3,4],
  compliance: [5],
  pa: [0,2],
  mt: [1,3],
  go: [4],
  multa: [0,1,2],
  car: [0,2,3],
};

document.querySelectorAll('#page-suppliers .chip').forEach((chip, idx) => {
  chip.addEventListener('click', function() {
    document.querySelectorAll('#page-suppliers .chip').forEach(c => {
      c.classList.remove('active', 'active-green');
    });
    this.classList.add('active-green');

    const keys = ['all','risk','moderate','compliance','pa','mt','go','multa','car'];
    const key = keys[idx] || 'all';
    const visibleIdx = supplierRows[key] || supplierRows.all;

    const rows = document.querySelectorAll('#page-suppliers tbody tr');
    rows.forEach((row, i) => {
      row.style.display = visibleIdx.includes(i) ? '' : 'none';
    });
  });
});

// ===== NEW SUPPLIER MODAL =====
const newSupplierModal = document.createElement('div');
newSupplierModal.className = 'modal-overlay';
newSupplierModal.id = 'new-supplier-modal';
newSupplierModal.innerHTML = `
  <div class="modal" style="width:500px">
    <div class="modal-header">
      <div class="modal-title">Novo Fornecedor</div>
      <div class="modal-close" onclick="document.getElementById('new-supplier-modal').classList.remove('open')">×</div>
    </div>
    <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${[
        ['Nome da fazenda','Fazenda / Propriedade'],['Proprietário','Nome completo'],
        ['CPF/CNPJ','000.000.000-00'],['CAR','PA-0000000'],
        ['Município','Cidade'],['Estado',''],
        ['Área total (ha)','0'],['Cultura principal','Soja, Milho...']
      ].map(([label,ph],i) => {
        if (label === 'Estado') return `<div><div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">${label}</div>
          <select style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px;outline:none;font-family:inherit">
            <option>Selecione...</option><option>Pará (PA)</option><option>Mato Grosso (MT)</option><option>Goiás (GO)</option><option>Mato Grosso do Sul (MS)</option><option>Rio Grande do Sul (RS)</option>
          </select></div>`;
        return `<div><div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">${label}</div>
          <input placeholder="${ph}" style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px 12px;outline:none;font-family:inherit"
            onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border2)'"></div>`;
      }).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="document.getElementById('new-supplier-modal').classList.remove('open')">Cancelar</button>
      <button class="btn btn-success" onclick="document.getElementById('new-supplier-modal').classList.remove('open');showToast('Fornecedor adicionado! Análise IA em andamento...')"><i class="ti ti-plus" style="font-size:13px"></i> Adicionar fornecedor</button>
    </div>
  </div>`;
document.body.appendChild(newSupplierModal);

document.querySelectorAll('#page-suppliers .btn-success').forEach(btn => {
  if (btn.textContent.includes('Novo fornecedor')) {
    btn.addEventListener('click', () => document.getElementById('new-supplier-modal').classList.add('open'));
  }
});

// ===== EXPORT CSV =====
document.querySelectorAll('#page-suppliers button').forEach(btn => {
  if (btn.textContent.includes('Exportar CSV')) {
    btn.addEventListener('click', function() {
      const csv = `Fazenda,Estado,Cultura,Score,CAR,Multa,Desflorestamento,Última análise
"Fazenda São Bento",PA,"Soja/Milho",18,Pendente,R$ 485k,312 ha,hoje
"Agro Vale Verde",MT,Soja,23,Análise,R$ 120k,178 ha,ontem
"Fazenda Nova Esperança",PA,"Milho/Cana",29,Pendente,R$ 80k,98 ha,ontem
"Estância Bom Retiro",MT,Soja,41,Pendente,Nenhuma,Nenhum,2 dias
"Agropecuária Cerrado",GO,"Cana/Soja",48,Regular,Nenhuma,42 ha,3 dias
"Fazenda Boa Vista",RS,"Soja/Trigo",88,Regular,Nenhuma,Nenhum,hoje`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'traceverde_fornecedores.csv';
      a.click(); URL.revokeObjectURL(url);
      showToast('CSV exportado com sucesso!');
    });
  }
});

// ===== EXPORT PDF (ANALYSIS & REPORTS) =====
document.querySelectorAll('button').forEach(btn => {
  if (btn.textContent.trim() === 'Exportar PDF' || btn.innerHTML.includes('Exportar PDF')) {
    btn.addEventListener('click', function() {
      showToast('Gerando PDF... Download em instantes');
    });
  }
  if (btn.innerHTML.includes('Baixar PDF')) {
    btn.addEventListener('click', function() {
      showToast('Relatório PDF gerado! Download iniciado');
    });
  }
});

// ===== REPORTS: NOVO RELATÓRIO =====
const newReportModal = document.createElement('div');
newReportModal.className = 'modal-overlay';
newReportModal.id = 'new-report-modal';
newReportModal.innerHTML = `
  <div class="modal" style="width:440px">
    <div class="modal-header">
      <div class="modal-title">Novo Relatório</div>
      <div class="modal-close" onclick="document.getElementById('new-report-modal').classList.remove('open')">×</div>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
      <div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Tipo</div>
        <select style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px;outline:none;font-family:inherit">
          <option>Relatório de conformidade</option><option>Relatório de risco crítico</option><option>Relatório geoespacial</option><option>Relatório completo</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Data início</div>
          <input type="date" style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px;outline:none;font-family:inherit">
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Data fim</div>
          <input type="date" style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px;outline:none;font-family:inherit">
        </div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Filtro de estado</div>
        <select style="width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:12px;padding:8px;outline:none;font-family:inherit">
          <option>Todos os estados</option><option>Pará (PA)</option><option>Mato Grosso (MT)</option><option>Goiás (GO)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="document.getElementById('new-report-modal').classList.remove('open')">Cancelar</button>
      <button class="btn btn-success" onclick="document.getElementById('new-report-modal').classList.remove('open');showToast('Relatório em geração! Ficará pronto em instantes')"><i class="ti ti-file-analytics" style="font-size:13px"></i> Gerar relatório</button>
    </div>
  </div>`;
document.body.appendChild(newReportModal);

document.querySelectorAll('#page-reports .btn-success').forEach(btn => {
  if (btn.textContent.includes('Novo relatório')) {
    btn.addEventListener('click', () => document.getElementById('new-report-modal').classList.add('open'));
  }
});

// ===== REPORTS: DOWNLOAD BOTÕES =====
document.querySelectorAll('#page-reports tbody .btn-outline').forEach((btn, i) => {
  if (!btn.disabled) {
    btn.addEventListener('click', function() {
      const reportNames = ['Conformidade_Novembro2024.pdf', 'Risco_Critico_PA_MT_Q4.pdf'];
      showToast(`Download iniciado: ${reportNames[i] || 'relatorio.pdf'}`);
    });
  }
});

// ===== MARKETPLACE: CATEGORIA FILTER =====
const categories = ['ambiental','car','licenc','sanit','document'];
document.querySelectorAll('#page-marketplace [style*="cursor:pointer"]').forEach((catItem, idx) => {
  if (idx < 5) {
    catItem.addEventListener('click', function() {
      document.querySelectorAll('#page-marketplace [style*="cursor:pointer"]').forEach((c, ci) => {
        if (ci < 5) {
          c.style.background = 'transparent';
          c.style.border = '1px solid transparent';
          c.style.color = 'var(--text2)';
        }
      });
      this.style.background = 'var(--gdim)';
      this.style.border = '1px solid var(--gborder)';
      this.style.color = 'var(--green)';
    });
  }
});

// ===== MARKETPLACE: VER RECOMENDADOS =====
document.querySelector('#page-marketplace .btn-success[style*="flex-shrink"]')?.addEventListener('click', function() {
  document.querySelector('#page-marketplace .expert-card.rec')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ===== HIRE MODAL =====
function openHireModal(name, price, service) {
  document.getElementById('modal-name').textContent = name;
  document.getElementById('modal-price').textContent = price;
  document.getElementById('modal-service').textContent = service;
  const initials = name.split(' ').filter((_,i)=>i<2).map(w=>w[0]).join('');
  document.getElementById('modal-avatar').textContent = initials;
  const val = parseInt(price.replace(/\D/g,''));
  const fee = Math.round(val * 0.05);
  document.getElementById('modal-total').textContent = 'R$ ' + (val + fee).toLocaleString('pt-BR');
  // Update modal spec
  const spec = document.getElementById('modal-spec');
  const specMap = {
    'Dra. Renata Costa': 'Advogada ambiental · OAB/PA 38.291',
    'Prof. Marcos Alves': 'Eng. Florestal · CREA 12.048',
    'Beatriz Fonseca': 'Consultora Compliance · MSc Ambiental',
    'Jorge Oliveira': 'Advogado Agrário · OAB/MT 22.115',
    'Luciana Silva': 'Veterinária · CRMV-GO 8.432',
    'Thiago Rocha': 'Eng. Agrônomo · CREA 44.200',
  };
  if (spec) spec.textContent = specMap[name] || 'Especialista';
  document.getElementById('hire-modal').classList.add('open');
}

function closeHireModal() {
  document.getElementById('hire-modal').classList.remove('open');
}

function confirmHire() {
  const name = document.getElementById('modal-name').textContent;
  closeHireModal();
  showToast(`${name} contratado(a) com sucesso!`);
  // Update flow steps in marketplace
  const steps = document.querySelectorAll('#page-marketplace .step-num');
  if (steps[2]) {
    steps[2].classList.add('done');
    steps[2].closest('.flow-step').classList.add('done');
  }
}

// ===== TOAST =====
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.style.background = type === 'error' ? 'var(--red)' : 'var(--green2)';
  t.style.display = 'flex';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}

// ===== CHIP TOGGLE (map culture chips) =====
document.querySelectorAll('#page-map .chip').forEach(c => {
  c.addEventListener('click', function() {
    this.classList.toggle('active-green');
  });
});

// ===== CLOSE MODALS ON OVERLAY =====
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});

// ===== ADJUSTMENTS BTN (topbar) =====
document.querySelectorAll('.icon-btn').forEach(btn => {
  if (btn.querySelector('.ti-adjustments-horizontal')) {
    btn.addEventListener('click', () => navigate('settings'));
  }
});

// ===== INIT =====
navigate('dashboard');
updateClock();
fetchSuppliers();