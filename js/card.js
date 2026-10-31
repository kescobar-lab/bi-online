/* Módulo interactivo 3D y selección de nivel de Tarjeta Bi */

const BI_CARD_TIERS = {
    classic: {
        key: 'classic',
        name: 'Bi Classic',
        front: 'imas/tarjeta/classic/bi-classic-front.png',
        back: 'imas/tarjeta/classic/bi-classic-back.png',
        darkText: false
    },
    gold: {
        key: 'gold',
        name: 'Bi Gold',
        front: 'imas/tarjeta/gold/bi-gold-front.png',
        back: 'imas/tarjeta/gold/bi-gold-back.png',
        darkText: false
    },
    premier: {
        key: 'premier',
        name: 'Bi Premier',
        front: 'imas/tarjeta/premier/bi-premier-front.png',
        back: 'imas/tarjeta/premier/bi-premier-back.png',
        darkText: false
    },
    platinum: {
        key: 'platinum',
        name: 'Bi Platinum',
        front: 'imas/tarjeta/platinum/bi-platinum-front.png',
        back: 'imas/tarjeta/platinum/bi-platinum-back.png',
        darkText: true
    },
    signature: {
        key: 'signature',
        name: 'Bi Signature',
        front: 'imas/tarjeta/signature/bi-signature-front.png',
        back: 'imas/tarjeta/signature/bi-signature-back.png',
        darkText: false
    },
    black: {
        key: 'black',
        name: 'Bi Black',
        front: 'imas/tarjeta/black/bi-black-front.png',
        back: 'imas/tarjeta/black/bi-black-back.png',
        darkText: false
    },
    infinite: {
        key: 'infinite',
        name: 'Bi Infinite',
        front: 'imas/tarjeta/infinite/bi-infinite-front.png',
        back: 'imas/tarjeta/infinite/bi-infinite-back.png',
        darkText: false
    }
};

function getBiCardTierByBalance(saldo) {
    const amount = Number(saldo) || 0;
    if (amount >= 50000) return BI_CARD_TIERS.infinite;
    if (amount > 40000) return BI_CARD_TIERS.black;
    if (amount >= 25000) return BI_CARD_TIERS.signature;
    if (amount >= 20000) return BI_CARD_TIERS.platinum;
    if (amount >= 10000) return BI_CARD_TIERS.premier;
    if (amount >= 5000) return BI_CARD_TIERS.gold;
    return BI_CARD_TIERS.classic;
}

function toTitleCaseWord(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatBiCardHolderName(account) {
    if (!account) return 'Titular Bi';

    const nombresRaw = String(account.nombres || '').trim();
    const apellidosRaw = String(account.apellidos || '').trim();

    if (nombresRaw && apellidosRaw) {
        const primerNombre = toTitleCaseWord(nombresRaw.split(/\s+/)[0]);
        const primerApellido = toTitleCaseWord(apellidosRaw.split(/\s+/)[0]);
        return `${primerNombre} ${primerApellido}`.trim();
    }

    const fullParts = String(account.nombre || '').trim().split(/\s+/).filter(Boolean);
    if (fullParts.length >= 2) {
        const primerNombre = toTitleCaseWord(fullParts[0]);
        const primerApellido = toTitleCaseWord(fullParts.length >= 3 ? fullParts[fullParts.length - 2] : fullParts[1]);
        return `${primerNombre} ${primerApellido}`.trim();
    }

    if (fullParts.length === 1) {
        return toTitleCaseWord(fullParts[0]);
    }

    return 'Titular Bi';
}

function applyBiCardToElements({ frontId, backId, holderFrontId, holderBackId, account, rootPrefix = '' }) {
    const tier = getBiCardTierByBalance(account ? account.saldo : 0);
    const holderName = formatBiCardHolderName(account);
    const cacheBust = '?v=20261029d';

    const frontEl = document.getElementById(frontId);
    const backEl = document.getElementById(backId);
    const holderFrontEl = document.getElementById(holderFrontId);
    const holderBackEl = holderBackId ? document.getElementById(holderBackId) : null;

    if (frontEl) {
        frontEl.style.backgroundImage = `url('${rootPrefix}${tier.front}${cacheBust}')`;
    }
    if (backEl) {
        backEl.style.backgroundImage = `url('${rootPrefix}${tier.back}${cacheBust}')`;
    }
    if (holderFrontEl) {
        holderFrontEl.textContent = holderName;
        holderFrontEl.classList.add('is-active');
        holderFrontEl.classList.toggle('is-dark-text', Boolean(tier.darkText));
    }
    if (holderBackEl) {
        holderBackEl.textContent = holderName;
        holderBackEl.classList.add('is-active');
    }

    return tier;
}

function setupCard3D(elementOrId) {
    const flipper = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!flipper) return;

    flipper.addEventListener('click', () => {
        flipper.classList.toggle('is-flipped');
        const isFlipped = flipper.classList.contains('is-flipped');
        flipper.style.transform = isFlipped
            ? 'perspective(1200px) rotateY(180deg)'
            : 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    });

    flipper.addEventListener('mousemove', (e) => {
        const rect = flipper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotX = -((y - centerY) / centerY) * 6.5;
        const rotY = ((x - centerX) / centerX) * 7.5;

        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        flipper.style.setProperty('--mouse-x', `${glareX}%`);
        flipper.style.setProperty('--mouse-y', `${glareY}%`);

        const isFlipped = flipper.classList.contains('is-flipped');
        if (isFlipped) {
            flipper.style.transform = `perspective(1200px) rotateY(${180 + rotY}deg) rotateX(${rotX}deg)`;
        } else {
            flipper.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        }
    });

    flipper.addEventListener('mouseleave', () => {
        const isFlipped = flipper.classList.contains('is-flipped');
        flipper.style.transform = isFlipped
            ? 'perspective(1200px) rotateY(180deg)'
            : 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    });
}
