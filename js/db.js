// Gestión de base de datos híbrida con persistencia local permanente (LocalStorage) y sincronización Cloud (TextDB)

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

// Estado en memoria respaldado en LocalStorage
let cloudMemoryState = {
    accounts: [{ ...ADMIN_ACCOUNT }],
    transactions: [],
    deletedIds: [],
    updatedAt: 0
};

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

function persistToStorage() {
    try {
        localStorage.setItem(DB_KEYS.ACCOUNTS, JSON.stringify(cloudMemoryState.accounts));
        localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(cloudMemoryState.transactions));
        localStorage.setItem(DB_KEYS.DELETED_IDS, JSON.stringify(cloudMemoryState.deletedIds));
        localStorage.setItem(DB_KEYS.UPDATED_AT, (cloudMemoryState.updatedAt || Date.now()).toString());
    } catch (_) {}
}

function loadFromStorage() {
    try {
        const storedAccounts = localStorage.getItem(DB_KEYS.ACCOUNTS);
        if (storedAccounts) {
            const parsed = JSON.parse(storedAccounts);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cloudMemoryState.accounts = ensureAdminAccount(parsed);
            }
        }
    } catch (_) {}

    try {
        const storedTxs = localStorage.getItem(DB_KEYS.TRANSACTIONS);
        if (storedTxs) {
            const parsedTxs = JSON.parse(storedTxs);
            if (Array.isArray(parsedTxs)) {
                cloudMemoryState.transactions = parsedTxs;
            }
        }
    } catch (_) {}

    try {
        const storedDeleted = localStorage.getItem(DB_KEYS.DELETED_IDS);
        if (storedDeleted) {
            const parsedDel = JSON.parse(storedDeleted);
            if (Array.isArray(parsedDel)) {
                cloudMemoryState.deletedIds = parsedDel;
            }
        }
    } catch (_) {}

    cloudMemoryState.accounts = ensureAdminAccount(cloudMemoryState.accounts);
    persistToStorage();
}

function initDatabase() {
    loadFromStorage();
    const active = getActiveSession();
    if (active) {
        const u = (active.usuario || '').trim().toLowerCase();
        const n = (active.nombre || '').trim().toLowerCase();
        if (u === 'a' || n === 'a' || active.id === 'acc_a') {
            clearActiveSession();
        } else if (!cloudMemoryState.accounts.some(a => a.id === active.id)) {
            cloudMemoryState.accounts.push(active);
            persistToStorage();
        }
    }
    cloudMemoryState.accounts = ensureAdminAccount(cloudMemoryState.accounts);
}

function getAccountsFromDB() {
    if (!cloudMemoryState.accounts || cloudMemoryState.accounts.length === 0) {
        loadFromStorage();
    }
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

        // Combinar datos locales con los remotos respetando las cuentas recién creadas
        const mergedAccountsMap = new Map();
        remoteAccounts.forEach(a => mergedAccountsMap.set(a.id, a));
        cloudMemoryState.accounts.forEach(a => {
            if (!deletedIds.includes(a.id) && !mergedAccountsMap.has(a.id)) {
                mergedAccountsMap.set(a.id, a);
            }
        });

        cloudMemoryState = {
            accounts: ensureAdminAccount(Array.from(mergedAccountsMap.values())),
            transactions: remoteTxs.length > 0 ? remoteTxs : cloudMemoryState.transactions,
            deletedIds: Array.from(new Set([...cloudMemoryState.deletedIds, ...deletedIds])),
            updatedAt: Math.max(Number(cloudData.updatedAt) || 0, cloudMemoryState.updatedAt || 0)
        };

        persistToStorage();

        const activeSession = getActiveSession();
        if (activeSession) {
            if (cloudMemoryState.deletedIds.includes(activeSession.id)) {
                clearActiveSession();
            } else {
                const updatedActive = cloudMemoryState.accounts.find(a => a.id === activeSession.id);
                if (updatedActive) {
                    setActiveSession(updatedActive);
                }
            }
        }

        window.dispatchEvent(new CustomEvent('bi:cloud-synced', {
            detail: { accounts: cloudMemoryState.accounts, transactions: cloudMemoryState.transactions }
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
    persistToStorage();
    pushDatabaseToCloud();
}

function saveTransactionsToDB(transactions) {
    cloudMemoryState.transactions = (transactions || [])
        .filter(t => t && !cloudMemoryState.deletedIds.includes(t.cuentaId));
    cloudMemoryState.updatedAt = Date.now();
    persistToStorage();
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
    persistToStorage();
    pushDatabaseToCloud();
}

function getActiveSession() {
    try {
        const session = sessionStorage.getItem(DB_KEYS.SESSION) || localStorage.getItem(DB_KEYS.SESSION);
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
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(account));
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
