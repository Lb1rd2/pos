/* ============ KenyaPOS - Main Application Script ============ */

document.addEventListener('DOMContentLoaded', function () {
    initLogin();
    initSidebar();
    initNavigation();
    initUserDropdown();
    initLogout();
    updateCurrentDate();
});

/* ============ LOGIN ============ */
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            handleLogin();
        });

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
    }

    function handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            showNotification('Please enter username and password', 'error');
            return;
        }

        // Simulate login
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled = true;

        setTimeout(function () {
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            showNotification('Welcome back, ' + username + '!', 'success');
        }, 800);
    }
}

/* ============ SIDEBAR TOGGLE ============ */
function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');

    // Create overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    overlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

/* ============ NAVIGATION ============ */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active from all
            navItems.forEach(function (i) {
                i.classList.remove('active');
            });

            // Add active to clicked
            this.classList.add('active');

            const page = this.getAttribute('data-page');
            const pageTitle = document.querySelector('.page-title');

            if (pageTitle) {
                const pageName = page.charAt(0).toUpperCase() + page.slice(1);
                pageTitle.textContent = pageName;
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
                const overlay = document.querySelector('.sidebar-overlay');
                if (overlay) overlay.classList.remove('active');
            }

            showNotification('Navigated to ' + page.charAt(0).toUpperCase() + page.slice(1), 'info');
        });
    });
}

/* ============ USER DROPDOWN ============ */
function initUserDropdown() {
    const userDropdown = document.querySelector('.user-dropdown');
    if (!userDropdown) return;

    const trigger = userDropdown.querySelector('.user-trigger');
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        userDropdown.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
        if (!userDropdown.contains(e.target)) {
            userDropdown.classList.remove('open');
        }
    });
}

/* ============ LOGOUT ============ */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            document.getElementById('appContainer').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('loginForm').reset();
            const loginBtn = document.getElementById('loginBtn');
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            loginBtn.disabled = false;
        }
    });
}

/* ============ DATE DISPLAY ============ */
function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (!dateEl) return;

    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
}

/* ============ NOTIFICATIONS ============ */
function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    notification.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i> ' + message;

    // Styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '14px 20px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '9999',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideIn 0.3s ease',
        background: type === 'success' ? '#059669' :
                    type === 'error' ? '#dc2626' :
                    type === 'warning' ? '#f59e0b' : '#2563eb'
    });

    document.body.appendChild(notification);

    setTimeout(function () {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(function () { notification.remove(); }, 300);
    }, 3000);
}

// Add animation keyframes dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
