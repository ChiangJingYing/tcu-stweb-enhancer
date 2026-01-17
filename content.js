/**
 * Main logic for modifying the TCU StWeb page.
 */

async function init() {
    if (window === window.top) {
        console.log('TCU StWeb Extension: Main Page Loaded');

        const isStmain = location.pathname.includes('Stmain.php');

        // Fix Navbar Link (Task Requirement 1) - Polling Retry
        const fixNavbar = setInterval(() => {
            const navLinkEl = Utils.getElementByXPath('/html/body/div[1]/nav/a');
            if (navLinkEl) {
                navLinkEl.href = 'https://admin.tcu.edu.tw/TCUstweb/Stmain.php';
                clearInterval(fixNavbar);
            }
        }, 200);
        // Stop polling after 5 seconds
        setTimeout(() => clearInterval(fixNavbar), 5000);

        const isCleanUrl = location.search === '';

        if (isStmain) {
            // Task 2 (Pinning Manager & Floating UI)
            // Note: PinningManager handles its own strict check for the *rendering* of the button container,
            // but the Floating UI will appear always.
            try {
                await handleTask2();
            } catch (e) {
                console.error('Task 2 failed:', e);
            }

            // Task 1: Replacement of Form Table
            // STRICT: Only on clean URL
            if (isCleanUrl) {
                try {
                    await handleTask1();
                } catch (e) {
                    console.error('Task 1 failed:', e);
                }
            }
        }
    }
}

const PinningManager = {
    STORAGE_KEY: 'tcu_stweb_pins',
    STORAGE_POS_KEY: 'tcu_stweb_fab_pos',
    isSelecting: false,

    init: async () => {
        await PinningManager.injectFloatingUI();
        await PinningManager.renderTask2Items();
    },

    injectFloatingUI: async () => {
        const existing = document.getElementById('tcu-pin-fab');
        if (existing) existing.remove();

        // FAB Container
        const fab = document.createElement('div');
        fab.id = 'tcu-pin-fab';
        fab.style.cssText = `
      position: fixed;
      z-index: 9999;
      font-family: sans-serif;
      user-select: none;
    `;

        // Load Position
        const savedPos = await Utils.Storage.get(PinningManager.STORAGE_POS_KEY);
        if (savedPos && savedPos.left && savedPos.top) {
            fab.style.left = savedPos.left;
            fab.style.top = savedPos.top;
        } else {
            fab.style.bottom = '20px';
            fab.style.right = '20px';
        }

        // Draggable Logic
        let isDragging = false;
        let hasMoved = false; // To distinguish click from drag
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            // Only drag if clicking the main button or container, not the menu content
            if (e.target.closest('#tcu-pin-menu')) return;

            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;

            const rect = fab.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            // Clear right/bottom to allow free movement via top/left
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
            fab.style.left = `${initialLeft}px`;
            fab.style.top = `${initialTop}px`;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

            fab.style.left = `${initialLeft + dx}px`;
            fab.style.top = `${initialTop + dy}px`;
        };

        const onMouseUp = async () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Save Position if moved
            if (hasMoved) {
                await Utils.Storage.set(PinningManager.STORAGE_POS_KEY, {
                    left: fab.style.left,
                    top: fab.style.top
                });
            }
        };

        fab.addEventListener('mousedown', onMouseDown);

        // Main Toggle Button
        const btn = document.createElement('button');
        btn.textContent = '📌';
        btn.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #007bff;
      color: white;
      border: none;
      font-size: 24px;
      cursor: grab;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    `;

        // Only toggle if we haven't dragged
        btn.onclick = (e) => {
            if (!hasMoved) PinningManager.toggleMenu();
        };
        btn.onmousedown = () => {
            btn.style.cursor = 'grabbing';
            btn.style.transform = 'scale(0.95)';
        };
        btn.onmouseup = () => {
            btn.style.cursor = 'grab';
            btn.style.transform = 'scale(1)';
        };

        fab.appendChild(btn);

        // Menu
        const menu = document.createElement('div');
        menu.id = 'tcu-pin-menu';
        menu.style.cssText = `
      display: none;
      position: absolute;
      bottom: 60px;
      right: 0;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px;
      width: 250px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

        // Render Menu Content function
        const renderMenuContent = async () => {
            menu.innerHTML = ''; // Clear

            // 1. Toggle Selection Mode Button
            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = PinningManager.isSelecting ? '停止選擇 (Stop)' : '新增釘選項目 (Add Pin)';
            toggleBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            background: ${PinningManager.isSelecting ? '#dc3545' : '#28a745'};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
            toggleBtn.onclick = () => {
                PinningManager.toggleSelectionMode();
                PinningManager.toggleMenu(); // Close menu to let user select
            };
            menu.appendChild(toggleBtn);

            // 2. List Header
            const listHeader = document.createElement('div');
            listHeader.textContent = '已釘選項目 (Pinned):';
            listHeader.style.fontWeight = 'bold';
            listHeader.style.marginBottom = '5px';
            listHeader.style.fontSize = '12px';
            listHeader.style.color = '#666';
            menu.appendChild(listHeader);

            // 3. Pinned List
            const pins = (await Utils.Storage.get(PinningManager.STORAGE_KEY)) || [];

            if (pins.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = '(無項目 None)';
                empty.style.color = '#999';
                empty.style.textAlign = 'center';
                empty.style.padding = '10px 0';
                menu.appendChild(empty);
            } else {
                const listContainer = document.createElement('div');
                listContainer.style.display = 'flex';
                listContainer.style.flexDirection = 'column';
                listContainer.style.gap = '5px';

                pins.forEach((pin, index) => {
                    const row = document.createElement('div');
                    row.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                    padding: 5px 8px;
                    border-radius: 4px;
                    border: 1px solid #eee;
                    color: #333;
                `;

                    const label = document.createElement('span');
                    label.textContent = pin.name;
                    label.style.fontSize = '12px';
                    label.style.overflow = 'hidden';
                    label.style.textOverflow = 'ellipsis';
                    label.style.whiteSpace = 'nowrap';
                    label.style.flex = '1';
                    label.title = pin.name;

                    const delBtn = document.createElement('button');
                    delBtn.textContent = '✕';
                    delBtn.style.cssText = `
                    background: none;
                    border: none;
                    color: #dc3545;
                    cursor: pointer;
                    font-weight: bold;
                    margin-left: 5px;
                    padding: 0 5px;
                `;
                    delBtn.onclick = async () => {
                        const newPins = pins.filter((_, i) => i !== index);
                        await Utils.Storage.set(PinningManager.STORAGE_KEY, newPins);
                        await renderMenuContent(); // Re-render menu
                        await PinningManager.renderTask2Items(); // Re-render main UI
                    };

                    row.appendChild(label);
                    row.appendChild(delBtn);
                    listContainer.appendChild(row);
                });
                menu.appendChild(listContainer);
            }
        };

        // Initial Render check
        renderMenuContent();

        // Hook render into toggle
        PinningManager.toggleMenu = async () => {
            const menu = document.getElementById('tcu-pin-menu');
            if (menu.style.display === 'none') {
                await renderMenuContent();
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }
        };

        fab.appendChild(menu);
        document.body.appendChild(fab);
    },

    toggleMenu: () => {
        // Placeholder, overwritten in injectFloatingUI
    },

    toggleSelectionMode: () => {
        PinningManager.isSelecting = !PinningManager.isSelecting;
        const isSelecting = PinningManager.isSelecting;

        if (isSelecting) {
            document.body.style.cursor = 'crosshair';
            // Add global listener
            document.addEventListener('click', PinningManager.handleSelectionClick, true);
            document.addEventListener('mouseover', PinningManager.handleMouseOver, true);
            document.addEventListener('mouseout', PinningManager.handleMouseOut, true);

            // Notify user
            const toast = document.createElement('div');
            toast.id = 'selection-toast';
            toast.textContent = '請點擊您想釘選的功能按鈕 (Click a button to pin)';
            toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
            document.body.appendChild(toast);
        } else {
            document.body.style.cursor = 'default';
            document.removeEventListener('click', PinningManager.handleSelectionClick, true);
            document.removeEventListener('mouseover', PinningManager.handleMouseOver, true);
            document.removeEventListener('mouseout', PinningManager.handleMouseOut, true);

            // CLEANUP: Remove styles from all potentially highlighted elements
            const headers = document.querySelectorAll('a.card-header');
            headers.forEach(el => {
                el.style.outline = '';
                if (el.dataset.originalTransform) {
                    el.style.transform = el.dataset.originalTransform;
                } else {
                    el.style.transform = '';
                }
            });

            const toast = document.getElementById('selection-toast');
            if (toast) toast.remove();
        }
    },

    handleMouseOver: (e) => {
        const target = e.target.closest('a.card-header');
        if (target) {
            target.style.outline = '3px solid red';
            target.dataset.originalTransform = target.style.transform;
            target.style.transform = 'scale(1.02)';
        }
    },

    handleMouseOut: (e) => {
        const target = e.target.closest('a.card-header');
        if (target) {
            target.style.outline = '';
            target.style.transform = target.dataset.originalTransform || '';
        }
    },

    handleSelectionClick: async (e) => {
        if (!PinningManager.isSelecting) return;

        const target = e.target.closest('a.card-header');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        // Extract Data
        const href = target.getAttribute('href');
        const nameEl = target.querySelector('.col-9 span');
        const name = nameEl ? nameEl.textContent.trim() : 'Unknown Function';

        if (href) {
            // Validation: Exclude Stmain.php (Menu Toggles)
            if (href.includes('Stmain.php')) {
                alert('此為選單展開按鈕，無法釘選 (This is a menu toggle, cannot pin)');
                return;
            }

            await PinningManager.addPin(name, href);
            PinningManager.toggleSelectionMode(); // Turn off
        }
    },

    addPin: async (name, href) => {
        const current = (await Utils.Storage.get(PinningManager.STORAGE_KEY)) || [];
        if (current.some(p => p.href === href)) {
            alert('Already pinned!');
            return;
        }

        current.push({ name, href });
        await Utils.Storage.set(PinningManager.STORAGE_KEY, current);
        await PinningManager.renderTask2Items();
        alert(`Pinned "${name}"!`);
    },

    renderTask2Items: async () => {
        // Strict Check: Only render Task 2 area if no query params
        if (location.search !== '') return;

        let container = document.getElementById('task2-container');

        // If container doesn't exist, we need to create it and replace the original target
        if (!container) {
            const targetXPath = '/html/body/div/form/div[3]/div[2]/div[2]/div/div[3]';
            const targetElement = Utils.getElementByXPath(targetXPath);

            if (!targetElement) return;

            container = document.createElement('div');
            container.id = 'task2-container';
            container.style.padding = '10px';
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '10px';
            container.style.justifyContent = 'center';

            targetElement.replaceWith(container);
        } else {
            // If container exists, just clear it to re-render
            container.innerHTML = '';
        }

        const pins = (await Utils.Storage.get(PinningManager.STORAGE_KEY)) || [];

        const createBtn = (name, url, baseColor = '#17a2b8', hoverColor = '#138496') => {
            const btn = document.createElement('a');
            btn.href = url;
            btn.target = '_blank';
            btn.textContent = name;
            btn.style.cssText = `
            display: inline-block;
            padding: 8px 16px;
            color: #fff;
            background-color: ${baseColor};
            border-radius: 5px;
            text-decoration: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: background-color 0.2s;
        `;
            btn.onmouseover = () => btn.style.backgroundColor = hoverColor;
            btn.onmouseout = () => btn.style.backgroundColor = baseColor;
            return btn;
        };

        const defaultBtn = createBtn('開啟 iCan', 'https://admin.tcu.edu.tw/TCUstweb/TranIcan.php', '#007bff', '#0056b3');
        container.appendChild(defaultBtn);

        pins.forEach(pin => {
            if (pin.name && pin.href) {
                const btn = createBtn(pin.name, pin.href);
                container.appendChild(btn);
            }
        });
    }
};

async function handleTask1() {
    const targetXPath = '/html/body/div/form/div[3]/div[2]/div[2]/div/div[2]';
    const targetElement = Utils.getElementByXPath(targetXPath);

    if (!targetElement) {
        console.warn('Task 1: Target element not found:', targetXPath);
        return;
    }

    // Calculate dates for current month (Taiwan Year)
    const now = new Date();
    const rocYear = now.getFullYear() - 1911;
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const paramStart = `${rocYear}${month}01`;
    const paramEnd = `${rocYear}${month}32`;

    const url = 'https://admin.tcu.edu.tw/TCUstweb/acc/stMscQry.php';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `fmAplyDay1=&fmAplyDay2=&fmPayDay1=${paramStart}&fmPayDay2=${paramEnd}&OpType=Qry&Op=`
    };

    try {
        const htmlContent = await Utils.fetchContent(url, options);
        const sourceDoc = Utils.parseHTML(htmlContent);

        const sourceXPath = '/html/body/div/form/table/tbody/tr[3]/td/table';
        const sourceElement = Utils.getElementByXPath(sourceXPath, sourceDoc);

        if (sourceElement) {
            const importedNode = document.importNode(sourceElement, true);
            targetElement.innerHTML = '';
            targetElement.appendChild(importedNode);
            targetElement.replaceWith(importedNode);
            console.log('Task 1: Success');
        } else {
            console.warn('Task 1: Source element not found in response');
        }
    } catch (e) {
        console.error('Task 1 Error:', e);
    }
}

async function handleTask2() {
    // Delegate to Manager
    await PinningManager.init();
}

// execute
init();
