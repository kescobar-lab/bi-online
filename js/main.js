/* Módulo principal de la página de inicio (Landing) */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof setupCard3D === 'function') {
        setupCard3D('cardFlipperHero');
    }
    setupAppleScrollBg();
    setupBiCarousel();
});

window.updateAppleBgProgress = null;

/* Desplazamiento suave del fondo poligonal */
function setupAppleScrollBg() {
    const bgImg = document.getElementById('appleBgImg');
    if (!bgImg) return;

    let targetProgress = 0;
    let currentProgress = 0;
    let isRunning = false;

    function render() {
        currentProgress += (targetProgress - currentProgress) * 0.12;

        const vh = window.innerHeight;
        const maxTravel = vh * 0.35;

        const translateY = -currentProgress * maxTravel;
        bgImg.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(1.06)`;

        if (Math.abs(targetProgress - currentProgress) > 0.0005) {
            requestAnimationFrame(render);
        } else {
            currentProgress = targetProgress;
            const finalY = -currentProgress * maxTravel;
            bgImg.style.transform = `translate3d(0, ${finalY.toFixed(2)}px, 0) scale(1.06)`;
            isRunning = false;
        }
    }

    window.updateAppleBgProgress = function (progress) {
        targetProgress = Math.min(Math.max(progress, 0), 1);
        if (!isRunning) {
            isRunning = true;
            requestAnimationFrame(render);
        }
    };
}

/* Carrusel horizontal de beneficios Bi */
function setupBiCarousel() {
    const viewport = document.getElementById('biCarouselViewport');
    const track = document.getElementById('biCarouselTrack');
    const dots = document.querySelectorAll('.bi-carousel-dot');
    const cards = document.querySelectorAll('.bi-stat-item, .bi-feature-card');

    if (!track || !viewport || dots.length === 0 || cards.length === 0) return;

    let currentStep = 0;
    const totalCards = cards.length;
    const visibleCards = 3;
    const totalSteps = totalCards - visibleCards + 1;
    const gap = 24;
    let wheelCooldown = false;

    function updateLayout() {
        const viewportWidth = viewport.clientWidth;
        if (viewportWidth <= 0) return;

        const cardWidth = (viewportWidth - (gap * (visibleCards - 1))) / visibleCards;

        cards.forEach((card) => {
            const widthPx = `${cardWidth.toFixed(2)}px`;
            card.style.width = widthPx;
            card.style.minWidth = widthPx;
            card.style.maxWidth = widthPx;
            card.style.flex = `0 0 ${widthPx}`;
        });

        goToStep(currentStep, false);
    }

    function goToStep(step, animate = true) {
        currentStep = (step + totalSteps) % totalSteps;

        const viewportWidth = viewport.clientWidth;
        const cardWidth = (viewportWidth - (gap * (visibleCards - 1))) / visibleCards;
        const stepWidth = cardWidth + gap;

        const translateX = -(currentStep * stepWidth);

        if (!animate) {
            track.style.transition = 'none';
            track.style.transform = `translateX(${translateX.toFixed(2)}px)`;
            void track.offsetWidth;
            track.style.transition = '';
        } else {
            track.style.transform = `translateX(${translateX.toFixed(2)}px)`;
        }

        dots.forEach((dot, index) => {
            const isActive = index === currentStep;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (typeof window.updateAppleBgProgress === 'function') {
            window.updateAppleBgProgress(currentStep / (totalSteps - 1));
        }
    }

    dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            const targetIndex = parseInt(dot.getAttribute('data-index'), 10);
            if (!isNaN(targetIndex)) {
                goToStep(targetIndex);
            }
        });
    });

    window.addEventListener('wheel', (e) => {
        if (e.target && e.target.closest('.bi-auth-scroll-area')) {
            return;
        }

        if (wheelCooldown) return;
        if (Math.abs(e.deltaY) < 18 && Math.abs(e.deltaX) < 18) return;

        wheelCooldown = true;
        setTimeout(() => {
            wheelCooldown = false;
        }, 380);

        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

        if (delta > 0) {
            goToStep(currentStep < totalSteps - 1 ? currentStep + 1 : 0);
        } else {
            goToStep(currentStep > 0 ? currentStep - 1 : totalSteps - 1);
        }
    }, { passive: true });

    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (e.target && e.target.closest('.bi-auth-scroll-area')) return;
        if (!e.changedTouches || !e.changedTouches[0]) return;

        const diffX = touchStartX - e.changedTouches[0].clientX;
        const diffY = touchStartY - e.changedTouches[0].clientY;
        const delta = Math.abs(diffX) > Math.abs(diffY) ? diffX : diffY;

        if (Math.abs(delta) > 35) {
            if (delta > 0) {
                goToStep(currentStep < totalSteps - 1 ? currentStep + 1 : 0);
            } else {
                goToStep(currentStep > 0 ? currentStep - 1 : totalSteps - 1);
            }
        }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') {
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            goToStep(currentStep < totalSteps - 1 ? currentStep + 1 : 0);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            goToStep(currentStep > 0 ? currentStep - 1 : totalSteps - 1);
        }
    });

    window.addEventListener('resize', () => {
        updateLayout();
    }, { passive: true });

    updateLayout();
}
