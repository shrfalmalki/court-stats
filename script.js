// عنوان API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = getCurrentUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // إعادة توجيه المستخدم المسجل
    if (currentUser && currentPage === 'index.html') {
        redirectToHomePage(currentUser.role);
        return;
    }
    
    // إعادة توجيه غير المسجل
    if (!currentUser && currentPage !== 'index.html' && currentPage !== '') {
        window.location.href = 'index.html';
        return;
    }
    
    // معالج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // معالج تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // عرض اسم المستخدم
    displayUsername();
});

// دالة تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // إخفاء رسائل الخطأ السابقة
    hideError();
    
    if (!username || !password) {
        showError('الرجاء إدخال اسم المستخدم وكلمة المرور');
        return;
    }
    
    // تعطيل الزر
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري تسجيل الدخول...';
    }
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            redirectToHomePage(data.user.role);
        } else {
            showError(data.message || 'فشل تسجيل الدخول');
        }
    } catch (error) {
        console.error('خطأ:', error);
        showError('حدث خطأ في الاتصال بالخادم');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'تسجيل الدخول';
        }
    }
}

// عرض رسالة الخطأ
function showError(message) {
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        const form = document.getElementById('loginForm');
        if (form) form.insertBefore(errorDiv, form.firstChild);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// إخفاء رسالة الخطأ
function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) errorDiv.style.display = 'none';
}

// التوجيه للصفحة الرئيسية
function redirectToHomePage(role) {
    window.location.href = role === 'admin' ? 'admin.html' : 'entry.html';
}

// الحصول على المستخدم الحالي
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

// تسجيل الخروج
function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// عرض اسم المستخدم
function displayUsername() {
    const user = getCurrentUser();
    const usernameElement = document.getElementById('current-username');
    if (user && usernameElement) {
        usernameElement.textContent = user.username;
    }
}

// تحميل الدوائر
async function loadDepartments() {
    try {
        const response = await fetch(`${API_URL}/departments`);
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('department');
            if (select) {
                select.innerHTML = '<option value="">اختر الدائرة</option>';
                data.departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.name;
                    option.textContent = dept.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل الدوائر:', error);
    }
}

// تحميل الصفات
async function loadStatuses() {
    try {
        const response = await fetch(`${API_URL}/statuses`);
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('status');
            if (select) {
                select.innerHTML = '<option value="">اختر الصفة</option>';
                data.statuses.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.name;
                    option.textContent = item.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل الصفات:', error);
    }
}

// تحميل الأسباب
async function loadReasons() {
    try {
        const response = await fetch(`${API_URL}/reasons`);
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('reason');
            if (select) {
                select.innerHTML = '<option value="">اختر السبب</option>';
                data.reasons.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.name;
                    option.textContent = item.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل الأسباب:', error);
    }
}

// إضافة مستفيد
async function addBeneficiary(beneficiaryData) {
    try {
        const response = await fetch(`${API_URL}/beneficiaries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(beneficiaryData)
        });
        const data = await response.json();
        if (data.success) {
            alert('تم إضافة بيانات المستفيد بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل إضافة البيانات');
            return false;
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الاتصال');
        return false;
    }
}

// تحميل المستفيدين
async function loadBeneficiaries(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/beneficiaries?${params}`);
        const data = await response.json();
        return data.success ? data.beneficiaries : [];
    } catch (error) {
        console.error('خطأ:', error);
        return [];
    }
}

// تحميل الإحصائيات
async function loadStatistics(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/statistics?${params}`);
        const data = await response.json();
        return data.success ? data.statistics : [];
    } catch (error) {
        console.error('خطأ:', error);
        return [];
    }
}

// تحميل المستخدمين
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        const data = await response.json();
        return data.success ? data.users : [];
    } catch (error) {
        console.error('خطأ:', error);
        return [];
    }
}

// إضافة مستخدم
async function addUser(userData) {
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (data.success) {
            alert('تم إضافة المستخدم بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل إضافة المستخدم');
            return false;
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الاتصال');
        return false;
    }
}

// حذف مستخدم
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return false;
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            alert('تم حذف المستخدم بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل الحذف');
            return false;
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الاتصال');
        return false;
    }
}

// إضافة دائرة
async function addDepartment(name) {
    try {
        const response = await fetch(`${API_URL}/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (data.success) {
            alert('تم إضافة الدائرة بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل الإضافة');
            return false;
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الاتصال');
        return false;
    }
}

// حذف دائرة
async function deleteDepartment(deptId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدائرة؟')) return false;
    try {
        const response = await fetch(`${API_URL}/departments/${deptId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            alert('تم حذف الدائرة بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل الحذف');
            return false;
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الاتصال');
        return false;
    }
}
