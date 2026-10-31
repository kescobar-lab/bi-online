// Formateo de moneda Quetzales (Q), fechas y notificaciones

function formatCurrency(amount) {
    const formattedNum = new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
    return `Q ${formattedNum}`;
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

let activeToastHideTimer = null;
let activeToastCleanupTimer = null;
let activeToastDismissHandler = null;

function resolveToastScenario(message, type = 'info') {
    const msg = (message || '').toLowerCase();
    const prefix = window.location.pathname.includes('/html/') ? '../' : '';

    if (msg.includes('saldo inicial')) {
        return {
            title: msg.includes('válido') ? 'Monto Inicial Inválido' : 'Saldo Inicial Registrado',
            accent: '#84cc16',
            titleColor: '#4d7c0f',
            accentBg: 'rgba(163, 230, 53, 0.14)',
            accentGlow: 'rgba(163, 230, 53, 0.38)',
            svgFile: `${prefix}icons/toast-piggy.svg`
        };
    }

    if (msg.includes('saldo insuficiente')) {
        return {
            title: 'Saldo Insuficiente',
            accent: '#fb7185',
            titleColor: '#e11d48',
            accentBg: 'rgba(251, 113, 133, 0.14)',
            accentGlow: 'rgba(251, 113, 133, 0.38)',
            svgFile: `${prefix}icons/toast-wallet.svg`
        };
    }

    if (msg.includes('no encontrad') || msg.includes('no existe')) {
        return {
            title: 'Cuenta No Encontrada',
            accent: '#94a3b8',
            titleColor: '#475569',
            accentBg: 'rgba(148, 163, 184, 0.14)',
            accentGlow: 'rgba(148, 163, 184, 0.35)',
            svgFile: `${prefix}icons/toast-ghost.svg`
        };
    }

    if (msg.includes('misma cuenta')) {
        return {
            title: 'Operación No Permitida',
            accent: '#d97706',
            accentBg: 'rgba(217, 119, 6, 0.16)',
            accentGlow: 'rgba(217, 119, 6, 0.4)',
            svgFile: `${prefix}icons/toast-doubt.svg`
        };
    }

    if (msg.includes('eliminad')) {
        return {
            title: 'Cuenta Eliminada',
            accent: '#b91c1c',
            accentBg: 'rgba(153, 27, 27, 0.2)',
            accentGlow: 'rgba(185, 28, 28, 0.45)',
            svgFile: `${prefix}icons/toast-trash.svg`
        };
    }

    if (msg.includes('sesión cerrada') || msg.includes('cerrar sesión')) {
        return {
            title: 'Sesión Finalizada',
            accent: '#e11d48',
            accentBg: 'rgba(225, 29, 72, 0.16)',
            accentGlow: 'rgba(225, 29, 72, 0.42)',
            svgFile: `${prefix}icons/toast-logout.svg`
        };
    }

    if (type === 'success' || msg.includes('éxito') || msg.includes('exitosamente')) {
        let title = 'Operación Exitosa';
        if (msg.includes('transferencia')) title = 'Transferencia Realizada';
        else if (msg.includes('pago')) title = 'Pago de Servicio Exitoso';
        else if (msg.includes('cuenta bi creada')) title = 'Cuenta Creada con Éxito';

        return {
            title: title,
            accent: '#10b981',
            accentBg: 'rgba(16, 185, 129, 0.15)',
            accentGlow: 'rgba(16, 185, 129, 0.4)',
            svgFile: `${prefix}icons/toast-check.svg`
        };
    }

    if (type === 'danger') {
        let title = 'Verificación Requerida';
        if (msg.includes('credenciales')) title = 'Credenciales Incorrectas';
        else if (msg.includes('mayor de 18')) title = 'Requisito de Edad';
        else if (msg.includes('ya existe')) title = 'Registro Duplicado';

        return {
            title: title,
            accent: '#f43f5e',
            accentBg: 'rgba(244, 63, 94, 0.15)',
            accentGlow: 'rgba(244, 63, 94, 0.38)',
            svgFile: `${prefix}icons/toast-warning.svg`
        };
    }

    return {
        title: msg.includes('credenciales cargadas') ? 'Credenciales Cargadas' : 'Aviso Bi en Línea',
        accent: '#00c1d4',
        accentBg: 'rgba(0, 193, 212, 0.14)',
        accentGlow: 'rgba(0, 193, 212, 0.38)',
        svgFile: `${prefix}icons/toast-bi-sparks.svg`
    };
}

function hideActiveToast() {
    const toastEl = document.getElementById('appToast');
    if (!toastEl) return;

    if (activeToastHideTimer) {
        clearTimeout(activeToastHideTimer);
        activeToastHideTimer = null;
    }
    if (activeToastDismissHandler) {
        document.removeEventListener('pointerdown', activeToastDismissHandler, true);
        activeToastDismissHandler = null;
    }

    if (!toastEl.classList.contains('bi-toast-visible')) return;

    toastEl.classList.remove('bi-toast-entering');
    toastEl.classList.add('bi-toast-leaving');

    if (activeToastCleanupTimer) clearTimeout(activeToastCleanupTimer);
    activeToastCleanupTimer = setTimeout(() => {
        toastEl.classList.remove('bi-toast-visible', 'bi-toast-leaving');
    }, 360);
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('appToast');
    if (!toastEl) return;

    if (activeToastHideTimer) clearTimeout(activeToastHideTimer);
    if (activeToastCleanupTimer) clearTimeout(activeToastCleanupTimer);
    if (activeToastDismissHandler) {
        document.removeEventListener('pointerdown', activeToastDismissHandler, true);
        activeToastDismissHandler = null;
    }

    const scenario = resolveToastScenario(message, type);
    const isCredentialsToast = (message || '').toLowerCase().includes('credenciales cargadas');

    toastEl.style.setProperty('--toast-accent', scenario.accent);
    toastEl.style.setProperty('--toast-title-color', scenario.titleColor || scenario.accent);
    toastEl.style.setProperty('--toast-accent-bg', scenario.accentBg);
    toastEl.style.setProperty('--toast-accent-glow', scenario.accentGlow);

    toastEl.innerHTML = `
        <img src="${scenario.svgFile}" class="bi-toast-scene-svg" alt="">
        <div class="bi-toast-card ${isCredentialsToast ? 'is-credentials-toast' : ''}">
            <div class="bi-toast-title">${scenario.title}</div>
            <p class="bi-toast-desc">${message}</p>
        </div>
    `;

    toastEl.onclick = () => {
        hideActiveToast();
    };

    toastEl.classList.remove('toast', 'fade', 'hide', 'bi-toast-leaving', 'bi-toast-entering');
    void toastEl.offsetWidth;
    toastEl.classList.add('bi-toast-visible', 'bi-toast-entering');

    activeToastHideTimer = setTimeout(() => {
        hideActiveToast();
    }, 4500);

    setTimeout(() => {
        activeToastDismissHandler = (e) => {
            if (toastEl.contains(e.target)) return;
            hideActiveToast();
        };
        document.addEventListener('pointerdown', activeToastDismissHandler, true);
    }, 800);
}
