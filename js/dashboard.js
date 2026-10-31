/* Módulo de Banca en Línea (Dashboard) */

document.addEventListener('DOMContentLoaded', () => {
    const rootPrefix = window.location.pathname.includes('/html/') ? '../' : '';

    // Verificación de sesión activa
    let activeUser = getActiveSession();
    if (!activeUser) {
        window.location.href = `${rootPrefix}index.html`;
        return;
    }

    setupCard3D('cardFlipperDash');
    let isBalanceMasked = localStorage.getItem(DB_KEYS.MASK_STATE) === 'true';

    // Actualización de datos del usuario en pantalla
    function refreshUserData() {
        const accounts = getAccountsFromDB();
        const found = accounts.find(a => a.id === activeUser.id);
        if (found) {
            activeUser = found;
            setActiveSession(found);
        }

        const profileNombre = document.getElementById('profileNombre');
        const profileUsuario = document.getElementById('profileUsuario');
        const profileCuenta = document.getElementById('profileCuenta');
        const profileCorreo = document.getElementById('profileCorreo');

        if (profileNombre) profileNombre.textContent = activeUser.nombre || 'Titular Bi';
        if (profileUsuario) profileUsuario.textContent = `@${activeUser.usuario || activeUser.id}`;
        if (profileCuenta) profileCuenta.textContent = activeUser.numeroCuenta || '---';
        if (profileCorreo) profileCorreo.textContent = activeUser.correo || '---';

        const activeTier = applyBiCardToElements({
            frontId: 'dashCardFront',
            backId: 'dashCardBack',
            holderFrontId: 'dashCardHolder',
            holderBackId: 'dashCardHolderBack',
            account: activeUser,
            rootPrefix: rootPrefix
        });

        const balanceEl = document.getElementById('dashMainBalance');
        if (balanceEl) {
            balanceEl.textContent = isBalanceMasked ? '••••••••' : formatCurrency(activeUser.saldo);
        }

        const switchEl = document.getElementById('switchHideBalance');
        if (switchEl) {
            switchEl.checked = isBalanceMasked;
        }

        const accNumEl = document.getElementById('dashAccountNumber');
        if (accNumEl) accNumEl.textContent = activeUser.numeroCuenta;

        const accTypeEl = document.getElementById('dashAccountType');
        if (accTypeEl) accTypeEl.textContent = `Tarjeta ${activeTier.name}`;

        renderTransactions();
    }

    // Historial y filtrado de transacciones
    let currentFilter = 'all';

    function renderTransactions() {
        const txs = getTransactionsFromDB();
        const userTxs = txs.filter(t => t.cuentaId === activeUser.id);

        let totalIncome = 0;
        let totalExpense = 0;
        userTxs.forEach(t => {
            if (t.tipo === 'credito') totalIncome += t.monto;
            if (t.tipo === 'debito') totalExpense += t.monto;
        });

        const incomeEl = document.getElementById('dashTotalIncome');
        const expenseEl = document.getElementById('dashTotalExpense');
        if (incomeEl) incomeEl.textContent = isBalanceMasked ? '••••••' : formatCurrency(totalIncome);
        if (expenseEl) expenseEl.textContent = isBalanceMasked ? '••••••' : formatCurrency(totalExpense);

        let filtered = userTxs;
        if (currentFilter === 'income') {
            filtered = userTxs.filter(t => t.tipo === 'credito');
        } else if (currentFilter === 'expense') {
            filtered = userTxs.filter(t => t.tipo === 'debito');
        }

        const tableBody = document.getElementById('transactionsTableBody');
        const emptyState = document.getElementById('transactionsEmptyState');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (filtered.length === 0) {
            if (emptyState) emptyState.classList.remove('d-none');
            return;
        }
        if (emptyState) emptyState.classList.add('d-none');

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            const isCredit = t.tipo === 'credito';
            const badgeClass = isCredit ? 'is-credit' : 'is-debit';
            const typeLabel = isCredit ? 'Ingreso' : 'Egreso';
            const amountFormatted = `${isCredit ? '+' : '-'}${formatCurrency(t.monto)}`;
            const iconPath = isCredit ? `${rootPrefix}icons/tx-income-arrow.svg` : `${rootPrefix}icons/tx-expense-arrow.svg`;

            tr.innerHTML = `
                <td class="col-tx-desc">
                    <div class="fw-semibold text-light">${t.concepto}</div>
                    <div class="text-secondary small">${t.origenDestino || 'Banco Industrial'}</div>
                </td>
                <td class="col-tx-type text-center">
                    <span class="bi-tx-type-badge ${badgeClass}">
                        <img src="${iconPath}" class="bi-tx-type-svg" alt="">
                        <span>${typeLabel}</span>
                    </span>
                </td>
                <td class="col-tx-date text-center text-secondary small">${formatDateTime(t.fecha)}</td>
                <td class="col-tx-amount text-center fw-bold ${isCredit ? 'text-success' : 'text-danger'}" style="font-size: 1rem;">
                    ${isBalanceMasked ? '••••••' : amountFormatted}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    document.getElementById('switchHideBalance')?.addEventListener('change', (e) => {
        isBalanceMasked = e.target.checked;
        localStorage.setItem(DB_KEYS.MASK_STATE, isBalanceMasked);
        refreshUserData();
    });

    document.querySelectorAll('.btn-filter-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.btn-filter-tx').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter') || 'all';
            renderTransactions();
        });
    });

    // Cajón desplegable de movimientos
    const movementsDrawerCard = document.getElementById('movementsDrawerCard');
    const movementsBackdrop = document.getElementById('movementsBackdrop');
    let movementsCloseTimer = null;

    function openMovementsDrawer() {
        if (!movementsDrawerCard || movementsDrawerCard.classList.contains('is-expanded')) return;
        if (movementsCloseTimer) {
            clearTimeout(movementsCloseTimer);
            movementsCloseTimer = null;
        }
        movementsDrawerCard.classList.remove('is-closing');
        movementsDrawerCard.classList.add('is-expanded');
        movementsBackdrop?.classList.remove('d-none');
        document.body.classList.add('bi-movements-open');
    }

    function closeMovementsDrawer() {
        if (!movementsDrawerCard || !movementsDrawerCard.classList.contains('is-expanded')) return;
        movementsDrawerCard.classList.add('is-closing');
        movementsBackdrop?.classList.add('d-none');
        document.body.classList.remove('bi-movements-open');

        if (movementsCloseTimer) clearTimeout(movementsCloseTimer);
        movementsCloseTimer = setTimeout(() => {
            movementsDrawerCard.classList.remove('is-expanded', 'is-closing');
            movementsCloseTimer = null;
        }, 270);
    }

    movementsDrawerCard?.addEventListener('click', (e) => {
        if (!movementsDrawerCard.classList.contains('is-expanded')) {
            openMovementsDrawer();
            return;
        }
        const clickedInsideTable = e.target.closest('#movementsTable');
        const clickedInsideFilters = e.target.closest('.bi-tx-segmented-filter');
        const clickedInsideScroll = e.target.closest('.bi-movements-scroll-area');
        if (!clickedInsideTable && !clickedInsideFilters && !clickedInsideScroll) {
            closeMovementsDrawer();
        }
    });

    movementsBackdrop?.addEventListener('click', () => {
        closeMovementsDrawer();
    });

    // Navegación entre vistas del Dashboard
    const navTabs = {
        Cuentas: document.getElementById('tabContentCuentas'),
        Transferencias: document.getElementById('tabContentTransferencias'),
        Servicios: document.getElementById('tabContentServicios'),
        EstadoCuenta: document.getElementById('tabContentEstadoCuenta')
    };

    function switchDashTab(tabKey) {
        Object.keys(navTabs).forEach(k => {
            if (navTabs[k]) navTabs[k].classList.add('d-none');
            const navLink = document.getElementById(`navTab${k}`);
            if (navLink) navLink.classList.remove('active');
        });

        if (navTabs[tabKey]) navTabs[tabKey].classList.remove('d-none');
        const activeNavLink = document.getElementById(`navTab${tabKey}`);
        if (activeNavLink) activeNavLink.classList.add('active');

        // Control dinámico del botón Volver superior para dispositivos móviles
        const btnTopbarBack = document.getElementById('btnTopbarBack');
        if (btnTopbarBack) {
            if (tabKey === 'Cuentas') {
                btnTopbarBack.classList.add('d-none');
            } else {
                btnTopbarBack.classList.remove('d-none');
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.getElementById('navTabDashboard')?.addEventListener('click', (e) => { e.preventDefault(); switchDashTab('Cuentas'); });
    document.getElementById('navTabTransferencias')?.addEventListener('click', (e) => { e.preventDefault(); switchDashTab('Transferencias'); });
    document.getElementById('navTabServicios')?.addEventListener('click', (e) => { e.preventDefault(); switchDashTab('Servicios'); });
    document.getElementById('navTabEstadoCuenta')?.addEventListener('click', (e) => { e.preventDefault(); switchDashTab('EstadoCuenta'); });

    document.getElementById('quickActionTransfer')?.addEventListener('click', () => switchDashTab('Transferencias'));
    document.getElementById('quickActionServices')?.addEventListener('click', () => switchDashTab('Servicios'));
    document.getElementById('quickActionStatement')?.addEventListener('click', () => openStatementModal());
    document.querySelectorAll('.btn-volver-cuentas').forEach(btn => {
        btn.addEventListener('click', () => switchDashTab('Cuentas'));
    });

    // Transferencias y autocompletado de cuentas destino
    const transferDestinoInput = document.getElementById('transferDestino');
    const biDestinosDatalist = document.getElementById('biDestinosDatalist');

    function populateTransferDestinosList() {
        if (!biDestinosDatalist) return;
        biDestinosDatalist.innerHTML = '';
        const accounts = getAccountsFromDB().filter(a => a.id !== activeUser.id && a.id !== 'acc_admin');
        accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.numeroCuenta;
            opt.label = `${acc.nombre} (${acc.usuario || acc.tipo})`;
            biDestinosDatalist.appendChild(opt);
        });
    }

    populateTransferDestinosList();

    transferDestinoInput?.addEventListener('change', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (!val) return;
        const accounts = getAccountsFromDB().filter(a => a.id !== activeUser.id);
        const match = accounts.find(a =>
            (a.numeroCuenta || '').toLowerCase() === val ||
            (a.nombre || '').toLowerCase() === val ||
            (a.usuario || '').toLowerCase() === val
        );
        if (match) {
            e.target.value = match.numeroCuenta;
        }
    });

    document.getElementById('formTransferencia')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const destAccount = document.getElementById('transferDestino')?.value.trim();
        const amount = parseFloat(document.getElementById('transferMonto')?.value);
        const concept = document.getElementById('transferConcepto')?.value.trim();

        if (!destAccount || isNaN(amount) || amount <= 0 || !concept) {
            showToast('Por favor verifica los datos de la transferencia', 'danger');
            return;
        }

        if (destAccount === activeUser.numeroCuenta) {
            showToast('No puedes transferir fondos hacia la misma cuenta de origen', 'danger');
            return;
        }

        if (activeUser.saldo < amount) {
            showToast('Saldo insuficiente para realizar esta transferencia', 'danger');
            return;
        }

        const accounts = getAccountsFromDB();
        const recipient = accounts.find(a => a.numeroCuenta === destAccount);

        if (!recipient) {
            showToast('Número de cuenta destino no encontrado en Banco Industrial', 'danger');
            return;
        }

        activeUser.saldo -= amount;
        recipient.saldo += amount;

        const senderIdx = accounts.findIndex(a => a.id === activeUser.id);
        const recipientIdx = accounts.findIndex(a => a.id === recipient.id);
        accounts[senderIdx] = activeUser;
        accounts[recipientIdx] = recipient;
        saveAccountsToDB(accounts);
        setActiveSession(activeUser);

        const txs = getTransactionsFromDB();
        const now = new Date().toISOString();

        txs.unshift({
            id: 'tx_' + Date.now(),
            cuentaId: activeUser.id,
            fecha: now,
            tipo: 'debito',
            concepto: `Transferencia Bi: ${concept}`,
            monto: amount,
            categoria: 'Transferencia Enviada',
            origenDestino: `${recipient.nombre} (${recipient.numeroCuenta})`
        });

        txs.unshift({
            id: 'tx_' + (Date.now() + 1),
            cuentaId: recipient.id,
            fecha: now,
            tipo: 'credito',
            concepto: `Transferencia Bi Recibida: ${concept}`,
            monto: amount,
            categoria: 'Transferencia Recibida',
            origenDestino: `${activeUser.nombre} (${activeUser.numeroCuenta})`
        });

        saveTransactionsToDB(txs);

        e.target.reset();
        refreshUserData();
        showToast(`¡Transferencia de ${formatCurrency(amount)} realizada con éxito!`, 'success');
        switchDashTab('Cuentas');
    });

    // Pago de servicios e impuestos
    document.getElementById('formPagoServicio')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const servicio = document.getElementById('servicioNombre')?.value;
        const referencia = document.getElementById('servicioReferencia')?.value.trim();
        const monto = parseFloat(document.getElementById('servicioMonto')?.value);

        if (!servicio || !referencia || isNaN(monto) || monto <= 0) {
            showToast('Ingresa los datos válidos del servicio o impuesto a pagar', 'danger');
            return;
        }

        if (activeUser.saldo < monto) {
            showToast('Saldo insuficiente para completar el pago', 'danger');
            return;
        }

        activeUser.saldo -= monto;
        const accounts = getAccountsFromDB();
        const userIdx = accounts.findIndex(a => a.id === activeUser.id);
        accounts[userIdx] = activeUser;
        saveAccountsToDB(accounts);
        setActiveSession(activeUser);

        const isTax = /^(SAT|IUSI|Arbitrio|IGSS|EMETRA|Contraloría)/i.test(servicio);
        const tipoConcepto = isTax ? 'Pago de Impuesto' : 'Pago de Servicio';

        const txs = getTransactionsFromDB();
        txs.unshift({
            id: 'tx_' + Date.now(),
            cuentaId: activeUser.id,
            fecha: new Date().toISOString(),
            tipo: 'debito',
            concepto: `${tipoConcepto}: ${servicio} (Ref: ${referencia})`,
            monto: monto,
            categoria: isTax ? 'Impuestos' : 'Servicios',
            origenDestino: servicio
        });
        saveTransactionsToDB(txs);

        e.target.reset();
        refreshUserData();
        showToast(`¡Pago de ${servicio} por ${formatCurrency(monto)} completado exitosamente!`, 'success');
        switchDashTab('Cuentas');
    });

    // Modal de Estado de Cuenta
    function openStatementModal() {
        const modalEl = document.getElementById('statementModal');
        if (!modalEl) return;

        document.getElementById('stmtTitular').textContent = activeUser.nombre;
        document.getElementById('stmtIdNumber').textContent = `DPI: ${activeUser.dpi || 'N/A'}`;
        document.getElementById('stmtAccountNum').textContent = activeUser.numeroCuenta;
        document.getElementById('stmtAccountType').textContent = activeUser.tipo;
        document.getElementById('stmtEmisionDate').textContent = `Emisión: ${new Date().toLocaleDateString('es-GT')}`;

        const txs = getTransactionsFromDB().filter(t => t.cuentaId === activeUser.id);
        let totalAbonos = 0;
        let totalCargos = 0;

        const tableBody = document.getElementById('stmtTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            txs.forEach(t => {
                if (t.tipo === 'credito') totalAbonos += t.monto;
                if (t.tipo === 'debito') totalCargos += t.monto;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDateTime(t.fecha)}</td>
                    <td>${t.concepto}</td>
                    <td>${t.origenDestino || '-'}</td>
                    <td class="text-end text-success">${t.tipo === 'credito' ? formatCurrency(t.monto) : '-'}</td>
                    <td class="text-end text-danger">${t.tipo === 'debito' ? formatCurrency(t.monto) : '-'}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

        document.getElementById('stmtTotalAbonos').textContent = formatCurrency(totalAbonos);
        document.getElementById('stmtTotalCargos').textContent = formatCurrency(totalCargos);
        document.getElementById('stmtFinalBalance').textContent = formatCurrency(activeUser.saldo);

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    document.getElementById('btnImprimirEstado')?.addEventListener('click', () => {
        window.print();
    });

    // Menú de perfil, cierre de sesión y eliminación de cuenta
    const btnUserProfile = document.getElementById('btnUserProfile');
    const userProfileDropdown = document.getElementById('userProfileDropdown');
    const profileMenuWrapper = document.getElementById('profileMenuWrapper');
    const btnDeleteAccountTrigger = document.getElementById('btnDeleteAccountTrigger');
    const deleteAccountConfirmBox = document.getElementById('deleteAccountConfirmBox');
    const btnConfirmDeleteAccount = document.getElementById('btnConfirmDeleteAccount');
    const btnCancelDeleteAccount = document.getElementById('btnCancelDeleteAccount');

    let profileCloseTimer = null;

    function openProfileDropdown() {
        if (!userProfileDropdown || !btnUserProfile) return;
        if (profileCloseTimer) {
            clearTimeout(profileCloseTimer);
            profileCloseTimer = null;
        }
        userProfileDropdown.classList.remove('d-none', 'is-closing');
        btnUserProfile.classList.add('is-open');
        btnUserProfile.setAttribute('aria-expanded', 'true');
    }

    function closeProfileDropdown() {
        if (!userProfileDropdown || !btnUserProfile) return;
        if (userProfileDropdown.classList.contains('d-none') || userProfileDropdown.classList.contains('is-closing')) return;

        btnUserProfile.classList.remove('is-open');
        btnUserProfile.setAttribute('aria-expanded', 'false');
        userProfileDropdown.classList.add('is-closing');

        if (profileCloseTimer) clearTimeout(profileCloseTimer);
        profileCloseTimer = setTimeout(() => {
            userProfileDropdown.classList.add('d-none');
            userProfileDropdown.classList.remove('is-closing');
            deleteAccountConfirmBox?.classList.add('d-none');
            btnDeleteAccountTrigger?.classList.remove('d-none');
            profileCloseTimer = null;
        }, 235);
    }

    btnUserProfile?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyClosed = userProfileDropdown?.classList.contains('d-none') || userProfileDropdown?.classList.contains('is-closing');
        if (isCurrentlyClosed) {
            openProfileDropdown();
        } else {
            closeProfileDropdown();
        }
    });

    document.addEventListener('click', (e) => {
        if (profileMenuWrapper && !profileMenuWrapper.contains(e.target)) {
            closeProfileDropdown();
        }
    });

    btnDeleteAccountTrigger?.addEventListener('click', () => {
        btnDeleteAccountTrigger.classList.add('d-none');
        deleteAccountConfirmBox?.classList.remove('d-none');
    });

    btnCancelDeleteAccount?.addEventListener('click', () => {
        deleteAccountConfirmBox?.classList.add('d-none');
        btnDeleteAccountTrigger?.classList.remove('d-none');
    });

    btnConfirmDeleteAccount?.addEventListener('click', () => {
        if (typeof deleteAccountFromDB === 'function') {
            deleteAccountFromDB(activeUser.id);
        } else {
            const accounts = getAccountsFromDB().filter(a => a.id !== activeUser.id);
            saveAccountsToDB(accounts);

            const txs = getTransactionsFromDB().filter(t => t.cuentaId !== activeUser.id);
            saveTransactionsToDB(txs);
        }

        clearActiveSession();
        showToast('Tu cuenta Bi ha sido eliminada permanentemente.', 'danger');
        setTimeout(() => {
            window.location.href = `${rootPrefix}index.html`;
        }, 1600);
    });

    window.addEventListener('bi:cloud-synced', () => {
        refreshUserData();
        populateTransferDestinosList();
    });

    document.getElementById('btnLogout')?.addEventListener('click', () => {
        closeProfileDropdown();
        clearActiveSession();
        showToast('Sesión cerrada correctamente', 'info');
        setTimeout(() => {
            window.location.href = `${rootPrefix}index.html`;
        }, 1800);
    });

    refreshUserData();

    // Registro de saldo inicial para cuentas nuevas
    const initialBalanceOverlay = document.getElementById('initialBalanceOverlay');
    const formSaldoInicial = document.getElementById('formSaldoInicial');
    const inputSaldoInicial = document.getElementById('inputSaldoInicial');

    const userTxsCheck = getTransactionsFromDB().filter(t => t.cuentaId === activeUser.id);
    const hasLegacyDefaultBonusOnly =
        userTxsCheck.length === 1 &&
        userTxsCheck[0].concepto === 'Bono de Apertura de Cuenta Bi Digital' &&
        activeUser.requiereSaldoInicial === undefined;

    if ((activeUser.requiereSaldoInicial || hasLegacyDefaultBonusOnly) && initialBalanceOverlay) {
        initialBalanceOverlay.classList.remove('d-none');
        setTimeout(() => {
            inputSaldoInicial?.focus();
        }, 120);
    }

    formSaldoInicial?.addEventListener('submit', (e) => {
        e.preventDefault();
        const montoInicial = parseFloat(inputSaldoInicial?.value || '0');

        if (isNaN(montoInicial) || montoInicial <= 0) {
            showToast('Ingresa un saldo inicial válido mayor a Q 0.00.', 'danger');
            inputSaldoInicial?.focus();
            return;
        }

        const montoRedondeado = Number(montoInicial.toFixed(2));
        const accounts = getAccountsFromDB();
        const accountIdx = accounts.findIndex(a => a.id === activeUser.id);

        if (accountIdx !== -1) {
            accounts[accountIdx].saldo = montoRedondeado;
            accounts[accountIdx].requiereSaldoInicial = false;
            saveAccountsToDB(accounts);
            activeUser = accounts[accountIdx];
            setActiveSession(activeUser);
        } else {
            activeUser.saldo = montoRedondeado;
            activeUser.requiereSaldoInicial = false;
            setActiveSession(activeUser);
        }

        const txs = getTransactionsFromDB().filter(
            t => !(t.cuentaId === activeUser.id && t.concepto === 'Bono de Apertura de Cuenta Bi Digital')
        );
        txs.unshift({
            id: 'tx_' + Date.now(),
            cuentaId: activeUser.id,
            fecha: new Date().toISOString(),
            tipo: 'credito',
            concepto: 'Saldo Inicial de Apertura Bi en Línea',
            monto: montoRedondeado,
            categoria: 'Apertura',
            origenDestino: 'Depósito Inicial'
        });
        saveTransactionsToDB(txs);

        initialBalanceOverlay?.classList.add('d-none');
        refreshUserData();
        showToast(`Saldo inicial de ${formatCurrency(montoRedondeado)} registrado y disponible.`, 'success');
    });
});
