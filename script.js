// عنوان API
const API_URL = 'http://localhost:3000/api';

// التحقق من تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // إذا كان المستخدم مسجل دخول بالفعل، توجيهه للصفحة المناسبة
    const currentUser = getCurrentUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentUser && currentPage === 'index.html') {
        redirectToHomePage(currentUser.role);
        return;
    }
    
    // إذا كانت الصفحة تتطلب تسجيل دخول
    if (currentPage !== 'index.html' && !currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // معالج نموذج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // معالج زر تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// دالة تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('error-message');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // إخفاء رسائل الخطأ السابقة
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    
    // التحقق من المدخلات
    if (!username || !password) {
        showError('الرجاء إدخال اسم المستخدم وكلمة المرور');
        return;
    }
    
    // تعطيل الزر أثناء الإرسال
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري تسجيل الدخول...';
    }
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // حفظ بيانات المستخدم
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // التوجيه حسب الدور
            redirectToHomePage(data.user.role);
        } else {
            showError(data.message || 'فشل تسجيل الدخول. حاول مرة أخرى');
        }
    } catch (error) {
        console.error('خطأ في الاتصال:', error);
        showError('حدث خطأ في الاتصال بالخادم. تأكد من تشغيل الخادم على المنفذ 3000');
    } finally {
        // إعادة تفعيل الزر
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'تسجيل الدخول';
        }
    }
}

// دالة عرض رسالة الخطأ
function showError(message) {
    let errorDiv = document.getElementById('error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.cssText = `
            background-color: #fee;
            color: #c33;
            padding: 12px;
            margin: 15px 0;
            border: 1px solid #fcc;
            border-radius: 5px;
            text-align: center;
        `;
        
        const form = document.getElementById('loginForm');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
        }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// دالة التوجيه للصفحة الرئيسية
function redirectToHomePage(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'entry.html';
    }
}

// دالة الحصول على المستخدم الحالي
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('خطأ في قراءة بيانات المستخدم:', e);
        return null;
    }
}

// دالة تسجيل الخروج
function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// دالة عرض اسم المستخدم
function displayUsername() {
    const user = getCurrentUser();
    const usernameElement = document.getElementById('current-username');
    
    if (user && usernameElement) {
        usernameElement.textContent = user.username;
    }
}

// دالة تحميل الدوائر
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

// دالة إضافة مستفيد
async function addBeneficiary(beneficiaryData) {
    try {
        const response = await fetch(`${API_URL}/beneficiaries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(beneficiaryData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('تم إضافة بيانات المستفيد بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل إضافة بيانات المستفيد');
            return false;
        }
    } catch (error) {
        console.error('خطأ في إضافة المستفيد:', error);
        alert('حدث خطأ في الاتصال بالخادم');
        return false;
    }
}

// دالة تحميل المستفيدين
async function loadBeneficiaries(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/beneficiaries?${params}`);
        const data = await response.json();
        
        if (data.success) {
            return data.beneficiaries;
        }
        return [];
    } catch (error) {
        console.error('خطأ في تحميل المستفيدين:', error);
        return [];
    }
}

// دالة تحميل الإحصائيات
async function loadStatistics(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/statistics?${params}`);
        const data = await response.json();
        
        if (data.success) {
            return data.statistics;
        }
        return [];
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        return [];
    }
}

// دالة تحميل المستخدمين (للمدير)
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        const data = await response.json();
        
        if (data.success) {
            return data.users;
        }
        return [];
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
        return [];
    }
}

// دالة إضافة مستخدم (للمدير)
async function addUser(userData) {
    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        console.error('خطأ في إضافة المستخدم:', error);
        alert('حدث خطأ في الاتصال بالخادم');
        return false;
    }
}

// دالة حذف مستخدم (للمدير)
async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('تم حذف المستخدم بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل حذف المستخدم');
            return false;
        }
    } catch (error) {
        console.error('خطأ في حذف المستخدم:', error);
        alert('حدث خطأ في الاتصال بالخادم');
        return false;
    }
}

// دالة إضافة دائرة
async function addDepartment(name) {
    try {
        const response = await fetch(`${API_URL}/departments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('تم إضافة الدائرة بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل إضافة الدائرة');
            return false;
        }
    } catch (error) {
        console.error('خطأ في إضافة الدائرة:', error);
        alert('حدث خطأ في الاتصال بالخادم');
        return false;
    }
}

// دالة حذف دائرة
async function deleteDepartment(deptId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدائرة؟')) {
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/departments/${deptId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('تم حذف الدائرة بنجاح');
            return true;
        } else {
            alert(data.message || 'فشل حذف الدائرة');
            return false;
        }
    } catch (error) {
        console.error('خطأ في حذف الدائرة:', error);
        alert('حدث خطأ في الاتصال بالخادم');
        return false;
    }
}

// تصدير الدوال للاستخدام في صفحات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrentUser,
        handleLogout,
        displayUsername,
        loadDepartments,
        addBeneficiary,
        loadBeneficiaries,
        loadStatistics,
        loadUsers,
        addUser,
        deleteUser,
        addDepartment,
        deleteDepartment
    };
}
