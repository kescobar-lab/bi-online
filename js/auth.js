/* Módulo de Autenticación y Registro (Bi en Línea) */

document.addEventListener('DOMContentLoaded', () => {
    const btnSwitchLogin = document.getElementById('btnSwitchLogin');
    const btnSwitchRegister = document.getElementById('btnSwitchRegister');
    const paneLogin = document.getElementById('paneLogin');
    const paneRegister = document.getElementById('paneRegister');

    const formLogin = document.getElementById('formLogin');
    const loginPin = document.getElementById('loginPin');
    const loginUsuario = document.getElementById('loginUsuario');
    const loginPassword = document.getElementById('loginPassword');

    const formRegistro = document.getElementById('formRegistro');
    const regNombres = document.getElementById('regNombres');
    const regApellidos = document.getElementById('regApellidos');
    const regCorreo = document.getElementById('regCorreo');
    const regDpi = document.getElementById('regDpi');
    const regDia = document.getElementById('regDia');
    const regMes = document.getElementById('regMes');
    const regAnio = document.getElementById('regAnio');
    const regPassword = document.getElementById('regPassword');

    const modalCredenciales = document.getElementById('modalCredenciales');
    const modalUsuarioGenerado = document.getElementById('modalUsuarioGenerado');
    const modalPinGenerado = document.getElementById('modalPinGenerado');
    const modalNombreCompleto = document.getElementById('modalNombreCompleto');
    const btnIrALoginDesdeModal = document.getElementById('btnIrALoginDesdeModal');

    // Cambio entre pestañas de Login y Registro
    function setAuthTab(tab) {
        const scrollArea = document.querySelector('.bi-auth-scroll-area');
        if (scrollArea) scrollArea.scrollTop = 0;

        if (tab === 'register') {
            btnSwitchRegister?.classList.add('active');
            btnSwitchRegister?.setAttribute('aria-selected', 'true');
            btnSwitchLogin?.classList.remove('active');
            btnSwitchLogin?.setAttribute('aria-selected', 'false');

            paneRegister?.classList.remove('d-none');
            paneLogin?.classList.add('d-none');
        } else {
            btnSwitchLogin?.classList.add('active');
            btnSwitchLogin?.setAttribute('aria-selected', 'true');
            btnSwitchRegister?.classList.remove('active');
            btnSwitchRegister?.setAttribute('aria-selected', 'false');

            paneLogin?.classList.remove('d-none');
            paneRegister?.classList.add('d-none');
        }
    }

    btnSwitchLogin?.addEventListener('click', () => setAuthTab('login'));
    btnSwitchRegister?.addEventListener('click', () => setAuthTab('register'));

    // Autocompletado de credenciales desde la base de datos activa
    const biUsuariosDatalist = document.getElementById('biUsuariosDatalist');
    const biPinsDatalist = document.getElementById('biPinsDatalist');
    let lastCreatedCredentials = null;

    function refreshLoginAutocompleteLists() {
        const accounts = getAccountsFromDB().filter(acc => {
            if (!acc) return false;
            const u = (acc.usuario || '').trim().toLowerCase();
            const n = (acc.nombre || '').trim().toLowerCase();
            return u !== 'a' && n !== 'a';
        });
        if (biUsuariosDatalist) {
            biUsuariosDatalist.innerHTML = '';
            accounts.forEach(acc => {
                if (!acc.usuario) return;
                const opt = document.createElement('option');
                opt.value = acc.usuario.toUpperCase();
                opt.label = `${acc.nombre || acc.usuario} • PIN: ${acc.pin || '123456'}`;
                biUsuariosDatalist.appendChild(opt);
            });
        }
        if (biPinsDatalist) {
            biPinsDatalist.innerHTML = '';
            accounts.forEach(acc => {
                if (!acc.pin) return;
                const opt = document.createElement('option');
                opt.value = acc.pin;
                opt.label = `${acc.usuario} (${acc.nombre || ''})`;
                biPinsDatalist.appendChild(opt);
            });
        }
    }

    refreshLoginAutocompleteLists();
    window.addEventListener('bi:cloud-synced', () => {
        refreshLoginAutocompleteLists();
    });

    function autoFillFromPin(pinVal) {
        if (!pinVal || pinVal.length !== 6) return;
        const accounts = getAccountsFromDB();
        const matches = accounts.filter(a => (a.pin || '123456') === pinVal);
        if (matches.length === 1 && loginUsuario) {
            loginUsuario.value = (matches[0].usuario || '').toUpperCase();
        }
    }

    function autoFillFromUsuario(rawUser) {
        if (!rawUser) return;
        const query = rawUser.trim().toUpperCase();
        if (!query) return;
        const accounts = getAccountsFromDB();
        const matched = accounts.find(a =>
            (a.usuario || '').toUpperCase() === query ||
            (a.correo || '').toUpperCase() === query ||
            (a.numeroCuenta || '').toUpperCase() === query ||
            (a.nombre || '').toUpperCase() === query
        );
        if (matched) {
            if (loginUsuario && loginUsuario.value.toUpperCase() !== (matched.usuario || '').toUpperCase()) {
                loginUsuario.value = (matched.usuario || '').toUpperCase();
            }
            if (loginPin && (!loginPin.value || loginPin.value.length < 6 || loginPin.value !== (matched.pin || '123456'))) {
                loginPin.value = matched.pin || '123456';
            }
        }
    }

    if (loginPin) {
        loginPin.addEventListener('input', (e) => {
            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
            if (e.target.value !== cleaned) {
                e.target.value = cleaned;
            }
            autoFillFromPin(cleaned);
        });
        loginPin.addEventListener('change', (e) => {
            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
            e.target.value = cleaned;
            autoFillFromPin(cleaned);
        });
    }

    if (loginUsuario) {
        loginUsuario.addEventListener('input', (e) => {
            const upper = e.target.value.toUpperCase();
            if (e.target.value !== upper) {
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                e.target.value = upper;
                if (typeof start === 'number' && typeof end === 'number') {
                    try {
                        e.target.setSelectionRange(start, end);
                    } catch (_) {}
                }
            }
            autoFillFromUsuario(upper);
        });
        loginUsuario.addEventListener('change', (e) => {
            const upper = e.target.value.toUpperCase();
            e.target.value = upper;
            autoFillFromUsuario(upper);
        });
    }

    btnIrALoginDesdeModal?.addEventListener('click', () => {
        const userToFill = (lastCreatedCredentials?.usuario || modalUsuarioGenerado?.textContent || '').trim().toUpperCase();
        const pinToFill = (lastCreatedCredentials?.pin || modalPinGenerado?.textContent || '').trim();

        modalCredenciales?.classList.add('d-none');
        setAuthTab('login');

        if (loginPin && pinToFill) loginPin.value = pinToFill;
        if (loginUsuario && userToFill) loginUsuario.value = userToFill;
        if (loginPassword) {
            loginPassword.value = '';
            setTimeout(() => loginPassword.focus(), 60);
        }

        showToast('¡Credenciales cargadas! Ingresa tu contraseña para acceder.', 'info');
    });

    // Casillas OTP para ingreso de DPI (9 dígitos + 0101 fijo)
    const dpiOtpContainer = document.getElementById('dpiOtpContainer');
    const dpiCells = dpiOtpContainer ? Array.from(dpiOtpContainer.querySelectorAll('.bi-otp-cell:not(.bi-otp-cell-fixed)')) : [];

    function updateDpiHiddenValue() {
        if (!regDpi) return;
        const entered = dpiCells.map(c => c.value.trim()).join('');
        regDpi.value = entered.length === 9 ? `${entered}0101` : entered;
    }

    if (dpiCells.length) {
        dpiCells.forEach((cell, idx) => {
            cell.addEventListener('input', (e) => {
                const val = e.target.value.replace(/\D/g, '');
                e.target.value = val ? val[0] : '';

                if (e.target.value) {
                    e.target.classList.add('is-filled');
                    if (idx < dpiCells.length - 1) {
                        dpiCells[idx + 1].focus();
                        dpiCells[idx + 1].select();
                    }
                } else {
                    e.target.classList.remove('is-filled');
                }
                updateDpiHiddenValue();
            });

            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (!cell.value && idx > 0) {
                        e.preventDefault();
                        dpiCells[idx - 1].value = '';
                        dpiCells[idx - 1].classList.remove('is-filled');
                        dpiCells[idx - 1].focus();
                    } else {
                        cell.value = '';
                        cell.classList.remove('is-filled');
                    }
                    updateDpiHiddenValue();
                } else if (e.key === 'ArrowLeft' && idx > 0) {
                    e.preventDefault();
                    dpiCells[idx - 1].focus();
                    dpiCells[idx - 1].select();
                } else if (e.key === 'ArrowRight' && idx < dpiCells.length - 1) {
                    e.preventDefault();
                    dpiCells[idx + 1].focus();
                    dpiCells[idx + 1].select();
                }
            });

            cell.addEventListener('focus', () => cell.select());

            cell.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                const cleanDigits = pasteData.replace(/\D/g, '');
                if (!cleanDigits) return;

                const digitsToFill = cleanDigits.slice(0, 9).split('');
                digitsToFill.forEach((d, i) => {
                    if (dpiCells[i]) {
                        dpiCells[i].value = d;
                        dpiCells[i].classList.add('is-filled');
                    }
                });

                const nextIndex = Math.min(digitsToFill.length, dpiCells.length - 1);
                dpiCells[nextIndex].focus();
                updateDpiHiddenValue();
            });
        });
    }

    // Mostrar u ocultar PIN y Contraseña
    const btnTogglePin = document.getElementById('btnTogglePin');
    if (btnTogglePin && loginPin) {
        btnTogglePin.addEventListener('click', () => {
            const isPassword = loginPin.type === 'password';
            loginPin.type = isPassword ? 'text' : 'password';

            const eyeOpen = btnTogglePin.querySelector('.icon-eye');
            const eyeSlash = btnTogglePin.querySelector('.icon-eye-slash');
            if (eyeOpen && eyeSlash) {
                eyeOpen.classList.toggle('d-none', isPassword);
                eyeSlash.classList.toggle('d-none', !isPassword);
            }
        });
    }

    const btnTogglePassword = document.getElementById('btnTogglePassword');
    if (btnTogglePassword && loginPassword) {
        btnTogglePassword.addEventListener('click', () => {
            const isPassword = loginPassword.type === 'password';
            loginPassword.type = isPassword ? 'text' : 'password';

            const eyeOpen = btnTogglePassword.querySelector('.icon-eye');
            const eyeSlash = btnTogglePassword.querySelector('.icon-eye-slash');
            if (eyeOpen && eyeSlash) {
                eyeOpen.classList.toggle('d-none', isPassword);
                eyeSlash.classList.toggle('d-none', !isPassword);
            }
        });
    }

    // Selectores de fecha de nacimiento (+18 años)
    function populateBirthdateSelects() {
        if (!regDia || !regMes || !regAnio) return;

        if (regDia.options.length <= 1) {
            for (let d = 1; d <= 31; d++) {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d < 10 ? `0${d}` : d;
                regDia.appendChild(opt);
            }
        }

        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        if (regMes.options.length <= 1) {
            meses.forEach((m, idx) => {
                const opt = document.createElement('option');
                opt.value = idx + 1;
                opt.textContent = m;
                regMes.appendChild(opt);
            });
        }

        const currentYear = new Date().getFullYear();
        const maxBirthYear = currentYear - 18;
        const minBirthYear = 1930;

        if (regAnio.options.length <= 1) {
            for (let y = maxBirthYear; y >= minBirthYear; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                regAnio.appendChild(opt);
            }
        }
    }

    populateBirthdateSelects();

    // Pantalla de carga previa al Dashboard
    function launchBiCorporateLoader() {
        const isInHtmlFolder = window.location.pathname.includes('/html/');
        const rootPrefix = isInHtmlFolder ? '../' : '';
        const targetDashboard = isInHtmlFolder ? 'dashboard.html' : 'html/dashboard.html';

        const toastEl = document.getElementById('appToast');
        if (toastEl) toastEl.classList.remove('show');

        let loader = document.getElementById('biCorporateLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'biCorporateLoader';
            loader.className = 'bi-corporate-loader-overlay';
            loader.setAttribute('aria-hidden', 'true');
            loader.innerHTML = `
                <div class="bi-corporate-loader-content">
                    <div class="bi-uiverse-loader-ring">
                        <img src="${rootPrefix}icons/loader-ring.svg" class="bi-loader-circular-svg" alt="">
                        <img src="${rootPrefix}imas/logo.png" alt="Banco Industrial" class="bi-loader-center-logo">
                    </div>
                    <div class="bi-loader-text" id="biLoaderText">Ingresando a Bi en Línea</div>
                </div>
            `;
            document.body.appendChild(loader);
        }

        document.body.classList.add('bi-screen-clearing');
        loader.setAttribute('aria-hidden', 'false');

        requestAnimationFrame(() => {
            loader.classList.add('active');
        });

        setTimeout(() => {
            window.location.href = targetDashboard;
        }, 2100);
    }

    // Inicio de sesión
    formLogin?.addEventListener('submit', (e) => {
        e.preventDefault();

        const pin = loginPin?.value.trim() || '';
        const usuario = loginUsuario?.value.trim().toUpperCase() || '';
        const password = loginPassword?.value || '';

        if (!pin || !usuario || !password) {
            showToast('Por favor completa tu Código/PIN, Usuario y Contraseña.', 'danger');
            return;
        }

        if (pin.length !== 6) {
            showToast('El Código/PIN debe contener exactamente 6 dígitos numéricos.', 'danger');
            loginPin?.focus();
            return;
        }

        const findMatchingAccount = (list) => list.find(acc => {
            const accUser = (acc.usuario || '').toUpperCase();
            const accEmail = (acc.correo || '').toUpperCase();
            const accNumber = (acc.numeroCuenta || '');
            const userMatches = (accUser === usuario || accEmail === usuario || accNumber === usuario);
            const passMatches = (acc.password === password);
            const pinMatches = (acc.pin ? acc.pin === pin : pin === '123456');

            return userMatches && passMatches && pinMatches;
        });

        let matchedUser = findMatchingAccount(getAccountsFromDB());

        if (!matchedUser && typeof pullDatabaseFromCloud === 'function') {
            pullDatabaseFromCloud().then(() => {
                matchedUser = findMatchingAccount(getAccountsFromDB());
                if (matchedUser) {
                    setActiveSession(matchedUser);
                    launchBiCorporateLoader();
                } else {
                    showToast('Credenciales incorrectas. Verifica tu Código/PIN, Usuario y Contraseña.', 'danger');
                }
            });
            return;
        }

        if (matchedUser) {
            setActiveSession(matchedUser);
            launchBiCorporateLoader();
        } else {
            showToast('Credenciales incorrectas. Verifica tu Código/PIN, Usuario y Contraseña.', 'danger');
        }
    });

    // Registro de nueva cuenta Bi
    formRegistro?.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombres = regNombres?.value.trim() || '';
        const apellidos = regApellidos?.value.trim() || '';
        const correo = regCorreo?.value.trim().toLowerCase() || '';
        const dia = parseInt(regDia?.value, 10);
        const mes = parseInt(regMes?.value, 10);
        const anio = parseInt(regAnio?.value, 10);
        const password = regPassword?.value || '';

        const userDpiDigits = dpiCells.map(c => c.value.trim()).join('');
        const dpi = userDpiDigits.length === 9 ? `${userDpiDigits}0101` : '';
        if (regDpi) regDpi.value = dpi;

        if (!nombres || !apellidos || !correo || !dia || !mes || !anio || !password) {
            showToast('Todos los campos son obligatorios para crear tu Cuenta Bi.', 'danger');
            return;
        }

        if (userDpiDigits.length !== 9) {
            showToast('Por favor ingresa los 9 dígitos de tu DPI (los últimos 4 dígitos 0101 ya están asignados).', 'danger');
            const firstEmpty = dpiCells.find(c => !c.value.trim());
            firstEmpty?.focus();
            return;
        }

        const fechaNacimiento = new Date(anio, mes - 1, dia);
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const diffMeses = hoy.getMonth() - fechaNacimiento.getMonth();
        if (diffMeses < 0 || (diffMeses === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
            edad--;
        }

        if (edad < 18) {
            showToast('Debes ser mayor de 18 años para aperturar una Cuenta Bi.', 'danger');
            return;
        }

        if (password.length > 16) {
            showToast('La contraseña excede el máximo permitido de 16 caracteres dictado por la banca de Guatemala.', 'danger');
            regPassword?.focus();
            return;
        }

        const accounts = getAccountsFromDB();
        if (accounts.some(acc => (acc.correo || '').toLowerCase() === correo)) {
            showToast('Ya existe una cuenta asociada a este correo electrónico.', 'danger');
            return;
        }

        if (accounts.some(acc => (acc.dpi || '').replace(/\s/g, '') === dpi)) {
            showToast('Ya existe una cuenta registrada con este número de DPI.', 'danger');
            return;
        }

        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
        const cleanText = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();

        const cleanNombre = cleanText(nombres);
        const cleanApellido = cleanText(apellidos.split(' ')[0]);
        const initial = cleanNombre.charAt(0) || 'B';
        const surname = cleanApellido || 'CUENTA';
        const randomNum = Math.floor(100 + Math.random() * 900);
        const generatedUsuario = `${initial}${surname}${randomNum}`.toUpperCase();

        const accRandom = Math.floor(100000 + Math.random() * 900000);
        const accCheck = Math.floor(1 + Math.random() * 9);
        const numeroCuenta = `001-${accRandom}-${accCheck}`;
        const nombreCompleto = `${nombres} ${apellidos}`.trim();

        const newAccount = {
            id: 'acc_' + Date.now(),
            numeroCuenta: numeroCuenta,
            nombres: nombres,
            apellidos: apellidos,
            nombre: nombreCompleto,
            usuario: generatedUsuario,
            correo: correo,
            password: password,
            pin: generatedPin,
            dpi: dpi,
            fechaNacimiento: `${anio}-${mes < 10 ? '0' + mes : mes}-${dia < 10 ? '0' + dia : dia}`,
            tipo: 'Cuenta Monetaria Bi en Línea',
            saldo: 0.00,
            requiereSaldoInicial: true,
            fechaApertura: new Date().toISOString().split('T')[0]
        };

        accounts.push(newAccount);
        saveAccountsToDB(accounts);
        refreshLoginAutocompleteLists();

        lastCreatedCredentials = {
            usuario: generatedUsuario,
            pin: generatedPin,
            password: password
        };

        formRegistro.reset();
        dpiCells.forEach(c => { c.value = ''; c.classList.remove('is-filled'); });
        if (regDpi) regDpi.value = '0101';
        populateBirthdateSelects();

        if (modalUsuarioGenerado) modalUsuarioGenerado.textContent = generatedUsuario;
        if (modalPinGenerado) modalPinGenerado.textContent = generatedPin;
        if (modalNombreCompleto) modalNombreCompleto.textContent = nombreCompleto;

        if (modalCredenciales) {
            modalCredenciales.classList.remove('d-none');
        }

        showToast('¡Cuenta Bi creada con éxito! Tus credenciales se han generado.', 'success');
    });
});
