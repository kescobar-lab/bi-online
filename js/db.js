// Gestión de base de datos exclusivamente en la nube (TextDB Cloud API)

const DB_KEYS = {
    ACCOUNTS: 'bi_accounts_db',
    TRANSACTIONS: 'bi_transactions_db',
    SESSION: 'bi_active_session',
    MASK_STATE: 'bi_mask_balance_state',
    DELETED_IDS: 'bi_deleted_accounts_db',
    UPDATED_AT: 'bi_db_updated_at'
};

const CLOUD_DB_URL = 'https://textdb.dev/api/data/bi-banco-industrial-2026-gt-db';

const ADMIN_ACCOUNT = {
    id: 'acc_admin',
    numeroCuenta: '001-100200-1',
    nombres: 'Administrador',
    apellidos: 'Sistema Bi',
    nombre: 'Administrador Sistema Bi',
    usuario: 'ADMIN',
    correo: 'admin@bi.com.gt',
    password: 'admin',
    pin: '123456',
    dpi: '1234567890101',
    tipo: 'Cuenta Monetaria Bi Black',
    saldo: 7500000.00,
    requiereSaldoInicial: false,
    fechaApertura: '2026-01-01'
};

// Estado en memoria sincronizado únicamente con la nube
let cloudMemoryState = {
    accounts: [{ ...ADMIN_ACCOUNT }],
    transactions: [],
    deletedIds: [],
    updatedAt: 0
};

function clearLegacyLocalDatabase() {
    try {
        localStorage.removeItem(DB_KEYS.ACCOUNTS);
        localStorage.removeItem(DB_KEYS.TRANSACTIONS);
        localStorage.removeItem(DB_KEYS.DELETED_IDS);
        localStorage.removeItem(DB_KEYS.UPDATED_AT);
        localStorage.removeItem(DB_KEYS.SESSION);
    } catch (_) {}
}

function ensureAdminAccount(accounts) {
    const list = Array.isArray(accounts) ? [...accounts] : [];
    const filteredList = list.filter(a => {
        if (!a) return false;
        const u = (a.usuario || '').trim().toLowerCase();
        const n = (a.nombre || '').trim().toLowerCase();
        const nom = (a.nombres || '').trim().toLowerCase();
        return u !== 'a' && n !== 'a' && nom !== 'a' && a.id !== 'acc_a';
    });
    const adminIndex = filteredList.findIndex(a => a && ((a.usuario && a.usuario.toUpperCase() === 'ADMIN') || a.id === 'acc_admin'));
    if (adminIndex === -1) {
        filteredList.unshift({ ...ADMIN_ACCOUNT });
    } else {
        filteredList[adminIndex].usuario = 'ADMIN';
        filteredList[adminIndex].password = 'admin';
        filteredList[adminIndex].pin = '123456';
    }
    return filteredList;
}

function initDatabase() {
    clearLegacyLocalDatabase();
    const active = getActiveSession();
    if (active) {
        const u = (active.usuario || '').trim().toLowerCase();
        const n = (active.nombre || '').trim().toLowerCase();
        if (u === 'a' || n === 'a' || active.id === 'acc_a') {
            clearActiveSession();
        } else if (!cloudMemoryState.accounts.some(a => a.id === active.id)) {
            cloudMemoryState.accounts.push(active);
        }
    }
    cloudMemoryState.accounts = ensureAdminAccount(cloudMemoryState.accounts);
}

function getAccountsFromDB() {
    return ensureAdminAccount(cloudMemoryState.accounts);
}

function getTransactionsFromDB() {
    return [...cloudMemoryState.transactions];
}

async function pushDatabaseToCloud() {
    try {
        const payload = {
            accounts: ensureAdminAccount(cloudMemoryState.accounts),
            transactions: cloudMemoryState.transactions,
            deletedIds: cloudMemoryState.deletedIds,
            updatedAt: cloudMemoryState.updatedAt || Date.now()
        };

        await fetch(CLOUD_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify(payload),
            keepalive: true
        });
    } catch (_) {}
}

async function pullDatabaseFromCloud() {
    try {
        const response = await fetch(`${CLOUD_DB_URL}?t=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store'
        });
        if (!response.ok) return false;

        const text = await response.text();
        if (!text || !text.trim()) return false;

        const cloudData = JSON.parse(text);
        if (!cloudData || !Array.isArray(cloudData.accounts)) return false;

        const deletedIds = Array.isArray(cloudData.deletedIds) ? cloudData.deletedIds : [];
        const remoteAccounts = ensureAdminAccount(
            cloudData.accounts.filter(a => a && !deletedIds.includes(a.id))
        );
        const remoteTxs = (Array.isArray(cloudData.transactions) ? cloudData.transactions : [])
            .filter(t => t && !deletedIds.includes(t.cuentaId))
            .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

        cloudMemoryState = {
            accounts: remoteAccounts,
            transactions: remoteTxs,
            deletedIds: deletedIds,
            updatedAt: Number(cloudData.updatedAt) || Date.now()
        };

        const activeSession = getActiveSession();
        if (activeSession) {
            if (deletedIds.includes(activeSession.id)) {
                clearActiveSession();
            } else {
                const updatedActive = remoteAccounts.find(a => a.id === activeSession.id);
                if (updatedActive) {
                    setActiveSession(updatedActive);
                }
            }
        }

        window.dispatchEvent(new CustomEvent('bi:cloud-synced', {
            detail: { accounts: remoteAccounts, transactions: remoteTxs }
        }));
        return true;
    } catch (_) {
        return false;
    }
}

function saveAccountsToDB(accounts) {
    cloudMemoryState.accounts = ensureAdminAccount(
        (accounts || []).filter(a => a && !cloudMemoryState.deletedIds.includes(a.id))
    );
    cloudMemoryState.updatedAt = Date.now();
    pushDatabaseToCloud();
}

function saveTransactionsToDB(transactions) {
    cloudMemoryState.transactions = (transactions || [])
        .filter(t => t && !cloudMemoryState.deletedIds.includes(t.cuentaId));
    cloudMemoryState.updatedAt = Date.now();
    pushDatabaseToCloud();
}

function deleteAccountFromDB(accountId) {
    if (!accountId || accountId === 'acc_admin') return;
    if (!cloudMemoryState.deletedIds.includes(accountId)) {
        cloudMemoryState.deletedIds.push(accountId);
    }
    cloudMemoryState.accounts = ensureAdminAccount(
        cloudMemoryState.accounts.filter(a => a && a.id !== accountId)
    );
    cloudMemoryState.transactions = cloudMemoryState.transactions.filter(
        t => t && t.cuentaId !== accountId
    );
    cloudMemoryState.updatedAt = Date.now();
    pushDatabaseToCloud();
}

function getActiveSession() {
    try {
        const session = sessionStorage.getItem(DB_KEYS.SESSION);
        if (!session) return null;
        return JSON.parse(session);
    } catch (_) {
        return null;
    }
}

function setActiveSession(account) {
    if (!account) return;
    try {
        sessionStorage.setItem(DB_KEYS.SESSION, JSON.stringify(account));
    } catch (_) {}
}

function clearActiveSession() {
    try {
        sessionStorage.removeItem(DB_KEYS.SESSION);
        localStorage.removeItem(DB_KEYS.SESSION);
    } catch (_) {}
}

initDatabase();
pullDatabaseFromCloud();
window.addEventListener('focus', () => {
    pullDatabaseFromCloud();
});
