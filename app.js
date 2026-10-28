/* ==========================================================================
   PORTAL DE ACCESOS DIRECTOS - JAVASCRIPT LOGIC
   Handles CSV loading, LocalStorage, search, filtering, modals & theme
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initial default systems if no CSV or localStorage exists
  const DEFAULT_SYSTEMS = [
    {
      id: 'sys-1',
      title: 'Agriness S4',
      url: 'https://s4farm.agriness.com/',
      img: 'IMG/1.png',
      category: 'Gestion',
      description: 'Plataforma de gestión y control de datos de granjas porcinas.'
    },
    {
      id: 'sys-2',
      title: 'Trace Feed',
      url: 'https://tracefeedpba.cerdodelosllanos.com.ar/',
      img: 'IMG/2.png',
      category: 'Gestion',
      description: 'Sistema de trazabilidad y alimentación para la producción.'
    },
    {
      id: 'sys-3',
      title: 'Caliper (DS)',
      url: 'https://datastudio.google.com/u/0/reporting/daadc09f-4de9-4e12-89cd-5286b62b4b2d/page/RFBIF',
      img: 'IMG/3.png',
      category: 'Analitica',
      description: 'Reportes e indicadores gerenciales en Looker / DataStudio.'
    },
    {
      id: 'sys-4',
      title: 'Pig Counter (AI)',
      url: 'https://ia.cerdodelosllanos.com.ar/',
      img: 'IMG/4.png',
      category: 'IA',
      description: 'Conteo e inteligencia artificial para monitoreo en tiempo real.'
    },
    {
      id: 'sys-5',
      title: 'Condor',
      url: 'https://sistema-de-gestion-ds.vercel.app/',
      img: 'IMG/5.png',
      category: 'Gestion',
      description: 'Sistema de gestión de operaciones Condor.'
    },
    {
      id: 'sys-6',
      title: 'APKing',
      url: 'https://apking-report-copy-4cde733d.base44.app/',
      img: 'IMG/6.png',
      category: 'Analitica',
      description: 'Reporte y control de aplicaciones APKing.'
    },
    {
      id: 'sys-7',
      title: 'Control de Cajas',
      url: 'https://script.google.com/macros/s/AKfycbyu7TG6wo-Ekl3MYVb6mSjqQS1AUS32kyVEIVTJggMqwx5ahYtnp35e2FzPQjZrQDJq/exec?vista=informe',
      img: 'IMG/Google_Apps_Script.svg',
      category: 'Gestion',
      description: 'Control de cajas y gestión de informes financieros.'
    },
    {
      id: 'sys-8',
      title: 'Informe de ventas - Ger',
      url: 'https://script.google.com/d/1gQ3EfqKdTN2zdQp2p2nCtbD1tKS6Dzthpsr3uBtxiTjbd1KrFyCEP8_H/edit?usp=drive_link',
      img: 'IMG/Google_Apps_Script.svg',
      category: 'Analitica',
      description: 'Informe gerencial y análisis de ventas.'
    }
  ];

  // State
  let systems = [];
  let currentCategory = 'all';
  let searchQuery = '';

  // DOM Elements
  const systemsGrid = document.getElementById('systemsGrid');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const categoriesBar = document.getElementById('categoriesBar');
  const emptyState = document.getElementById('emptyState');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const visibleCountEl = document.getElementById('visibleCount');
  const totalCountEl = document.getElementById('totalCount');
  
  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');

  // Clock
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');

  // Modal & Form
  const addSystemBtn = document.getElementById('addSystemBtn');
  const systemModal = document.getElementById('systemModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const systemForm = document.getElementById('systemForm');
  const modalTitle = document.getElementById('modalTitle');
  const systemIdInput = document.getElementById('systemId');
  const inputTitle = document.getElementById('inputTitle');
  const inputUrl = document.getElementById('inputUrl');
  const inputImg = document.getElementById('inputImg');
  const inputCategory = document.getElementById('inputCategory');
  const inputDescription = document.getElementById('inputDescription');

  // Footer Year
  document.getElementById('currentYear').textContent = new Date().getFullYear();

  /* --------------------------------------------------------------------------
     1. INITIALIZATION & DATA LOADING
     -------------------------------------------------------------------------- */
  async function init() {
    initTheme();
    startClock();
    await loadSystemsData();
    renderGrid();
    setupEventListeners();
  }

  // Load dynamically from Paginas.csv or DEFAULT_SYSTEMS, merging seamlessly
  async function loadSystemsData() {
    let csvSystems = [];
    try {
      // Add cache buster timestamp to ensure latest CSV is always fetched
      const response = await fetch('Paginas.csv?t=' + Date.now());
      if (response.ok) {
        const text = await response.text();
        csvSystems = parseCSV(text);
      }
    } catch (err) {
      console.log('No se pudo leer Paginas.csv vía fetch (normal al abrir como file://):', err);
    }

    const saved = localStorage.getItem('cerdo_accesos_systems');
    let localSystems = [];
    if (saved) {
      try {
        localSystems = JSON.parse(saved);
      } catch (e) {
        console.error('Error al leer localStorage:', e);
      }
    }

    // Base items: CSV if fetched, otherwise DEFAULT_SYSTEMS
    const baseItems = (csvSystems && csvSystems.length > 0) ? csvSystems : DEFAULT_SYSTEMS;

    // Merge map keyed by normalized URL to avoid duplicates and ensure new systems show up
    const systemMap = new Map();
    
    // 1. Always load base items (CSV or DEFAULT_SYSTEMS with all 6 systems)
    baseItems.forEach(sys => {
      if (sys.url) systemMap.set(sys.url.trim().toLowerCase(), sys);
    });

    // 2. Add any custom items user added via modal that aren't in baseItems
    localSystems.forEach(sys => {
      if (sys.isCustom && sys.url) {
        const key = sys.url.trim().toLowerCase();
        if (!systemMap.has(key)) {
          systemMap.set(key, sys);
        }
      }
    });

    systems = Array.from(systemMap.values());
    saveSystemsToStorage();
  }

  // Simple CSV parser (URL;Titulo;IMG)
  function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const result = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(';').map(p => p.trim());
      if (parts.length >= 2) {
        const url = parts[0];
        const title = parts[1];
        const imgVal = parts[2] || (i).toString();

        // Categorize automatically based on title, URL or optional 4th column
        const t = title.toLowerCase();
        const u = url.toLowerCase();
        let category = (parts.length >= 4 && parts[3]) ? parts[3] : 'Otros';

        if (category === 'Otros') {
          if (t.includes('agriness') || t.includes('trace') || t.includes('caja') || t.includes('condor') || t.includes('granja')) {
            category = 'Gestion';
          } else if (t.includes('caliper') || t.includes('venta') || t.includes('informe') || t.includes('apking') || u.includes('datastudio')) {
            category = 'Analitica';
          } else if (t.includes('ia') || t.includes('ai') || t.includes('pig counter')) {
            category = 'IA';
          }
        }

        result.push({
          id: 'sys-' + Date.now() + '-' + i,
          title: title,
          url: url,
          img: resolveImgPath(imgVal),
          category: category,
          description: `Acceso al sistema corporativo ${title}.`
        });
      }
    }
    return result;
  }

  function resolveImgPath(val) {
    if (!val) return 'IMG/1.png';
    const clean = val.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.includes('/')) return clean;
    if (!isNaN(clean)) return `IMG/${clean}.png`;
    const lower = clean.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.webp')) {
      return `IMG/${clean}`;
    }
    return `IMG/${clean}.png`;
  }

  function saveSystemsToStorage() {
    localStorage.setItem('cerdo_accesos_systems', JSON.stringify(systems));
  }

  /* --------------------------------------------------------------------------
     2. RENDER SYSTEMS GRID
     -------------------------------------------------------------------------- */
  function renderGrid() {
    systemsGrid.innerHTML = '';

    const filtered = systems.filter(sys => {
      const matchesCat = (currentCategory === 'all') || (sys.category === currentCategory);
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        sys.title.toLowerCase().includes(q) || 
        sys.url.toLowerCase().includes(q) || 
        (sys.description && sys.description.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });

    totalCountEl.textContent = systems.length;
    visibleCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');

      filtered.forEach(sys => {
        const card = document.createElement('div');
        card.className = 'system-card';

        const logoSrc = resolveImgPath(sys.img);
        const initials = getInitials(sys.title);

        card.innerHTML = `
          <div class="card-top">
            <div class="system-logo-wrap">
              <img src="${logoSrc}" alt="Logo ${sys.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="system-logo-fallback" style="display:none;">${initials}</div>
            </div>
            <div class="system-info">
              <h3 class="system-title" title="${escapeHtml(sys.title)}">${escapeHtml(sys.title)}</h3>
              <span class="system-url-badge" title="${escapeHtml(sys.url)}">${formatDomain(sys.url)}</span>
            </div>
          </div>
          <p class="system-description">${escapeHtml(sys.description || 'Sin descripción disponible.')}</p>
          <div class="card-actions">
            <a href="${escapeHtml(sys.url)}" target="_blank" rel="noopener noreferrer" class="launch-btn" title="Abrir ${escapeHtml(sys.title)}">
              <span>Abrir Sistema</span>
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
            <button class="card-opt-btn edit-btn" data-id="${sys.id}" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="card-opt-btn delete-btn" data-id="${sys.id}" title="Eliminar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        `;

        systemsGrid.appendChild(card);
      });
    }

    // Attach card event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openEditModal(id);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        deleteSystem(id);
      });
    });
  }

  function getInitials(str) {
    if (!str) return 'CS';
    const words = str.trim().split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return str.substring(0, 2).toUpperCase();
  }

  function formatDomain(urlStr) {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.replace('www.', '');
    } catch (e) {
      return urlStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* --------------------------------------------------------------------------
     3. SEARCH & CATEGORY FILTERS
     -------------------------------------------------------------------------- */
  function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderGrid();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderGrid();
    });

    // Category chips
    categoriesBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (!chip) return;

      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      currentCategory = chip.getAttribute('data-category');
      renderGrid();
    });

    // Reset filters from empty state
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      currentCategory = 'all';
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      document.querySelector('.category-chip[data-category="all"]').classList.add('active');
      renderGrid();
    });

    // Modal Triggers
    addSystemBtn.addEventListener('click', openAddModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    systemModal.addEventListener('click', (e) => {
      if (e.target === systemModal) closeModal();
    });

    // Form submission
    systemForm.addEventListener('submit', handleFormSubmit);

    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  /* --------------------------------------------------------------------------
     4. MODAL & SYSTEM ACTIONS
     -------------------------------------------------------------------------- */
  function openAddModal() {
    systemForm.reset();
    systemIdInput.value = '';
    modalTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Agregar Nuevo Acceso Directo';
    systemModal.classList.remove('hidden');
    inputTitle.focus();
  }

  function openEditModal(id) {
    const sys = systems.find(s => s.id === id);
    if (!sys) return;

    systemIdInput.value = sys.id;
    inputTitle.value = sys.title;
    inputUrl.value = sys.url;
    inputImg.value = sys.img;
    inputCategory.value = sys.category || 'Otros';
    inputDescription.value = sys.description || '';

    modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Acceso Directo';
    systemModal.classList.remove('hidden');
  }

  function closeModal() {
    systemModal.classList.add('hidden');
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const id = systemIdInput.value;
    const title = inputTitle.value.trim();
    const url = inputUrl.value.trim();
    const imgRaw = inputImg.value.trim();
    const category = inputCategory.value;
    const description = inputDescription.value.trim();

    if (!title || !url) {
      showToast('Por favor completa el título y la URL.', 'info');
      return;
    }

    if (id) {
      // Edit existing
      const index = systems.findIndex(s => s.id === id);
      if (index !== -1) {
        systems[index] = {
          id: id,
          title: title,
          url: url,
          img: resolveImgPath(imgRaw),
          category: category,
          description: description
        };
        showToast('Acceso actualizado correctamente.', 'success');
      }
    } else {
      // Add new
      const newSys = {
        id: 'sys-' + Date.now(),
        title: title,
        url: url,
        img: resolveImgPath(imgRaw),
        category: category,
        description: description,
        isCustom: true
      };
      systems.unshift(newSys);
      showToast('Nuevo acceso agregado con éxito.', 'success');
    }

    saveSystemsToStorage();
    renderGrid();
    closeModal();
  }

  function deleteSystem(id) {
    const sys = systems.find(s => s.id === id);
    if (!sys) return;

    if (confirm(`¿Estás seguro de eliminar el acceso a "${sys.title}"?`)) {
      systems = systems.filter(s => s.id !== id);
      saveSystemsToStorage();
      renderGrid();
      showToast(`Acceso a "${sys.title}" eliminado.`, 'info');
    }
  }

  /* --------------------------------------------------------------------------
     5. UTILITIES (CLOCK, THEME & TOAST)
     -------------------------------------------------------------------------- */
  function startClock() {
    function update() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      clockTime.textContent = `${hours}:${mins}`;

      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      clockDate.textContent = now.toLocaleDateString('es-ES', options);
    }
    update();
    setInterval(update, 1000);
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('cerdo_accesos_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cerdo_accesos_theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
      themeToggleBtn.title = 'Cambiar a Modo Claro';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeToggleBtn.title = 'Cambiar a Modo Oscuro';
    }
  }

  function showToast(msg, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${msg}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Start app
  init();
});
