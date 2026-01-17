document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

const API_BASE = '/api';
let allData = [];
let charts = {};

function initializeApp() {
    setupNavigation();
    setupLogin();
    setupForms();
    checkLoginStatus();
}

// --- Navigation ---
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');

            // Check auth
            if (!isLoggedIn()) {
                showLoginScreen();
                return;
            }

            // Simple role check for admin tab
            if (pageId === 'admin' && localStorage.getItem('role') !== 'admin') {
                alert('عفواً، هذه الصفحة خاصة بالمدير فقط');
                return;
            }

            // Switch Tab
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Switch Page
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${pageId}`).classList.add('active');

            // Load Page Data
            loadPageData(pageId);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            localStorage.removeItem('user_id');
            document.getElementById('user-dashboard').style.display = 'none';
            showLoginScreen();
        });
    }
}

function loadPageData(pageId) {
    if (pageId === 'charts') reloadDataAndCharts();
    if (pageId === 'data') updateDataTable();
    if (pageId === 'simple') updateSimpleTable();
    if (pageId === 'admin') loadAdminData();
    if (pageId === 'comprehensive') updateComprehensiveStats();
    if (pageId === 'entry') loadEntryFormData();
}

// --- Authentication ---
function isLoggedIn() {
    return !!localStorage.getItem('user');
}

function checkLoginStatus() {
    if (isLoggedIn()) {
        const user = localStorage.getItem('user');
        const role = localStorage.getItem('role');

        // Fix: Show proper name for admin
        const displayName = role === 'admin' ? 'المدير' : user;
        document.getElementById('header-user-name').textContent = displayName;
        document.getElementById('user-dashboard').style.display = 'flex';

        document.getElementById('main-login-screen').style.display = 'none';

        // Show default page (charts)
        document.querySelector('.nav-tab[data-page="charts"]').click();

        // Load employees for login dropdown (in case of logout)
        loadEmployeesIntoSelect('login-employees-list-optgroup', true);
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('main-login-screen').style.display = 'flex';
    loadEmployeesIntoSelect('login-employees-list-optgroup', true);
}

function setupLogin() {
    const form = document.getElementById('main-login-form');
    const typeSelect = document.getElementById('login-type');
    const passwordInput = document.getElementById('login-password');
    const errorMsg = document.getElementById('main-login-error');

    // Clear error on input
    passwordInput.addEventListener('input', () => errorMsg.style.display = 'none');
    typeSelect.addEventListener('change', () => errorMsg.style.display = 'none');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = typeSelect.value;
        const password = passwordInput.value;

        if (!type || !password) {
            showError('الرجاء اختيار الحساب وإدخال كلمة المرور');
            return;
        }

        const username = type === 'admin' ? 'admin' : type;
        const role = type === 'admin' ? 'admin' : 'employee';

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                localStorage.setItem('user', result.user);
                localStorage.setItem('role', result.role);
                if (result.id) localStorage.setItem('user_id', result.id);

                // Set UI state
                document.getElementById('main-login-screen').style.display = 'none';

                // Update Header User Name
                const displayName = result.role === 'admin' ? 'المدير' : result.user;
                document.getElementById('header-user-name').textContent = displayName;
                document.getElementById('user-dashboard').style.display = 'flex';

                // Prepare Entry Page
                if (result.role === 'employee') {
                    document.getElementById('current-employee-name').textContent = result.user;
                    document.getElementById('employee').value = result.user;
                }

                form.reset();
                document.querySelector('.nav-tab[data-page="charts"]').click();
            } else {
                showError(result.error || 'خطأ في تسجيل الدخول');
            }
        } catch (err) {
            console.error(err);
            showError('حدث خطأ في الاتصال بالخادم');
        }
    });
}

function showError(msg) {
    const errorEl = document.getElementById('main-login-error');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    // Trigger Css Animation
    errorEl.style.animation = 'none';
    errorEl.offsetHeight; /* trigger reflow */
    errorEl.style.animation = null;
}

// --- Forms & Data ---
function setupForms() {
    // Data Entry Form
    const entryForm = document.getElementById('data-entry-form');
    entryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        const btnText = document.getElementById('submit-btn-text');

        btn.disabled = true;
        btnText.textContent = 'جاري الحفظ...';

        const formData = {
            day: document.getElementById('day').value,
            date: document.getElementById('date').value,
            beneficiary_name: document.getElementById('beneficiary-name').value,
            id_number: document.getElementById('id-number').value,
            phone_number: document.getElementById('phone-number').value,
            case_number: document.getElementById('case-number').value,
            department: document.getElementById('department').value,
            capacity: document.getElementById('capacity').value,
            description: document.getElementById('description').value,
            employee: document.getElementById('employee').value // Hidden field
        };

        try {
            const res = await fetch(`${API_BASE}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            const successMsg = document.getElementById('entry-success');
            if (res.ok) {
                successMsg.textContent = '✅ تم حفظ البيانات بنجاح!';
                successMsg.style.display = 'block';
                entryForm.reset();
                // Restore employee name if employee
                if (localStorage.getItem('role') === 'employee') {
                    document.getElementById('employee').value = localStorage.getItem('user');
                }
                setTimeout(() => successMsg.style.display = 'none', 3000);
            } else {
                alert('خطأ: ' + (data.error || 'فشل الحفظ'));
            }
        } catch (err) {
            alert('خطأ في الاتصال');
        } finally {
            btn.disabled = false;
            btnText.textContent = '💾 حفظ البيانات';
        }
    });

    // Add Item Listeners (Admin)
    setupAdminAddListener('add-employee-btn', 'new-employee-name', 'employees');
    setupAdminAddListener('add-department-btn', 'new-department-name', 'departments');
    setupAdminAddListener('add-capacity-btn', 'new-capacity-name', 'capacities');
    setupAdminAddListener('add-description-btn', 'new-description-name', 'descriptions');

    // Password Change
    document.getElementById('change-password-btn').addEventListener('click', async () => {
        const username = document.getElementById('password-user-select').value;
        const oldPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const msg = document.getElementById('password-message');

        if (!username || !oldPassword || !newPassword) {
            msg.textContent = 'الرجاء تعبئة جميع الحقول';
            msg.style.color = 'red';
            return;
        }

        const role = username === 'admin' ? 'admin' : 'employee';

        try {
            const res = await fetch(`${API_BASE}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, oldPassword, newPassword, role })
            });
            const data = await res.json();

            if (res.ok) {
                msg.textContent = 'تم التغيير بنجاح';
                msg.style.color = 'green';
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
            } else {
                msg.textContent = data.error || 'فشل التغيير';
                msg.style.color = 'red';
            }
        } catch (err) {
            msg.textContent = 'خطأ في الاتصال';
            msg.style.color = 'red';
        }
    });

    // Self-Service Password Change (Info Page)
    const changeOwnBtn = document.getElementById('change-own-password-btn');
    if (changeOwnBtn) {
        changeOwnBtn.addEventListener('click', async () => {
            const oldPassword = document.getElementById('own-current-password').value;
            const newPassword = document.getElementById('own-new-password').value;
            const msg = document.getElementById('own-password-message');

            if (!oldPassword || !newPassword) {
                msg.textContent = 'الرجاء تعبئة جميع الحقول';
                msg.style.color = 'red';
                return;
            }

            const username = localStorage.getItem('user');
            const role = localStorage.getItem('role');

            try {
                const res = await fetch(`${API_BASE}/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, oldPassword, newPassword, role })
                });
                const data = await res.json();

                if (res.ok) {
                    msg.textContent = '✅ تم تغيير كلمة المرور بنجاح';
                    msg.style.color = 'green';
                    document.getElementById('own-current-password').value = '';
                    document.getElementById('own-new-password').value = '';
                } else {
                    msg.textContent = '❌ ' + (data.error || 'فشل التغيير');
                    msg.style.color = 'red';
                }
            } catch (err) {
                msg.textContent = 'خطأ في الاتصال';
                msg.style.color = 'red';
            }
        });
    }
}
// Excel Import Logic
function setupExcelImport() {
    const btn = document.getElementById('import-excel-btn');
    const fileInput = document.getElementById('excel-file-input');
    const msg = document.getElementById('import-message');

    if (!btn) return;

    btn.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) {
            msg.textContent = 'الرجاء اختيار ملف';
            msg.style.color = 'red';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                msg.textContent = 'الملف فارغ أو لا يحتوي على بيانات';
                msg.style.color = 'red';
                return;
            }

            // Map Data (Assume headers are row 0, data starts row 1)
            const records = [];
            // Skip header row
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                records.push({
                    day: row[0] || '',
                    date: row[1] || '',
                    beneficiary_name: row[2] || '',
                    id_number: row[3] || '',
                    phone_number: row[4] || '',
                    case_number: row[5] || '',
                    department: row[6] || '',
                    capacity: row[7] || '',
                    description: row[8] || '',
                    employee: row[9] || localStorage.getItem('user') // Default to current user if missing
                });
            }

            if (records.length === 0) {
                msg.textContent = 'لم يتم العثور على سجلات صالحة';
                msg.style.color = 'red';
                return;
            }

            try {
                btn.disabled = true;
                btn.textContent = 'جاري الاستيراد...';

                const res = await fetch(`${API_BASE}/records/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(records)
                });

                const result = await res.json();

                if (res.ok) {
                    msg.textContent = `✅ تم استيراد ${result.count} سجل بنجاح`;
                    msg.style.color = 'green';
                    fileInput.value = ''; // Reset
                } else {
                    msg.textContent = '❌ خطأ: ' + (result.error || 'فشل الاستيراد');
                    msg.style.color = 'red';
                }
            } catch (err) {
                msg.textContent = 'خطأ في الاتصال بالخادم';
                msg.style.color = 'red';
            } finally {
                btn.disabled = false;
                btn.textContent = 'استيراد البيانات';
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
document.getElementById(btnId).addEventListener('click', async () => {
    const input = document.getElementById(inputId);
    const name = input.value;
    if (!name) return;

    await fetch(`${API_BASE}/settings/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    input.value = '';
    loadAdminData();
});
}

// --- Data Loading ---
async function loadEntryFormData() {
    await loadOptionsIntoSelect('department', 'departments');
    await loadOptionsIntoSelect('capacity', 'capacities');
    await loadOptionsIntoSelect('description', 'descriptions');
    // Employee is auto-set or hidden
}

async function loadAdminData() {
    await loadList('admin-employee-list', 'employees', 'deleteEmployee');
    await loadList('admin-department-list', 'departments', 'deleteDepartment');
    await loadList('admin-capacity-list', 'capacities', 'deleteCapacity');
    await loadList('admin-description-list', 'descriptions', 'deleteDescription');

    // Load password dropdown
    loadEmployeesIntoSelect('password-employees-list-optgroup', true);
}

// Helpers
async function loadOptionsIntoSelect(selectId, endpoint) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Save first option
    const firstHtml = select.options[0].outerHTML;

    try {
        const res = await fetch(`${API_BASE}/settings/${endpoint}`);
        const data = await res.json();

        select.innerHTML = firstHtml;
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = item.name;
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

async function loadEmployeesIntoSelect(groupId, isOptGroup = false) {
    const container = document.getElementById(groupId);
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/settings/employees`);
        const data = await res.json();
        container.innerHTML = '';
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = item.name;
            container.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

async function loadList(listId, endpoint, deleteFunc) {
    const list = document.getElementById(listId);
    if (!list) return;

    try {
        const res = await fetch(`${API_BASE}/settings/${endpoint}`);
        const data = await res.json();
        list.innerHTML = '';
        data.forEach(item => {
            const li = document.createElement('li');
            li.className = 'admin-list-item';
            li.innerHTML = `<span>${item.name}</span> <button class="btn btn-danger btn-small" onclick="${deleteFunc}(${item.id})">حذف</button>`;
            list.appendChild(li);
        });
    } catch (e) { console.error(e); }
}

// --- Global Delete Functions (for onclick) ---
window.deleteEmployee = (id) => deleteItem('employees', id);
window.deleteDepartment = (id) => deleteItem('departments', id);
window.deleteCapacity = (id) => deleteItem('capacities', id);
window.deleteDescription = (id) => deleteItem('descriptions', id);

async function deleteItem(endpoint, id) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await fetch(`${API_BASE}/settings/${endpoint}/${id}`, { method: 'DELETE' });
    loadAdminData();
}

// --- Charts & Tables (Simplified for Rewrite) ---
// Note: Keeping core chart logic but simplified structure
async function reloadDataAndCharts() {
    // Basic implementation for brevity - fully implementing reqs
    const res = await fetch(`${API_BASE}/records`); // Add filters as needed
    const json = await res.json();
    const data = json.data || [];

    document.getElementById('total-records').textContent = data.length;

    // Initialize charts if not exists
    if (!charts.department) initCharts();

    updateChart(charts.department, data, 'department');
    updateChart(charts.capacity, data, 'capacity');
    // ... other charts
}

function initCharts() {
    const ctxDept = document.getElementById('department-chart');
    if (ctxDept) {
        charts.department = new Chart(ctxDept, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'عدد', data: [], backgroundColor: '#379777' }] }
        });
    }
    const ctxCap = document.getElementById('capacity-chart');
    if (ctxCap) {
        charts.capacity = new Chart(ctxCap, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#379777', '#f4ce14', '#45474b'] }] }
        });
    }
    // Add others as needed
}

function updateChart(chart, data, key) {
    if (!chart) return;
    const counts = {};
    data.forEach(d => counts[d[key]] = (counts[d[key]] || 0) + 1);
    chart.data.labels = Object.keys(counts);
    chart.data.datasets[0].data = Object.values(counts);
    chart.update();
}

// Placeholder for other tab updates
async function updateDataTable() {
    const res = await fetch(`${API_BASE}/records`);
    const json = await res.json();
    const data = json.data || [];
    const container = document.getElementById('data-table-container');

    let html = '<table><thead><tr><th>اليوم</th><th>التاريخ</th><th>الاسم</th><th>الدائرة</th><th>الصفة</th><th>الوصف</th></tr></thead><tbody>';
    data.forEach(row => {
        html += `<tr><td>${row.day}</td><td>${row.date}</td><td>${row.beneficiary_name}</td><td>${row.department}</td><td>${row.capacity}</td><td>${row.description}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}
function updateSimpleTable() { updateDataTable(); /* Alias for now */ }
function updateComprehensiveStats() { /* Implement similar to charts */ }
