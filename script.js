document.addEventListener('DOMContentLoaded', () => {
    const windows = [...document.querySelectorAll('.aero-window')];
    const taskbarApps = document.getElementById('taskbarApps');
    const startBtn = document.getElementById('startBtnAero');
    const startMenu = document.getElementById('startMenuAero');
    let highestZIndex = 100;
    let minimizedSnapshot = [];
    const panelTimers = new Map();
    const tabTimers = new Map();

    function updateClock() {
        const now = new Date();
        document.getElementById('timeClock').textContent = new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(now);
        document.getElementById('dateClock').textContent = new Intl.DateTimeFormat('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).format(now);
    }
    updateClock();
    setInterval(updateClock, 30000);

    function bringToFront(win) {
        highestZIndex += 1;
        win.style.zIndex = highestZIndex;
        updateTaskbar();
    }

    function selectDockItem(winId) {
        document.querySelectorAll('.desktop-icon').forEach((icon) => {
            icon.classList.toggle('selected', icon.getAttribute('onclick')?.includes(winId));
        });
    }

    function placeWindow(win) {
        win.dataset.placed = 'true';
    }

    function revealPanel(win) {
        clearTimeout(panelTimers.get(win));
        panelTimers.delete(win);
        win.classList.remove('is-leaving', 'is-entering');
        win.style.display = 'flex';
        void win.offsetWidth;
        win.classList.add('is-entering');
    }

    function hidePanel(win, { close = false, restoreSize = false } = {}) {
        clearTimeout(panelTimers.get(win));
        win.classList.remove('is-entering');
        win.classList.add('is-leaving');
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190;
        const timer = setTimeout(() => {
            win.style.display = 'none';
            win.classList.remove('is-leaving');
            if (close) win.dataset.opened = 'false';
            if (restoreSize) win.classList.remove('is-maximized');
            panelTimers.delete(win);
            updateTaskbar();
        }, delay);
        panelTimers.set(win, timer);
    }

    window.openWindow = function (winId) {
        const win = document.getElementById(winId);
        if (!win) return;
        windows.forEach((item) => {
            if (item !== win && item.style.display !== 'none') {
                hidePanel(item, { restoreSize: true });
            }
        });
        placeWindow(win);
        win.dataset.opened = 'true';
        revealPanel(win);
        bringToFront(win);
        selectDockItem(winId);
        if (startMenu) startMenu.classList.remove('active');
    };

    window.closeWindow = function (button) {
        const win = button.closest('.aero-window');
        if (!win) return;
        hidePanel(win, { close: true, restoreSize: true });
        updateTaskbar();
        document.querySelectorAll('.desktop-icon').forEach((icon) => icon.classList.remove('selected'));
    };

    window.minimizeWindow = function (button) {
        const win = button.closest('.aero-window');
        if (win) {
            hidePanel(win);
            selectDockItem('');
            updateTaskbar();
        }
    };

    window.maximizeWindow = function (button) {
        const win = button.closest('.aero-window');
        if (!win) return;
        win.classList.toggle('is-maximized');
        bringToFront(win);
    };

    function updateTaskbar() {
        if (!taskbarApps) return;
        taskbarApps.replaceChildren();
        windows.forEach((win) => {
            if (win.dataset.opened !== 'true') return;
            const title = win.querySelector('.titlebar-text span')?.textContent.trim() || 'Window';
            const button = document.createElement('button');
            const visible = win.style.display !== 'none';
            button.type = 'button';
            button.className = `task-app-btn${visible && Number(win.style.zIndex) === highestZIndex ? ' active' : ''}`;
            button.dataset.win = win.id;
            button.title = title;
            button.innerHTML = `<i class="fa-solid fa-window-restore text-purple" aria-hidden="true"></i><span>${title}</span>`;
            button.addEventListener('click', () => {
                if (visible && Number(win.style.zIndex) === highestZIndex) {
                    win.style.display = 'none';
                    updateTaskbar();
                } else {
                    win.style.display = 'flex';
                    bringToFront(win);
                }
            });
            taskbarApps.append(button);
        });
    }

    if (startBtn && startMenu) {
        startBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            startMenu.classList.toggle('active');
        });
        document.addEventListener('click', (event) => {
            if (!startMenu.contains(event.target) && !startBtn.contains(event.target)) {
                startMenu.classList.remove('active');
            }
        });
    }

    // Panels stay in a steady workspace so the content remains easy to scan.
    windows.forEach((win) => {
        win.querySelectorAll('.win-btn').forEach((button) => {
            if (button.classList.contains('btn-close')) button.setAttribute('aria-label', 'Tutup panel');
            else if (button.classList.contains('btn-min')) button.setAttribute('aria-label', 'Sembunyikan panel');
            else if (button.classList.contains('btn-max')) button.setAttribute('aria-label', 'Perbesar atau pulihkan panel');
        });
        win.addEventListener('pointerdown', () => bringToFront(win));
    });

    document.querySelectorAll('.desktop-icon').forEach((icon) => {
        icon.setAttribute('role', 'button');
        icon.setAttribute('tabindex', '0');
        icon.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                icon.click();
            }
        });
    });

    const profileSearch = document.getElementById('profileSearch');
    if (profileSearch) {
        const content = document.querySelector('#win-about .aero-main-content');
        const items = [...content.children];
        const emptyState = document.createElement('p');
        emptyState.className = 'profile-search-empty';
        emptyState.textContent = 'Tidak ada informasi yang cocok dengan pencarian.';
        emptyState.hidden = true;
        content.append(emptyState);
        profileSearch.addEventListener('input', () => {
            const query = profileSearch.value.trim().toLocaleLowerCase('id');
            let matches = 0;
            items.forEach((item) => {
                const visible = !query || item.textContent.toLocaleLowerCase('id').includes(query);
                item.hidden = !visible;
                if (visible) matches += 1;
            });
            emptyState.hidden = matches > 0;
        });
    }

    window.switchTab = function (tabId, button) {
        const pane = document.getElementById(tabId);
        const windowEl = button.closest('.aero-window');
        if (!pane || !windowEl) return;
        windowEl.querySelectorAll('.tab-pane').forEach((item) => {
            if (item === pane) return;
            clearTimeout(tabTimers.get(item));
            if (item.style.display !== 'none') {
                item.classList.remove('is-entering');
                item.classList.add('is-leaving');
                const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150;
                tabTimers.set(item, setTimeout(() => {
                    item.style.display = 'none';
                    item.classList.remove('active', 'is-leaving');
                    tabTimers.delete(item);
                }, delay));
            }
        });
        windowEl.querySelectorAll('.tab-aero').forEach((item) => item.classList.remove('active'));
        clearTimeout(tabTimers.get(pane));
        pane.style.display = 'block';
        pane.classList.remove('is-leaving', 'is-entering');
        void pane.offsetWidth;
        pane.classList.add('is-entering');
        pane.classList.add('active');
        button.classList.add('active');
    };

    window.toggleShowDesktop = function () {
        if (!minimizedSnapshot.length) {
            minimizedSnapshot = windows.filter((win) => win.style.display !== 'none');
            minimizedSnapshot.forEach((win) => hidePanel(win));
            selectDockItem('');
        } else {
            minimizedSnapshot.forEach((win) => {
                if (win.dataset.opened === 'true') revealPanel(win);
            });
            const topWindow = minimizedSnapshot.at(-1);
            if (topWindow) {
                selectDockItem(topWindow.id);
                bringToFront(topWindow);
            }
            minimizedSnapshot = [];
        }
        updateTaskbar();
    };

    const contactForm = document.getElementById('contactFormAero');
    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const recipient = contactForm.dataset.recipient.trim();
            const status = document.getElementById('contactFormStatus');
            if (!recipient || !recipient.includes('@')) {
                status.textContent = 'Alamat email tujuan belum tersedia.';
                return;
            }
            const values = new FormData(contactForm);
            const subject = encodeURIComponent(`Pesan portofolio dari ${values.get('name')}`);
            const body = encodeURIComponent(`Nama: ${values.get('name')}\nEmail: ${values.get('email')}\n\n${values.get('message')}`);
            status.textContent = 'Membuka aplikasi email untuk melanjutkan pesan…';
            window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
        });
    }

    window.showAeroDialog = function (message) {
        const dialog = document.getElementById('aeroDialog');
        document.getElementById('aeroDialogMessage').textContent = message;
        dialog.style.display = 'block';
    };
    window.closeAeroDialog = function () {
        document.getElementById('aeroDialog').style.display = 'none';
    };

    windows.forEach((win) => {
        if (win.style.display !== 'none') {
            win.dataset.opened = 'true';
            placeWindow(win);
            highestZIndex += 1;
            win.style.zIndex = highestZIndex;
            revealPanel(win);
            selectDockItem(win.id);
        }
    });
    updateTaskbar();
});
