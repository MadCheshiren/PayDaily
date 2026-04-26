// ===================== GLOBAL STATE =====================
let salesChartInstance   = null;
let reportsChartInstance = null;
let catChartInstance     = null;
let activeViewBeforeSettings = 'admin';

// Shared transaction log — POS saves here, dashboard reads from here
let allTransactions = [];

// ===================== VIEW ROUTING =====================
function showView(viewName) {
    ['home','login','admin','pos','settings','sitemap'].forEach(v => {
        const el = document.getElementById(v + '-view');
        if (el) el.style.display = 'none';
    });
    document.body.classList.toggle('home-active', viewName === 'home');
    const target = document.getElementById(viewName + '-view');
    if (!target) return;
    const flexViews = ['home','login','admin','pos','settings'];
    target.style.display = flexViews.includes(viewName) ? 'flex' : 'block';
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ===================== LOGIN =====================
const credentials = {
    manager: { username: 'manager', password: 'manager123' },
    staff:   { username: 'staff',   password: 'staff123'   }
};
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const roleRadios    = document.querySelectorAll('input[name="role"]');
const loginForm     = document.getElementById('loginForm');
const submitBtn     = document.getElementById('submitBtn');
const errorMsg      = document.getElementById('errorMessage');
const successMsg    = document.getElementById('successMessage');

function autoFillCredentials() {
    const role = document.querySelector('input[name="role"]:checked').value;
    usernameInput.value = credentials[role].username;
    passwordInput.value = credentials[role].password;
    if (errorMsg)  errorMsg.style.display  = 'none';
    if (successMsg) successMsg.style.display = 'none';
}
autoFillCredentials();
roleRadios.forEach(r => r.addEventListener('change', autoFillCredentials));

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const role = document.querySelector('input[name="role"]:checked').value;
    if (usernameInput.value === credentials[role].username && passwordInput.value === credentials[role].password) {
        if (errorMsg)   errorMsg.style.display   = 'none';
        if (successMsg) successMsg.style.display = 'block';
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In';
            if (successMsg) successMsg.style.display = 'none';
            if (role === 'manager') {
                document.getElementById('admin-user-name').innerText = 'Store Manager';
                document.getElementById('admin-user-role').innerText = 'Manager';
                sessionStorage.setItem('posRole', 'manager');
                showView('admin');
                switchAdminTab('dashboard');
            } else {
                document.getElementById('pos-user-name').innerText = 'Jane Doe (Staff)';
                sessionStorage.setItem('posRole', 'staff');
                showView('pos');
            }
        }, 800);
    } else {
        if (successMsg) successMsg.style.display = 'none';
        if (errorMsg)   errorMsg.style.display   = 'block';
        loginForm.style.transform = 'translateX(-10px)';
        setTimeout(() => loginForm.style.transform = 'translateX(10px)',  100);
        setTimeout(() => loginForm.style.transform = 'translateX(-10px)', 200);
        setTimeout(() => loginForm.style.transform = 'translateX(0)',     300);
    }
});

function handleLogout() {
    sessionStorage.removeItem('posRole');
    showView('login');
    autoFillCredentials();
}

// ===================== ADMIN TABS =====================
function switchAdminTab(tabName) {
    ['dashboard','inventory','transactions','reports','users','clearance'].forEach(t => {
        const el = document.getElementById(t + '-content');
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(tabName + '-content');
    if (target) target.style.display = 'block';
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    const navEl = document.getElementById('nav-' + tabName);
    if (navEl) navEl.classList.add('active');
    if (tabName === 'dashboard')    { refreshDashboard(); initSalesChart('week'); }
    if (tabName === 'transactions') { renderTransactionsTable(); }
    if (tabName === 'reports')      { initReportsChart('month'); initCategoryChart(); }
    if (tabName === 'clearance')    { forceClearanceScan(); }
}

// ===================== SETTINGS =====================
function openSettings() {
    activeViewBeforeSettings = document.getElementById('pos-view').style.display === 'flex' ? 'pos' : 'admin';
    showView('settings');
}
function closeSettings() { showView(activeViewBeforeSettings); }

// ===================== DARK MODE =====================
function toggleDarkMode(forceState) {
    const isDark = forceState !== undefined ? forceState : !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', isDark);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;
    const period = document.getElementById('salesPeriodSelect')?.value || 'week';
    if (salesChartInstance)   initSalesChart(period);
    if (reportsChartInstance) initReportsChart(document.getElementById('reportsPeriodSelect')?.value || 'month');
}

// ===================== DASHBOARD REFRESH =====================
function refreshDashboard() {
    const today = new Date().toDateString();
    const todaySales = allTransactions
        .filter(t => t.status !== 'Refunded' && new Date(t.ts).toDateString() === today)
        .reduce((sum, t) => sum + t.amount, 0);
    const todayCount = allTransactions
        .filter(t => t.status !== 'Refunded' && new Date(t.ts).toDateString() === today).length;

    const salesEl = document.querySelector('#dashboard-content .kpi-card.blue .kpi-value');
    const countEl = document.querySelector('#dashboard-content .kpi-card.green .kpi-value');
    if (salesEl) salesEl.textContent = '₱' + todaySales.toLocaleString('en-PH',{minimumFractionDigits:2});
    if (countEl) countEl.textContent = todayCount;

    const tbody = document.querySelector('#dashboard-content .card:last-child tbody');
    if (tbody) {
        tbody.innerHTML = '';
        [...allTransactions].sort((a,b) => b.ts - a.ts).slice(0,5).forEach(t => {
            const status = t.status || 'Completed';
            const pill   = status === 'Refunded' ? 'status-failed' : 'status-completed';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:500;color:var(--primary-blue);cursor:pointer;text-decoration:underline;" onclick="showReceiptFromHistory('${t.id}')">#${t.id}</td>
                <td>${t.cashier}</td>
                <td style="color:var(--text-muted);">${formatTxTime(t.ts)}</td>
                <td style="font-weight:600;">₱${t.amount.toFixed(2)}</td>
                <td><span class="status-pill ${pill}">${status}</span></td>`;
            tbody.appendChild(tr);
        });
    }

    updateBestSellers();
}

function updateBestSellers() {
    const list = document.querySelector('#dashboard-content .product-list');
    if(!list) return;
    
    const today = new Date().toDateString();
    let productSales = {};
    allTransactions.filter(t => t.status !== 'Refunded' && new Date(t.ts).toDateString() === today).forEach(t => {
        const itemsArr = t.items.split(',');
        itemsArr.forEach(iStr => {
            const match = iStr.trim().match(/(.+?)(?: x(\d+))?$/);
            if(match) {
                const name = match[1].trim();
                const qty = parseInt(match[2] || 1);
                // Check if products array exists to get icon and correct price mapping using fuzzy match
                const p = typeof products !== 'undefined' ? products.find(prod => 
                    prod.name === name || 
                    prod.name.toLowerCase().includes(name.toLowerCase()) || 
                    name.toLowerCase().includes(prod.name.toLowerCase())
                ) : null;
                const price = p ? p.price : 0;
                const icon = p ? p.icon : 'fa-box';
                const displayName = p ? p.name : name; // Use actual full product name if found
                
                if(!productSales[displayName]) productSales[displayName] = { name: displayName, qty:0, rev:0, icon };
                productSales[displayName].qty += qty;
                productSales[displayName].rev += (qty * price);
            }
        });
    });
    
    const sorted = Object.values(productSales).sort((a,b) => b.qty - a.qty).slice(0,3);
    if(sorted.length > 0) {
        let bestSellersHtml = '';
        sorted.forEach(p => {
            bestSellersHtml += `
                <div class="product-item">
                    <div class="product-icon"><i class="fa-solid ${p.icon}"></i></div>
                    <div class="product-details"><div class="product-name">${p.name}</div><div class="product-sales">${p.qty} sold today</div></div>
                    <div class="product-revenue">₱${p.rev.toFixed(2)}</div>
                </div>
            `;
        });
        list.innerHTML = bestSellersHtml;
    } else {
        list.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:1rem;">No sales today yet.</div>`;
    }
}

function refreshReports() {
    const period = document.getElementById('reportsPeriodSelect')?.value || 'month';
    let rev = 0; let txn = 0; let catSales = {}; let prodSales = {};
    const now = new Date();
    const todayStr = now.toDateString();
    
    reportsDataSets.today.data = [0,0,0,0,0,0];
    reportsDataSets.week.data = [0,0,0,0,0,0,0];
    reportsDataSets.month.data = new Array(12).fill(0);

    allTransactions.forEach(t => {
        if (t.status === 'Refunded') return;
        const txDate = new Date(t.ts);
        const y = txDate.getFullYear(); const m = txDate.getMonth();
        const d = txDate.getDay(); const hr = txDate.getHours();
        const dateStr = txDate.toDateString();
        
        let include = false;
        
        if (period === 'today' && dateStr === todayStr) {
            include = true;
            let b = 0; if(hr<9) b=0; else if(hr<12) b=1; else if(hr<15) b=2; else if(hr<18) b=3; else if(hr<21) b=4; else b=5;
            reportsDataSets.today.data[b] += t.amount;
        } else if (period === 'week') {
            const daysAgo = Math.floor((now - txDate) / (1000*60*60*24));
            // include if within last 7 days
            if (daysAgo >= 0 && daysAgo < 7) {
                include = true;
                let dayIdx = d === 0 ? 6 : d - 1; // Mon=0 .. Sun=6
                reportsDataSets.week.data[dayIdx] += t.amount;
            }
        } else if (period === 'month' && y === now.getFullYear() && m === now.getMonth()) {
            include = true;
        } else if (period === 'lastmonth' && y === now.getFullYear() && m === (now.getMonth()-1)) {
            include = true;
        } else if (period === 'threeMonths' && y === now.getFullYear() && m >= (now.getMonth()-3)) {
            include = true;
        }

        if (y === now.getFullYear()) reportsDataSets.month.data[m] += t.amount;

        if (include) {
            rev += t.amount;
            txn++;
            if (t.items && t.items !== "Store Item(s)") {
                const itemsArr = t.items.split(',');
                itemsArr.forEach(iStr => {
                    const match = iStr.trim().match(/(.+?)(?: x(\d+))?$/);
                    if(match) {
                        const name = match[1].trim(); const qty = parseInt(match[2] || 1);
                        const p = typeof products !== 'undefined' ? products.find(prod => 
                            prod.name === name || prod.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(prod.name.toLowerCase())
                        ) : null;
                        const price = p ? p.price : 0; const cat = p ? p.cat : 'Other';
                        const displayName = p ? p.name : name; 
                        
                        if(!prodSales[displayName]) prodSales[displayName] = { name: displayName, cat: cat, qty:0, rev:0 };
                        prodSales[displayName].qty += qty;
                        prodSales[displayName].rev += (qty * price);
                        if(!catSales[cat]) catSales[cat] = 0;
                        catSales[cat] += (qty * price);
                    }
                });
            } else if (t.items === "Store Item(s)") {
                if(!catSales['Misc']) catSales['Misc'] = 0; catSales['Misc'] += t.amount;
            }
        }
    });

    const revKPI = document.querySelector('#reports-content .kpi-card.blue .kpi-value');
    const txKPI = document.querySelector('#reports-content .kpi-card.green .kpi-value');
    const avgKPI = document.querySelector('#reports-content .kpi-card.purple .kpi-value');
    const catKPI = document.querySelector('#reports-content .kpi-card.orange .kpi-value');

    if(revKPI) revKPI.textContent = '₱' + rev.toLocaleString('en-PH', {minimumFractionDigits:0});
    if(txKPI) txKPI.textContent = txn.toLocaleString('en-PH');
    if(avgKPI) avgKPI.textContent = '₱' + (txn > 0 ? (rev/txn) : 0).toLocaleString('en-PH', {minimumFractionDigits:2});
    
    let topCat = 'None'; let maxCatVal = -1;
    for(let c in catSales) { if(catSales[c] > maxCatVal) { maxCatVal = catSales[c]; topCat = c; } }
    if(catKPI) catKPI.innerHTML = topCat.replace(' ', '<br>');

    initReportsChart(period);

    if(catChartInstance) {
        catChartInstance.data.labels = Object.keys(catSales).length === 0 ? ['No Data'] : Object.keys(catSales);
        catChartInstance.data.datasets[0].data = Object.keys(catSales).length === 0 ? [1] : Object.values(catSales);
        catChartInstance.data.datasets[0].backgroundColor = Object.keys(catSales).length === 0 ? ['#E2E8F0'] : ['#0082E6','#10B981','#8B5CF6','#F59E0B'];
        catChartInstance.update();
    }
    
    const tbody = document.getElementById('reportsBody');
    if(tbody) {
        tbody.innerHTML = '';
        Object.values(prodSales).sort((a,b) => b.rev - a.rev).forEach(p => {
             let perf = 'Good'; let pill = 'status-completed'; let rc = '';
             if (period === 'today' || period === 'week') {
                 if (p.qty >= 3) { perf = 'Top Seller'; pill = 'status-instock'; rc = 'color:var(--success-green);'; }
                 else { perf = 'Average'; pill = 'status-pending'; rc = 'color:var(--text-muted);'; }
             } else {
                 if (p.qty >= 10) { perf = 'Top Seller'; pill = 'status-instock'; rc = 'color:var(--success-green);'; }
                 else if (p.qty <= 2) { perf = 'Slow Mover'; pill = 'status-lowstock'; rc = 'color:var(--danger-red);'; }
             }
             const tr = document.createElement('tr');
             tr.innerHTML = `<td style="font-weight:500;">${p.name}</td><td style="color:var(--text-muted);">${p.cat}</td><td>${p.qty}</td><td style="font-weight:600;${rc}">₱${p.rev.toLocaleString('en-PH', {minimumFractionDigits:0})}</td><td><span class="status-pill ${pill}">${perf}</span></td>`;
             tbody.appendChild(tr);
        });
        if (Object.keys(prodSales).length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">No product data for ${period}.</td></tr>`;
        }
    }
}

function updateDashboardAndInventoryOnSale(saleCart, totalAmount) {
    // 1. Inventory Update
    const rows = document.querySelectorAll('#inventoryBody tr');
    saleCart.forEach(item => {
        rows.forEach(row => {
            const nameEl = row.querySelector('.product-name');
            if (nameEl && nameEl.textContent.trim() === item.name) {
                const stockTextEl = row.querySelector('.stock-text');
                if (stockTextEl) {
                    let currentStock = parseInt(stockTextEl.textContent.replace(' units', '').trim());
                    currentStock -= item.qty;
                    if (currentStock < 0) currentStock = 0;
                    stockTextEl.textContent = currentStock + ' units';
                    let pClass='high', width=80, sPill='status-instock', sText='In Stock';
                    if (currentStock <= 0) { pClass='low'; width=0; sPill='status-outstock'; sText='Out of Stock'; }
                    else if (currentStock < 15) { pClass='medium'; width=30; sPill='status-lowstock'; sText='Low Stock'; }
                    else { width = Math.min(100, currentStock); }
                    row.dataset.status = sText;
                    const bar = row.querySelector('.stock-progress-bar');
                    if(bar) { bar.className = 'stock-progress-bar '+pClass; bar.style.width = width+'%'; }
                    const pill = row.querySelector('.status-pill');
                    if(pill) { pill.className = 'status-pill '+sPill; pill.textContent = sText; }
                }
            }
        });
    });

    // Refresh KPI counts and dynamic notifications on Inventory
    let lowCount = 0, outCount = 0;
    const dynamicNotifs = document.getElementById('dynamic-notifications');
    let notifsHtml = '';

    document.querySelectorAll('#inventoryBody tr').forEach(r => {
        const status = r.dataset.status;
        const name = r.querySelector('.product-name')?.textContent || '';
        let stockText = r.querySelector('.stock-text')?.textContent || '';
        
        // Use just the digits for presentation
        const stockVal = stockText.replace(/[^0-9]/g, '');

        if(status === 'Low Stock' || status === 'Out of Stock') {
            if(status === 'Low Stock') lowCount++;
            if(status === 'Out of Stock') outCount++;
            
            const icon = status === 'Low Stock' ? '<i class="fa-solid fa-triangle-exclamation" style="color:#F59E0B;"></i>' : '<i class="fa-solid fa-circle-xmark" style="color:#EF4444;"></i>';
            const subtitle = status === 'Low Stock' ? `Only ${stockVal} units left` : 'Restock needed';
            
            notifsHtml += `
                <div class="notif-item unread" onclick="switchAdminTab('inventory');document.getElementById('invStatusFilter').value='${status}';filterInventory();toggleNotifications();">
                    ${icon}
                    <div><strong>${status}: ${name}</strong><br><span>${subtitle}</span></div>
                </div>
            `;
        }
    });
    
    if (dynamicNotifs) dynamicNotifs.innerHTML = notifsHtml;

    const kpiLow = document.querySelector('#inventory-content .kpi-card.orange .kpi-value');
    const kpiOut = document.querySelector('#inventory-content .kpi-card.red .kpi-value');
    if(kpiLow) kpiLow.textContent = lowCount;
    if(kpiOut) kpiOut.textContent = outCount;
    const dashAlert = document.querySelector('#dashboard-content .kpi-card.orange .kpi-value');
    if(dashAlert) dashAlert.innerHTML = (lowCount + outCount) + ' <span style="font-size:1rem;color:var(--text-muted);font-weight:500;">Items</span>';

    // Refresh KPIs and counts  
    // Daily/Weekly charts would ideally use dynamic dates, falling back to dummy values for past week
    refreshDashboard();
    refreshReports();
    renderTransactionsTable();
}

function formatTxTime(ts) {
    const now  = new Date();
    const date = new Date(ts);
    const time = date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return date.toDateString() === now.toDateString() ? 'Today, ' + time : date.toLocaleDateString() + ', ' + time;
}

// ===================== CHARTS =====================
const salesDataSets = {
    week:  { labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data:[1200,980,1450,1100,1800,2400,2845] },
    month: { labels:['Week 1','Week 2','Week 3','Week 4'],       data:[8400,9200,11500,14250] }
};

function changeSalesPeriod(val) { initSalesChart(val); }

function initSalesChart(period) {
    if (salesChartInstance) salesChartInstance.destroy();
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    const ds = JSON.parse(JSON.stringify(salesDataSets[period] || salesDataSets.week));
    // Inject real POS sales for today into last data point for week view
    if (period === 'week') {
        const today = new Date().toDateString();
        const todayReal = allTransactions
            .filter(t => t.status !== 'Refunded' && new Date(t.ts).toDateString() === today)
            .reduce((s,t) => s + t.amount, 0);
        ds.data[ds.data.length-1] = Math.max(todayReal, ds.data[ds.data.length-1]);
    }
    const gridColor = document.body.classList.contains('dark-mode') ? 'rgba(148,163,184,0.1)' : '#F1F5F9';
    let grad = ctx.getContext('2d').createLinearGradient(0,0,0,300);
    grad.addColorStop(0,'rgba(0,130,230,0.4)');
    grad.addColorStop(1,'rgba(0,130,230,0.0)');
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: ds.labels, datasets: [{
            label:'Sales (₱)', data: ds.data,
            borderColor:'#0082E6', backgroundColor:grad, borderWidth:3,
            pointBackgroundColor:'#fff', pointBorderColor:'#0082E6',
            pointBorderWidth:2, pointRadius:5, pointHoverRadius:7,
            fill:true, tension:0.4
        }]},
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{display:false},
                tooltip:{ backgroundColor:'#0F172A', padding:12,
                    callbacks:{ label: c => '₱' + c.parsed.y.toLocaleString() } } },
            scales:{
                y:{ beginAtZero:true, border:{display:false}, grid:{color:gridColor},
                    ticks:{ callback: v => '₱'+v.toLocaleString() } },
                x:{ border:{display:false}, grid:{display:false} }
            }
        }
    });
}

const reportsDataSets = {
    today:       { labels:['6AM-9AM','9AM-12PM','12PM-3PM','3PM-6PM','6PM-9PM','9PM-12AM'], data:[0,0,0,0,0,0] },
    week:        { labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data:[0,0,0,0,0,0,0] },
    month:       { labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], data:[32000,28500,41000,38000,45000,52000,49000,54000,46000,48250,0,0] },
    lastmonth:   { labels:['Week 1','Week 2','Week 3','Week 4'], data:[9800,10200,11000,9800] },
    threeMonths: { labels:['Last Month','2 Months Ago','3 Months Ago'],       data:[54000,46000,48250] }
};

function changeReportsPeriod(val) { refreshReports(); }

function initReportsChart(period) {
    if (reportsChartInstance) reportsChartInstance.destroy();
    const ctx = document.getElementById('reportsChart');
    if (!ctx) return;
    const ds = reportsDataSets[period] || reportsDataSets.month;
    const gridColor = document.body.classList.contains('dark-mode') ? 'rgba(148,163,184,0.1)' : '#F1F5F9';
    reportsChartInstance = new Chart(ctx, {
        type:'bar',
        data:{ labels:ds.labels, datasets:[{ label:'Revenue (₱)', data:ds.data, backgroundColor:'rgba(0,130,230,0.8)', borderRadius:6 }]},
        options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c => '₱'+c.parsed.y.toLocaleString() } } },
            scales:{
                y:{ beginAtZero:true, border:{display:false}, grid:{color:gridColor}, ticks:{ callback: v => '₱'+v.toLocaleString() } },
                x:{ border:{display:false}, grid:{display:false} }
            }
        }
    });
}

function initCategoryChart() {
    if (catChartInstance) catChartInstance.destroy();
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    catChartInstance = new Chart(ctx, {
        type:'doughnut',
        data:{ labels:['School Supplies','Bags','Perfumes','Hardware'],
            datasets:[{ data:[45,25,22,8], backgroundColor:['#0082E6','#10B981','#8B5CF6','#F59E0B'], borderWidth:0 }] },
        options:{ responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'bottom', labels:{ padding:12, font:{size:12} } } } }
    });
}

// ===================== NOTIFICATIONS =====================
function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}
function clearNotifications() {
    const panel = document.getElementById('notifPanel');
    if (panel) { panel.querySelectorAll('.notif-item').forEach(i => i.classList.remove('unread')); panel.style.display = 'none'; }
    const badge = document.querySelector('.notification-badge');
    if (badge) badge.style.display = 'none';
    showToast('All notifications cleared');
}

// ===================== DASHBOARD SEARCH =====================
const searchIndex = [
    { label:'Dashboard',          action:() => switchAdminTab('dashboard') },
    { label:'Inventory',          action:() => switchAdminTab('inventory') },
    { label:'Transactions',       action:() => switchAdminTab('transactions') },
    { label:'Sales Reports',      action:() => switchAdminTab('reports') },
    { label:'User Management',    action:() => switchAdminTab('users') },
    { label:'Low Stock Items',    action:() => { switchAdminTab('inventory'); document.getElementById('invStatusFilter').value='Low Stock'; filterInventory(); } },
    { label:'Out of Stock Items', action:() => { switchAdminTab('inventory'); document.getElementById('invStatusFilter').value='Out of Stock'; filterInventory(); } },
    { label:'Add Product',        action:() => { switchAdminTab('inventory'); openAddProductModal(); } },
    { label:'Add User',           action:() => { switchAdminTab('users'); openAddUserModal(); } },
    { label:'Settings',           action:() => openSettings() },
    { label:'Site Map',           action:() => showView('sitemap') },
];

function handleDashSearch(q) {
    const dd = document.getElementById('searchDropdown');
    if (!dd) return;
    if (!q.trim()) { dd.style.display='none'; return; }
    const results = searchIndex.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));
    if (!results.length) { dd.style.display='none'; return; }
    dd.innerHTML = results.map(r =>
        `<div class="search-result-item" onclick="(${r.action.toString()})();document.getElementById('searchDropdown').style.display='none';document.getElementById('dashSearch').value='';">
            <i class="fa-solid fa-magnifying-glass" style="color:var(--text-muted);font-size:0.8rem;margin-right:6px;"></i>${r.label}
        </div>`
    ).join('');
    dd.style.display = 'block';
}

document.addEventListener('click', function(e) {
    const panel = document.getElementById('notifPanel');
    const btn   = document.getElementById('notifBtn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) panel.style.display = 'none';
    const dd = document.getElementById('searchDropdown');
    if (dd && !dd.contains(e.target)) dd.style.display = 'none';
});

// ===================== INVENTORY FILTER =====================
function filterInventory() {
    const search = (document.getElementById('invSearch')?.value || '').toLowerCase();
    const cat    = document.getElementById('invCatFilter')?.value  || '';
    const status = document.getElementById('invStatusFilter')?.value || '';
    document.querySelectorAll('#inventoryBody tr').forEach(row => {
        const name  = row.querySelector('.product-name')?.textContent.toLowerCase() || '';
        const rCat  = row.dataset.cat    || '';
        const rStat = row.dataset.status || '';
        row.style.display = ((!search||name.includes(search)) && (!cat||rCat===cat) && (!status||rStat===status)) ? '' : 'none';
    });
}

// ===================== INVENTORY EDIT MODAL =====================
function openEditModal(btn) {
    const row   = btn.closest('tr');
    const tds   = row.querySelectorAll('td');
    document.getElementById('editProdName').value  = row.querySelector('.product-name').textContent.trim();
    document.getElementById('editProdCat').value   = row.dataset.cat || tds[1].textContent.trim();
    document.getElementById('editProdPrice').value = tds[2].textContent.replace('₱','').trim();
    document.getElementById('editProdStock').value = row.querySelector('.stock-text').textContent.replace(' units','').trim();
    document.getElementById('editProductModal').style.display = 'flex';
    document.getElementById('editProductModal')._targetRow = row;
}
function closeEditModal() { document.getElementById('editProductModal').style.display = 'none'; }

document.getElementById('editProductForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const row   = document.getElementById('editProductModal')._targetRow;
    const name  = document.getElementById('editProdName').value;
    const cat   = document.getElementById('editProdCat').value;
    const price = parseFloat(document.getElementById('editProdPrice').value);
    const stock = parseInt(document.getElementById('editProdStock').value);
    let pClass='high',width=80,sPill='status-instock',sText='In Stock';
    if (stock<=0) { pClass='low'; width=0; sPill='status-outstock'; sText='Out of Stock'; }
    else if (stock<15) { pClass='medium'; width=30; sPill='status-lowstock'; sText='Low Stock'; }
    row.dataset.status = sText; row.dataset.cat = cat;
    row.querySelector('.product-name').textContent = name;
    const tds = row.querySelectorAll('td');
    tds[1].textContent = cat; tds[1].style.color='var(--text-muted)';
    tds[2].textContent = '₱'+price.toFixed(2); tds[2].style.fontWeight='600';
    row.querySelector('.stock-progress-bar').className = 'stock-progress-bar '+pClass;
    row.querySelector('.stock-progress-bar').style.width = width+'%';
    row.querySelector('.stock-text').textContent = stock+' units';
    const pill = row.querySelector('.status-pill');
    pill.className = 'status-pill '+sPill; pill.textContent = sText;
    closeEditModal();
    showToast('Product updated!');
});

// ===================== TRANSACTIONS TABLE =====================
function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    [...allTransactions].sort((a,b) => b.ts - a.ts).forEach(t => {
        const status = t.status || 'Completed';
        const pill   = status === 'Refunded' ? 'status-failed' : 'status-completed';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:500;color:var(--primary-blue);cursor:pointer;text-decoration:underline;" onclick="showReceiptFromHistory('${t.id}')">#${t.id}</td>
            <td>${t.cashier}</td>
            <td style="color:var(--text-muted);">${formatTxTime(t.ts)}</td>
            <td style="color:var(--text-muted);">${t.items}</td>
            <td style="font-weight:600;">₱${t.amount.toFixed(2)}</td>
            <td><span class="status-pill ${pill}">${status}</span></td>`;
        tbody.appendChild(tr);
    });
}

function showReceiptFromHistory(txnId) {
    const t = allTransactions.find(x => x.id === txnId);
    if(!t) return;
    
    // Parse cart data if mock transaction
    let receiptCart = t.cart;
    if(!receiptCart) {
        receiptCart = [];
        const itemsArr = t.items.split(',');
        itemsArr.forEach(iStr => {
            const match = iStr.trim().match(/(.+?)(?: x(\d+))?$/);
            if(match) {
                const name = match[1].trim();
                const qty = parseInt(match[2] || 1);
                const p = typeof products !== 'undefined' ? products.find(prod => 
                    prod.name === name || prod.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(prod.name.toLowerCase())
                ) : null;
                const price = p ? p.price : 0;
                receiptCart.push({ name: p ? p.name : name, qty: qty, price: price });
            }
        });
    }

    const dateObj = new Date(t.ts);
    document.getElementById('receipt-date').innerText = dateObj.toLocaleDateString();
    document.getElementById('receipt-time').innerText = dateObj.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    document.getElementById('receipt-id').innerText = t.id;
    document.getElementById('receipt-cashier').innerText = t.cashier;

    const tbody = document.getElementById('receipt-items-body');
    tbody.innerHTML = '';
    let calcSub = 0;
    receiptCart.forEach(item => {
        const itemTotal = item.price * item.qty;
        calcSub += itemTotal;
        const tr = document.createElement('tr');
        tr.innerHTML=`<td>${item.name}</td><td style="text-align:center;">${item.qty}</td><td style="text-align:right;">₱${itemTotal.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });

    const isMock = !t.cart;
    const total = isMock ? t.amount : (calcSub + (calcSub * 0.12));
    
    document.getElementById('receipt-subtotal').innerText = t.sub !== undefined ? `₱${t.sub.toFixed(2)}` : `₱${calcSub.toFixed(2)}`;
    document.getElementById('receipt-tax').innerText = t.tax !== undefined ? `₱${t.tax.toFixed(2)}` : `₱${(isMock ? (total/1.12)*0.12 : calcSub*0.12).toFixed(2)}`;
    document.getElementById('receipt-total').innerText = `₱${total.toFixed(2)}`;
    document.getElementById('receipt-cash').innerText = t.cash !== undefined ? `₱${t.cash.toFixed(2)}` : `₱${total.toFixed(2)}`;
    document.getElementById('receipt-change').innerText = t.change !== undefined ? `₱${t.change.toFixed(2)}` : `₱0.00`;

    const btn = document.querySelector('#receipt-modal .btn-outline');
    const oldHtml = btn.innerHTML;
    const oldOnclick = btn.getAttribute('onclick');
    btn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Close';
    btn.onclick = function() {
        document.getElementById('receipt-modal').style.display = 'none';
        btn.innerHTML = oldHtml;
        btn.setAttribute('onclick', oldOnclick);
    };

    document.getElementById('receipt-modal').style.display = 'flex';
}

// ===================== EXPORT CSV =====================
function exportTransactionsCSV() {
    const rows = [['Order ID','Cashier','Date/Time','Items','Amount','Status']];
    allTransactions.forEach(t => rows.push(['#'+t.id, t.cashier, formatTxTime(t.ts), '"'+t.items+'"', '₱'+t.amount.toFixed(2), t.status||'Completed']));
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href:url, download:'PayDaily_Transactions_'+new Date().toISOString().slice(0,10)+'.csv' });
    a.click();
    URL.revokeObjectURL(url);
    showToast('Transactions exported as CSV!');
}

function exportReportCSV() {
    const tbody = document.querySelector('#reports-content tbody');
    if(!tbody) return;
    
    const rows = [['Product', 'Category', 'Units Sold', 'Revenue', 'Performance']];
    
    tbody.querySelectorAll('tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if(tds.length >= 5) {
            rows.push([
                '"' + tds[0].textContent.trim().replace(/"/g, '""') + '"',
                '"' + tds[1].textContent.trim().replace(/"/g, '""') + '"',
                tds[2].textContent.trim(),
                '"' + tds[3].textContent.trim().replace(/"/g, '""') + '"',
                '"' + tds[4].textContent.trim().replace(/"/g, '""') + '"'
            ]);
        }
    });
    
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { 
        href: url, 
        download: 'PayDaily_SalesReport_' + new Date().toISOString().slice(0,10) + '.csv' 
    });
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sales Report exported as CSV!');
}

// ===================== POS PRODUCTS =====================
const products = [
    { id:1,  name:'Ballpen Set (12pcs)',    cat:'School Supplies',     price:15.00,  icon:'fa-pen' },
    { id:2,  name:'Notebook A4 (80 lvs)',   cat:'School Supplies',     price:25.00,  icon:'fa-book' },
    { id:3,  name:'Ruler 30cm',             cat:'School Supplies',     price:12.00,  icon:'fa-ruler' },
    { id:4,  name:'Scissors (Medium)',      cat:'School Supplies',     price:35.00,  icon:'fa-scissors' },
    { id:5,  name:'Pencil HB (12pcs)',      cat:'School Supplies',     price:18.00,  icon:'fa-pencil' },
    { id:6,  name:'Crayon Set (16 colors)', cat:'School Supplies',     price:45.00,  icon:'fa-palette' },
    { id:7,  name:'School Backpack (Blue)', cat:'Bags',                price:450.00, icon:'fa-bag-shopping' },
    { id:8,  name:'Sling Bag (Black)',      cat:'Bags',                price:320.00, icon:'fa-briefcase' },
    { id:9,  name:'Pencil Case',            cat:'Bags',                price:85.00,  icon:'fa-box' },
    { id:10, name:'Cologne Spray 100ml',    cat:'Perfumes & Colognes', price:150.00, icon:'fa-spray-can' },
    { id:11, name:'Pocket Perfume 30ml',    cat:'Perfumes & Colognes', price:95.00,  icon:'fa-bottle-droplet' },
    { id:12, name:'Flat Head Screwdriver',  cat:'Hardware',            price:55.00,  icon:'fa-screwdriver-wrench' },
    { id:13, name:'Extension Wire 3m',      cat:'Hardware',            price:185.00, icon:'fa-plug' },
    { id:14, name:'Electrical Tape',        cat:'Hardware',            price:25.00,  icon:'fa-circle' },
];

let cart = [], currentCategory = 'All Items', searchQuery = '';

function filterProducts(catName, el) {
    currentCategory = catName;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    renderProducts();
}
function searchProducts(q) { searchQuery = q.toLowerCase(); renderProducts(); }
function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = '';
    let filtered = products;
    if (currentCategory === 'Clearance') {
        filtered = products.filter(p => p.clearance);
    } else if (currentCategory !== 'All Items') {
        filtered = filtered.filter(p => p.cat === currentCategory);
    }
    if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery) || p.cat.toLowerCase().includes(searchQuery));
    if (!filtered.length) { grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);"><i class="fa-solid fa-box-open" style="font-size:2rem;display:block;margin-bottom:1rem;opacity:0.5;"></i>No products found.</div>`; return; }
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'pos-product-card';
        card.innerHTML = `
            <div class="pos-product-image">
                ${p.image ? '<img src="' + p.image + '" alt="' + p.name + '" style="max-width:100%; max-height:100%; border-radius:8px; object-fit:contain;">' : '<i class="fa-solid ' + p.icon + '"></i>'}
            </div>
            <div class="pos-product-name">${p.name}</div>
            <div class="pos-product-cat">${p.cat}</div>
            <div class="pos-product-footer">
                <div class="pos-product-price">
                    ${p.clearance ? `<span style="text-decoration:line-through; font-size:0.8rem; color:var(--text-muted);">₱${p.originalPrice.toFixed(2)}</span> <span style="color:#E11D48; font-weight:700;">₱${p.price.toFixed(2)}</span>` : `₱${p.price.toFixed(2)}`}
                </div>
                <button class="pos-add-btn" onclick="addToCart(${p.id})"><i class="fa-solid fa-plus"></i></button>
            </div>`;
        grid.appendChild(card);
    });
}

function getProductStock(name) {
    let stock = 0;
    document.querySelectorAll('#inventoryBody tr').forEach(row => {
        const nameEl = row.querySelector('.product-name');
        if (nameEl && nameEl.textContent.trim() === name) {
            const stockTextEl = row.querySelector('.stock-text');
            if (stockTextEl) {
                stock = parseInt(stockTextEl.textContent.replace(/[^0-9]/g, '').trim());
            }
        }
    });
    return stock;
}

function addToCart(id) {
    const p=products.find(x=>x.id===id), ex=cart.find(x=>x.id===id);
    const reqQty = (ex ? ex.qty : 0) + 1;
    const currentStock = getProductStock(p.name);
    if (reqQty > currentStock) {
        showToast(`Warning: Cannot add! Only ${currentStock} units of ${p.name} left in stock.`);
        return;
    }
    if(ex) ex.qty+=1; else cart.push({...p,qty:1});
    updateCartUI();
}
function changeQty(id,delta) {
    const p=products.find(x=>x.id===id);
    const i=cart.find(x=>x.id===id);
    if(i){
        const reqQty = i.qty + delta;
        if (delta > 0) {
            const currentStock = getProductStock(p.name);
            if (reqQty > currentStock) {
                showToast(`Warning: Cannot add! Only ${currentStock} units of ${p.name} left in stock.`);
                return;
            }
        }
        i.qty+=delta; 
        if(i.qty<=0) cart=cart.filter(x=>x.id!==id);
    }
    updateCartUI();
}
function clearCart() { cart=[]; updateCartUI(); }
function updateCartUI() {
    const c=document.getElementById('cartContainer');
    if(!c) return;
    if(!cart.length){
        c.innerHTML=`<div class="empty-cart-msg"><i class="fa-solid fa-cart-shopping"></i><span>No items added yet</span></div>`;
        ['cartSubtotal','cartTax','cartTotal'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerText='₱0.00';});
        return;
    }
    c.innerHTML=''; let sub=0;
    cart.forEach(item=>{
        const tot=item.price*item.qty; sub+=tot;
        const div=document.createElement('div'); div.className='cart-item';
        div.innerHTML=`
            <div class="cart-item-icon">
                ${item.image ? '<img src="' + item.image + '" alt="' + item.name + '" style="max-width:100%; max-height:100%; border-radius:8px; object-fit:contain;">' : '<i class="fa-solid ' + item.icon + '"></i>'}
            </div>
            <div class="cart-item-details"><div class="cart-item-name">${item.name}</div><div class="cart-item-sub">₱${item.price.toFixed(2)} × ${item.qty}</div></div>
            <div class="cart-item-price-col"><div class="cart-item-total">₱${tot.toFixed(2)}</div></div>
            <div class="cart-qty-controls">
                <i class="fa-solid fa-chevron-up" onclick="changeQty(${item.id},1)"></i>
                <i class="fa-solid fa-chevron-down" onclick="changeQty(${item.id},-1)"></i>
            </div>`;
        c.appendChild(div);
    });
    const tax=sub*0.12, total=sub+tax;
    document.getElementById('cartSubtotal').innerText=`₱${sub.toFixed(2)}`;
    document.getElementById('cartTax').innerText=`₱${tax.toFixed(2)}`;
    document.getElementById('cartTotal').innerText=`₱${total.toFixed(2)}`;
}

// ===================== CASH INPUT & CHANGE CALCULATOR =====================
function calculateChange() {
    const totalEl = document.getElementById('cartTotal');
    const cashEl  = document.getElementById('cashInput');
    const changeDisplay = document.getElementById('changeDisplay');
    const changeAmount  = document.getElementById('changeAmount');
    const insufficient  = document.getElementById('insufficientFunds');
    if (!totalEl || !cashEl) return;

    const total = parseFloat(totalEl.innerText.replace('₱','').replace(',','')) || 0;
    const cash  = parseFloat(cashEl.value) || 0;

    if (cash <= 0 || total === 0) {
        changeDisplay.style.display = 'none';
        insufficient.style.display  = 'none';
        return;
    }
    if (cash < total) {
        changeDisplay.style.display = 'none';
        insufficient.style.display  = 'flex';
    } else {
        insufficient.style.display  = 'none';
        changeDisplay.style.display = 'flex';
        changeAmount.textContent    = '₱' + (cash - total).toFixed(2);
    }
}

function setQuickCash(amount) {
    const cashEl = document.getElementById('cashInput');
    if (cashEl) { cashEl.value = amount; calculateChange(); }
}

// ===================== COMPLETE SALE — saves to shared dashboard =====================
async function completeSale() {
    if(!cart.length) return alert('Cart is empty.');

    const sub   = cart.reduce((s,i)=>s+i.price*i.qty,0);
    const tax   = sub*0.12;
    const total = sub+tax;

    // Validate cash input
    const cashEl  = document.getElementById('cashInput');
    const cash    = parseFloat(cashEl?.value) || 0;
    if (cash <= 0)     return alert('Please enter the cash amount received from the customer.');
    if (cash < total)  return alert('Insufficient cash. Total is ₱' + total.toFixed(2));

    const change  = cash - total;
    const now     = new Date();
    const txId    = 'TXN-'+Math.floor(Math.random()*900000+100000);
    const cashier = document.getElementById('pos-user-name')?.innerText||'Staff';
    const items   = cart.map(i=>i.name+(i.qty>1?' x'+i.qty:'')).join(', ');

    // --> NEW: Prepare and send data to the backend
    const saleData = {
        orderId: txId,
        cartTotal: total,
        cashierName: cashier,
        date: now.toISOString(),
        items: items
    };

    try {
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });
        if (!response.ok) throw new Error('Failed to save to database');
        
        const newTransaction = { 
            id: txId, 
            cashier: cashier, 
            date: 'Today, '+now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), 
            items: items, 
            amount: total, 
            ts: now.getTime(), 
            status: 'Completed',
            sub: sub, 
            tax: tax, 
            cash: cash, 
            change: change 
        };

        // 1. Keep saving locally for UI responsiveness to work instantly
        allTransactions.unshift({...newTransaction, cart: [...cart] });
        updateDashboardAndInventoryOnSale(cart, total);

        // 2. Fill receipt
        document.getElementById('receipt-date').innerText    = now.toLocaleDateString();
        document.getElementById('receipt-time').innerText    = now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        document.getElementById('receipt-id').innerText      = txId;
        document.getElementById('receipt-cashier').innerText = cashier;

        const tbody = document.getElementById('receipt-items-body');
        tbody.innerHTML = '';
        cart.forEach(item=>{
            const tr = document.createElement('tr');
            tr.innerHTML=`<td>${item.name}</td><td style="text-align:center;">${item.qty}</td><td style="text-align:right;">₱${(item.price*item.qty).toFixed(2)}</td>`;
            tbody.appendChild(tr);
        });

        document.getElementById('receipt-subtotal').innerText = `₱${sub.toFixed(2)}`;
        document.getElementById('receipt-tax').innerText      = `₱${tax.toFixed(2)}`;
        document.getElementById('receipt-total').innerText    = `₱${total.toFixed(2)}`;
        document.getElementById('receipt-cash').innerText     = `₱${cash.toFixed(2)}`;
        document.getElementById('receipt-change').innerText   = `₱${change.toFixed(2)}`;

        document.getElementById('receipt-modal').style.display = 'flex';
    } catch (error) {
        alert("Error saving transaction to the database.");
    }
}
function closeReceipt() {
    document.getElementById('receipt-modal').style.display='none';
    const cashEl = document.getElementById('cashInput');
    if (cashEl) cashEl.value = '';
    const changeDisplay = document.getElementById('changeDisplay');
    if (changeDisplay) changeDisplay.style.display = 'none';
    const insufficient = document.getElementById('insufficientFunds');
    if (insufficient) insufficient.style.display = 'none';
    clearCart();
}

// ===================== ADD PRODUCT MODAL =====================
function openAddProductModal()  { document.getElementById('add-product-modal').style.display='flex'; }
function closeAddProductModal() { document.getElementById('add-product-modal').style.display='none'; document.getElementById('addProductForm').reset(); }
document.getElementById('addProductForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    const name=document.getElementById('newProdName').value, sku=document.getElementById('newProdSku').value||'SKU-'+Math.floor(Math.random()*10000),
          cat=document.getElementById('newProdCat').value, price=parseFloat(document.getElementById('newProdPrice').value), stock=parseInt(document.getElementById('newProdStock').value);
    let pC='high',w=80,sP='status-instock',sT='In Stock';
    if(stock<=0){pC='low';w=0;sP='status-outstock';sT='Out of Stock';}
    else if(stock<15){pC='medium';w=30;sP='status-lowstock';sT='Low Stock';}
    const tbody=document.getElementById('inventoryBody'), tr=document.createElement('tr');
    tr.dataset.cat=cat; tr.dataset.status=sT;
    tr.innerHTML=`<td><div class="product-item"><div class="product-icon" style="width:40px;height:40px;font-size:1.2rem;"><i class="fa-solid fa-box"></i></div><div><div class="product-name" style="margin:0;">${name}</div><div class="product-sku">${sku}</div></div></div></td>
        <td style="color:var(--text-muted);">${cat}</td><td style="font-weight:600;">₱${price.toFixed(2)}</td>
        <td><div class="stock-level-wrapper"><div class="stock-progress"><div class="stock-progress-bar ${pC}" style="width:${w}%;"></div></div><span class="stock-text">${stock} units</span></div></td>
        <td><span class="status-pill ${sP}">${sT}</span></td>
        <td><div class="table-actions" style="justify-content:flex-end;"><i class="fa-solid fa-pen action-icon" onclick="openEditModal(this)"></i><i class="fa-solid fa-trash-can action-icon delete" onclick="this.closest('tr').remove();showToast('Product removed.')"></i></div></td>`;
    tbody.insertBefore(tr,tbody.firstChild);
    products.unshift({id:products.length+1,name,cat,price,icon:'fa-box'});
    renderProducts(); closeAddProductModal(); showToast('Product added!');
});

// ===================== ADD USER MODAL =====================
function openAddUserModal()  { document.getElementById('add-user-modal').style.display='flex'; }
function closeAddUserModal() { document.getElementById('add-user-modal').style.display='none'; document.getElementById('addUserForm').reset(); }
document.getElementById('addUserForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    const name=document.getElementById('newUserName').value, uname=document.getElementById('newUserUsername').value,
          role=document.getElementById('newUserRole').value, newId='USR-'+Math.floor(Math.random()*900+100);
    const rs=role==='Manager'?'background:#EDE9FE;color:#6D28D9;':'background:#D1FAE5;color:#065F46;';
    const tbody=document.getElementById('usersBody'), tr=document.createElement('tr');
    tr.innerHTML=`<td><div style="font-weight:600;">${name}</div><div style="font-size:0.75rem;color:var(--text-muted);">ID: ${newId}</div></td>
        <td style="color:var(--text-muted);">${uname}</td><td><span class="status-pill" style="${rs}">${role}</span></td>
        <td style="color:var(--text-muted);">Just now</td><td><span class="status-pill status-instock">Active</span></td>
        <td><div class="table-actions" style="justify-content:flex-end;"><i class="fa-solid fa-pen action-icon" onclick="openEditUserModal(this)"></i><i class="fa-solid fa-trash-can action-icon delete" onclick="this.closest('tr').remove();showToast('User removed.')"></i></div></td>`;
    tbody.insertBefore(tr,tbody.firstChild); closeAddUserModal(); showToast('User added!');
});

// ===================== EDIT USER MODAL =====================
function openEditUserModal(btn) {
    const row=btn.closest('tr');
    document.getElementById('editUserName').value     = row.querySelector('td div[style*="font-weight"]')?.textContent.trim()||'';
    document.getElementById('editUserUsername').value = row.querySelectorAll('td')[1]?.textContent.trim()||'';
    document.getElementById('editUserRole').value     = row.querySelector('.status-pill:not(.status-instock)')?.textContent.trim()||'Staff';
    document.getElementById('editUserModal').style.display='flex';
    document.getElementById('editUserModal')._row=row;
}
function closeEditUserModal() { document.getElementById('editUserModal').style.display='none'; }
document.getElementById('editUserForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    const row=document.getElementById('editUserModal')._row;
    const name=document.getElementById('editUserName').value, uname=document.getElementById('editUserUsername').value, role=document.getElementById('editUserRole').value;
    const rs=role==='Manager'?'background:#EDE9FE;color:#6D28D9;':'background:#D1FAE5;color:#065F46;';
    row.querySelector('td div[style*="font-weight"]').textContent=name;
    row.querySelectorAll('td')[1].textContent=uname;
    const pill=row.querySelector('.status-pill:not(.status-instock)');
    if(pill){pill.textContent=role; pill.style.cssText=rs;}
    closeEditUserModal(); showToast('User updated!');
});

// ===================== TOAST =====================
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    let icon = 'fa-circle-check';
    let bgColor = 'var(--success-green)';
    
    // Auto-detect warning/danger based on message content
    if (msg.includes('Warning') || msg.includes('Error') || type === 'error' || type === 'warning') {
        icon = 'fa-triangle-exclamation';
        bgColor = 'var(--danger-red)'; // Or #EF4444 specifically
    }
    
    t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    t.style.cssText = `position:fixed; bottom:20px; right:20px; background:${bgColor}; color:white; padding:12px 24px; border-radius:8px; box-shadow:0 8px 16px rgba(0,0,0,0.15); z-index:9999; font-weight:600; display:flex; align-items:center; gap:8px; transition: transform 0.3s, opacity 0.3s; transform: translateY(0);`;
    
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// ===================== CLOCK =====================
setInterval(()=>{const el=document.getElementById('clock');if(el)el.innerText=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});},1000);

// ===================== INIT =====================
renderProducts(); updateCartUI();
async function fetchTransactions() {
    try {
        const response = await fetch('/api/sales');
        const result = await response.json();
        
        if (result.success) {
            allTransactions = result.data.map(row => {
                let d = new Date(row.date);
                let dateString = "Today, " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return {
                    id: row.orderId,
                    cashier: row.cashierName,
                    customer: "Walk-in Customer", 
                    date: isNaN(d) ? row.date : dateString, 
                    method: "Cash",
                    methodIcon: "fa-solid fa-money-bill",
                    items: row.items || "Store Item(s)",
                    amount: row.cartTotal,
                    ts: isNaN(d) ? Date.now() : d.getTime(),
                    status: "Completed"
                };
            });

            updateDashboardAndInventoryOnSale([], 0);
        }
    } catch (error) {
        updateDashboardAndInventoryOnSale([], 0); // Render empty shell if server is off
    }
}

fetchTransactions();

// ===================== CLEARANCE SALE FEATURE =====================
let clearanceActive = true;
let clearanceThresholdDate = new Date();
clearanceThresholdDate.setDate(clearanceThresholdDate.getDate() - 14);

function toggleClearanceFeature(isActive) {
    clearanceActive = isActive;
    showToast(`Clearance feature ${isActive ? 'enabled' : 'disabled'}.`);
    updateClearanceUI();
}

function getProductSales(name, days) {
    let sales = 0;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    
    allTransactions.forEach(t => {
        if (t.status === 'Refunded') return;
        if (new Date(t.ts) >= threshold) {
            const itemsArr = t.items.split(',');
            itemsArr.forEach(iStr => {
                const match = iStr.trim().match(/(.+?)(?: x(\d+))?$/);
                if (match && match[1].trim() === name) {
                    sales += parseInt(match[2] || 1);
                }
            });
        }
    });
    return sales;
}

function forceClearanceScan() {
    showToast('Scanning inventory for slow moving items...', 'success');
    
    const tbody = document.getElementById('clearanceBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let slowCount = 0;
    
    products.forEach(p => {
        // Mock inventory age for demonstration: random age between 5 and 100 days
        const mockAgeDays = p._mockAge || Math.floor(Math.random() * 95) + 5;
        p._mockAge = mockAgeDays;
        
        const recentSales = getProductSales(p.name, 14);
        
        // Trigger condition: 0-2 sales in 14 days OR 30+ days in inventory
        let trigger = '';
        let suggestedDiscount = 0;
        
        if (recentSales <= 2) trigger = `Low Sales (${recentSales} in 14d)`;
        if (mockAgeDays >= 30) {
            trigger = trigger ? trigger + ` & Age (${mockAgeDays}d)` : `Age (${mockAgeDays}d)`;
        }
        
        if (trigger) {
            slowCount++;
            
            // Auto Tiering Logic
            if (mockAgeDays >= 90) suggestedDiscount = 50;
            else if (mockAgeDays >= 60) suggestedDiscount = 20;
            else if (mockAgeDays >= 30) suggestedDiscount = 10;
            else suggestedDiscount = 10; // Default for low sales recent items
            
            if (!p.originalPrice) p.originalPrice = p.price;
            
            // If it's already on clearance, keep its current discount
            const currentDisc = p.clearance ? Math.round((1 - (p.price / p.originalPrice)) * 100) : NaN;
            const finalDiscount = isNaN(currentDisc) ? suggestedDiscount : currentDisc;
            
            let statusHtml = p.clearance ? 
                `<span class="status-pill status-instock" style="background:#FFF1F2; color:#E11D48;"><i class="fa-solid fa-bullhorn"></i> Active</span>` : 
                `<span class="status-pill status-pending text-muted">Pending</span>`;
                
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div style="font-weight:500;">${p.name}</div></td>
                <td style="color:var(--text-muted);">${p.cat}</td>
                <td><span style="font-size:0.85rem; background:var(--muted-bg); padding:0.2rem 0.5rem; border-radius:4px;">${trigger}</span></td>
                <td>₱${p.originalPrice.toFixed(2)}</td>
                <td>
                    <select class="discount-select" onchange="updateClearanceDiscount(${p.id}, this.value)" style="padding:0.25rem; border-radius:4px; border:1px solid var(--border-color);">
                        <option value="0" ${finalDiscount === 0 ? 'selected' : ''}>No Discount</option>
                        <option value="10" ${finalDiscount === 10 ? 'selected' : ''}>10% Off</option>
                        <option value="20" ${finalDiscount === 20 ? 'selected' : ''}>20% Off</option>
                        <option value="30" ${finalDiscount === 30 ? 'selected' : ''}>30% Off</option>
                        <option value="50" ${finalDiscount === 50 ? 'selected' : ''}>50% Off</option>
                    </select>
                </td>
                <td style="font-weight:600; color:#E11D48;">₱${(p.originalPrice * (1 - finalDiscount/100)).toFixed(2)}</td>
                <td id="clearance-status-${p.id}">
                    ${statusHtml}
                </td>
            `;
            tbody.appendChild(tr);
            
            // Apply suggested if not yet active, but wait for manager to apply?
            // "System will allow manager to choose". We just show the drop-down.
        }
    });
    
    document.getElementById('clearanceSlowCount').textContent = slowCount;
    if (slowCount === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No slow-moving items detected.</td></tr>`;
    }
    
    checkWeeklyVolume();
}

function updateClearanceDiscount(productId, discountPct) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    
    if (!p.originalPrice) p.originalPrice = p.price;
    const discount = parseInt(discountPct);
    
    if (discount > 0) {
        p.price = p.originalPrice * (1 - discount / 100);
        p.clearance = true;
    } else {
        p.price = p.originalPrice;
        p.clearance = false;
    }
    
    // Update local UI
    forceClearanceScan();
    updateClearanceUI();
    showToast(`Updated clearance discount for ${p.name}.`);
    
    // Refresh POS Grid if active
    if (document.getElementById('pos-view').style.display === 'flex' || document.getElementById('pos-view').style.display === 'block') {
        renderProducts();
    }
}

function checkWeeklyVolume() {
    // "Traffic-Based Activation": check if week volume is high -> turn on clearance pill
    const thisWeekTotal = reportsDataSets.week.data.reduce((a,b)=>a+b,0);
    const threshold = 5000; // Mock threshold
    const volStatusEl = document.getElementById('clearanceVolumeStatus');
    
    if (volStatusEl) {
        if (thisWeekTotal > threshold) {
            volStatusEl.innerHTML = `<span style="color:var(--success-green);"><i class="fa-solid fa-arrow-trend-up"></i> High (₱${thisWeekTotal.toLocaleString()})</span>`;
        } else {
            volStatusEl.innerHTML = `<span style="color:var(--danger-red);"><i class="fa-solid fa-arrow-trend-down"></i> Low (₱${thisWeekTotal.toLocaleString()})</span>`;
        }
    }
    updateClearanceUI();
}

function updateClearanceUI() {
    const activeCount = products.filter(p => p.clearance).length;
    const countEl = document.getElementById('clearanceActiveCount');
    if (countEl) countEl.textContent = activeCount;
    
    // Check if clearance should be shown in POS (active toggle AND high traffic)
    const thisWeekTotal = reportsDataSets.week.data ? reportsDataSets.week.data.reduce((a,b)=>a+b,0) : Infinity; // Fallback so we can test
    const threshold = 5000;
    
    const pill = document.querySelector('.clearance-pill');
    if (pill) {
        if (clearanceActive && thisWeekTotal > threshold && activeCount > 0) {
            pill.style.display = 'inline-block';
        } else {
            pill.style.display = 'none';
            // if currently viewing clearance, reset
            if (currentCategory === 'Clearance') {
                filterProducts('All Items', document.querySelectorAll('.category-pill')[1]);
            }
        }
    }
}
// Add to search index
searchIndex.push({ label:'Clearance Sale', action:() => switchAdminTab('clearance') });

// Set home-active on page load since home is the default view
// Check for existing session — skip login if already authenticated
(function restoreSession() {
    const savedRole = sessionStorage.getItem('posRole');
    if (savedRole === 'manager') {
        document.getElementById('admin-user-name').innerText = 'Store Manager';
        document.getElementById('admin-user-role').innerText = 'Manager';
        showView('admin');
        switchAdminTab('dashboard');
    } else if (savedRole === 'staff') {
        document.getElementById('pos-user-name').innerText = 'Jane Doe (Staff)';
        showView('pos');
    } else {
        document.body.classList.add('home-active');
    }
})();