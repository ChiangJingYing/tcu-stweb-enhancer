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
        PinningManager.renderMenu = async () => {
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
                // do not Close menu to let user select
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
                    row.draggable = true; // Enable Drag
                    row.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                    padding: 5px 8px;
                    border-radius: 4px;
                    border: 1px solid #eee;
                    color: #333;
                    cursor: grab;
                `;

                    // Drag Events
                    row.ondragstart = (e) => {
                        e.dataTransfer.setData('text/plain', index);
                        row.style.opacity = '0.5';
                    };

                    row.ondragend = () => {
                        row.style.opacity = '1';
                    };

                    row.ondragover = (e) => {
                        e.preventDefault(); // Necessary for drop
                        row.style.border = '2px dashed #007bff';
                    };

                    row.ondragleave = () => {
                        row.style.border = '1px solid #eee';
                    };

                    row.ondrop = async (e) => {
                        e.preventDefault();
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        const toIndex = index;

                        if (fromIndex !== toIndex) {
                            // Reorder Logic
                            const newPins = [...pins];
                            const [moved] = newPins.splice(fromIndex, 1);
                            newPins.splice(toIndex, 0, moved);

                            await Utils.Storage.set(PinningManager.STORAGE_KEY, newPins);
                            await PinningManager.renderMenu();
                            await PinningManager.renderTask2Items();
                        }
                    };

                    // Drag Handle Icon
                    const handle = document.createElement('span');
                    handle.textContent = '≡';
                    handle.style.cssText = `
                        margin-right: 8px;
                        color: #999;
                        cursor: grab;
                        font-weight: bold;
                        font-size: 14px;
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
                    delBtn.onclick = async (e) => {
                        e.stopPropagation(); // Prevent drag triggers if any
                        const newPins = pins.filter((_, i) => i !== index);
                        await Utils.Storage.set(PinningManager.STORAGE_KEY, newPins);
                        await PinningManager.renderMenu(); // Re-render menu
                        await PinningManager.renderTask2Items(); // Re-render main UI
                    };

                    row.appendChild(handle);
                    row.appendChild(label);
                    row.appendChild(delBtn);
                    listContainer.appendChild(row);
                });
                menu.appendChild(listContainer);
            }
        };

        // Initial Render check
        PinningManager.renderMenu();

        // Hook render into toggle
        PinningManager.toggleMenu = async () => {
            const menu = document.getElementById('tcu-pin-menu');
            if (menu.style.display === 'none') {
                await PinningManager.renderMenu();
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }
        };

        fab.appendChild(menu);
        document.body.appendChild(fab);

        // Click Outside to Close
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('tcu-pin-menu');
            const fab = document.getElementById('tcu-pin-fab');
            // Only close if NOT selecting
            if (!PinningManager.isSelecting && menu && menu.style.display === 'block' && fab && !fab.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    },

    toggleMenu: () => {
        // Placeholder, overwritten in injectFloatingUI
    },

    toggleSelectionMode: () => {
        PinningManager.isSelecting = !PinningManager.isSelecting;
        const isSelecting = PinningManager.isSelecting;

        // Update menu button state immediately
        PinningManager.renderMenu();

        if (isSelecting) {
            document.body.style.cursor = 'crosshair';
            // Add global listeners
            document.addEventListener('click', PinningManager.handleSelectionClick, true);
            document.addEventListener('mouseover', PinningManager.handleMouseOver, true);
            document.addEventListener('mouseout', PinningManager.handleMouseOut, true);

            // ESC key to cancel
            PinningManager.escHandler = (e) => {
                if (e.key === 'Escape') PinningManager.toggleSelectionMode();
            };
            document.addEventListener('keydown', PinningManager.escHandler);

            // Notify user
            const toast = document.createElement('div');
            toast.id = 'selection-toast';
            toast.textContent = '請點擊您想釘選的功能按鈕 (Click to pin) | ESC Cancel';
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

            if (PinningManager.escHandler) {
                document.removeEventListener('keydown', PinningManager.escHandler);
                PinningManager.escHandler = null;
            }

            // CLEANUP: Remove styles from all potentially highlighted elements (A and DIV)
            const headers = document.querySelectorAll('.card-header');
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
        const target = e.target.closest('.card-header');
        if (target) {
            target.style.outline = '3px solid red';
            target.dataset.originalTransform = target.style.transform;
            target.style.transform = 'scale(1.02)';
        }
    },

    handleMouseOut: (e) => {
        const target = e.target.closest('.card-header');
        if (target) {
            target.style.outline = '';
            target.style.transform = target.dataset.originalTransform || '';
        }
    },

    handleSelectionClick: async (e) => {
        if (!PinningManager.isSelecting) return;

        // Allow both A (collapsed) and DIV (expanded) headers
        const target = e.target.closest('.card-header');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        // Extract Data
        let href = target.getAttribute('href');
        const nameEl = target.querySelector('.col-9 span') || target.querySelector('.col-9');
        // Note: Expanded div might just have text inside .col-9 directly or in a child.
        // User snippet: <div class="col-9" style="font-size:1.5rem;">電子錢包選單</div>
        const name = nameEl ? nameEl.textContent.trim() : 'Unknown Function';

        // Logic to determine type:
        // 1. Regular Link: Has href AND NOT Stmain.php
        // 2. Group (Collapsed): Has href AND Stmain.php
        // 3. Group (Expanded): No href (it's a div)

        let isGroup = false;
        if (!href) {
            isGroup = true;
            // Generate a synthetic href for storage ID
            href = `group:${name}`;
        } else if (href.includes('Stmain.php')) {
            isGroup = true;
        }

        if (isGroup) {
            // Search for submenu content
            // User structure: <div class="card"><div class="card-header">...</div><ul class="list-group">...</ul></div>

            let submenuList = null;
            const sibling = target.nextElementSibling;

            // Strategy 1: Direct Sibling UL
            if (sibling && sibling.tagName === 'UL') {
                submenuList = sibling;
            }
            // Strategy 2: Bootstrap standard (.collapse wrapper)
            else if (sibling && sibling.classList.contains('collapse')) {
                submenuList = sibling.querySelector('ul');
            }
            // Strategy 3: Parent Card lookup
            else {
                const card = target.closest('.card');
                if (card) {
                    // content usually in the body or list group flush
                    submenuList = card.querySelector('ul');
                }
            }

            if (submenuList) {
                const links = Array.from(submenuList.querySelectorAll('a')).map(a => ({
                    name: a.textContent.trim(),
                    href: a.href
                }));

                if (links.length > 0) {
                    await PinningManager.addPin(name, href, 'group', links);
                    // Continuous Mode: Do NOT turn off
                    return;
                }
            }

            alert('無法偵測到子選單連結，請確認已展開該選單 (Please expand the menu first)');

        } else {
            // Regular Link
            await PinningManager.addPin(name, href, 'link');
            // Continuous Mode: Do NOT turn off
        }
    },

    addPin: async (name, href, type = 'link', items = []) => {
        const current = (await Utils.Storage.get(PinningManager.STORAGE_KEY)) || [];
        if (current.some(p => p.href === href)) {
            alert('Already pinned!');
            return;
        }

        current.push({ name, href, type, items });
        await Utils.Storage.set(PinningManager.STORAGE_KEY, current);
        await PinningManager.renderTask2Items();
        await PinningManager.renderMenu(); // Update menu list immediately
        alert(`Pinned "${name}"!`);
    },

    renderTask2Items: async () => {
        // Strict Check: Only render Task 2 area if no query params
        if (location.search !== '') return;

        // Initialize Editing State if undefined
        if (typeof PinningManager.isEditingTask2 === 'undefined') {
            PinningManager.isEditingTask2 = false;
        }

        let container = document.getElementById('task2-container');

        // If container doesn't exist, we need to create it and replace the original target
        if (!container) {
            const parentXPath = '/html/body/div/form/div[3]/div[2]/div[2]/div';
            const parentElement = Utils.getElementByXPath(parentXPath);

            let targetElement = null;
            if (parentElement && parentElement.children.length >= 2) {
                // Task 2 is 2nd to last (倒數第2個)
                targetElement = parentElement.children[parentElement.children.length - 2];
            }

            if (!targetElement) return;

            container = document.createElement('div');
            container.id = 'task2-container';
            container.style.padding = '35px 10px 10px 10px'; // Extra top padding for buttons
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '15px';
            container.style.justifyContent = 'center';
            container.style.position = 'relative'; // For absolute buttons

            targetElement.replaceWith(container);
        } else {
            // If container exists, just clear it to re-render
            container.innerHTML = '';
            container.style.padding = '35px 10px 10px 10px'; // Ensure padding is correct
        }

        const pins = (await Utils.Storage.get(PinningManager.STORAGE_KEY)) || [];

        // --- Helper: Insertion Marker ---
        let marker = document.getElementById('drag-marker');
        if (!marker) {
            marker = document.createElement('div');
            marker.id = 'drag-marker';
            marker.style.cssText = `
                position: absolute;
                width: 4px; /* Thicker */
                height: 30px;
                background-color: #007bff;
                display: none;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 0 4px rgba(0, 123, 255, 0.5);
                border-radius: 2px;
            `;
            document.body.appendChild(marker);
        } else {
            // Ensure style update if it exists
            marker.style.width = '4px';
        }

        // --- Helper: Edit Wrapper ---
        const enhanceForEditing = (element, index) => {
            if (!PinningManager.isEditingTask2) return element;

            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.draggable = true;
            wrapper.style.cursor = 'grab';

            // disable underlying interactions
            const links = element.tagName === 'A' ? [element] : element.getElementsByTagName('a');
            for (let link of links) {
                link.style.pointerEvents = 'none';
                link.onclick = (e) => e.preventDefault();
            }
            if (element.tagName === 'DIV' && element.classList.contains('tcu-pinned-dropdown')) {
                const btns = element.getElementsByTagName('button');
                for (let btn of btns) btn.disabled = true;
            }

            wrapper.appendChild(element);

            // Delete Button
            const delBtn = document.createElement('div');
            delBtn.textContent = '✕';
            delBtn.title = '刪除';
            delBtn.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                width: 20px;
                height: 20px;
                background: #dc3545;
                color: white;
                border: 2px solid white;
                border-radius: 50%;
                text-align: center;
                line-height: 16px;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                z-index: 100;
                font-weight: bold;
            `;
            delBtn.onclick = async (e) => {
                e.stopPropagation();

                // If this is the active drag item, we might have issues, but unlikely
                const newPins = pins.filter((_, i) => i !== index);
                await Utils.Storage.set(PinningManager.STORAGE_KEY, newPins);
                await PinningManager.renderTask2Items();
                await PinningManager.renderMenu();
            };
            wrapper.appendChild(delBtn);

            // Drag Logic
            wrapper.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', index);
                wrapper.style.opacity = '0.4';
            };
            wrapper.ondragend = () => {
                wrapper.style.opacity = '1';
                marker.style.display = 'none';
            };

            wrapper.ondragover = (e) => {
                e.preventDefault(); // allow drop

                const rect = wrapper.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                const isLeft = e.clientX < midX;

                // GAP Logic: 15px gap
                const gap = 15;
                const markerWidth = 4;
                const offset = (gap / 2) + (markerWidth / 2); // 7.5 + 2 = 9.5

                let markerLeft;
                if (isLeft) {
                    // Marker should be centered in the gap to the left of the element
                    markerLeft = rect.left - offset;
                } else {
                    // Marker should be centered in the gap to the right of the element
                    markerLeft = rect.right + (gap / 2) - (markerWidth / 2);
                }

                // Show Marker
                marker.style.display = 'block';
                marker.style.height = (rect.height + 4) + 'px'; // Slightly taller
                marker.style.top = (rect.top + window.scrollY - 2) + 'px';
                marker.style.left = (markerLeft + window.scrollX) + 'px';

                // Store intended position on the target for Drop
                wrapper.dataset.dropSide = isLeft ? 'before' : 'after';
            };

            wrapper.ondragleave = (e) => {
                if (e.relatedTarget && !wrapper.contains(e.relatedTarget)) {
                    marker.style.display = 'none';
                }
            };

            wrapper.ondrop = async (e) => {
                e.preventDefault();
                marker.style.display = 'none';

                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (isNaN(fromIndex)) return;

                let toIndex = index;
                const dropSide = wrapper.dataset.dropSide;

                if (dropSide === 'after') {
                    toIndex = index + 1;
                }

                if (fromIndex === index) return;

                const newPins = [...pins];
                const [movedItem] = newPins.splice(fromIndex, 1);

                let insertAt = toIndex;
                if (fromIndex < insertAt) {
                    insertAt--;
                }

                newPins.splice(insertAt, 0, movedItem);

                await Utils.Storage.set(PinningManager.STORAGE_KEY, newPins);
                await PinningManager.renderTask2Items();
                await PinningManager.renderMenu();
            };

            return wrapper;
        };

        // --- Render Items ---
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
            position: relative;
        `;
            btn.onmouseover = () => btn.style.backgroundColor = hoverColor;
            btn.onmouseout = () => btn.style.backgroundColor = baseColor;
            return btn;
        };

        const createDropdown = (name, items) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
            position: relative;
            display: inline-block;
        `;

            const btn = document.createElement('button');
            btn.type = 'button'; // Prevent form submission
            btn.textContent = name + ' ▼';
            btn.style.cssText = `
            display: inline-block;
            padding: 8px 16px;
            color: #fff;
            background-color: #6c757d;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: background-color 0.2s;
        `;
            btn.onmouseover = () => btn.style.backgroundColor = '#5a6268';
            btn.onmouseout = () => btn.style.backgroundColor = '#6c757d';

            const menu = document.createElement('div');
            menu.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            min-width: 160px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            flex-direction: column;
        `;

            items.forEach(item => {
                const link = document.createElement('a');
                link.href = item.href;
                link.target = '_blank';
                link.textContent = item.name;
                link.style.cssText = `
                display: block;
                padding: 8px 12px;
                color: #333;
                text-decoration: none;
                font-size: 14px;
                transition: background 0.2s;
                white-space: nowrap;
            `;
                link.onmouseover = () => link.style.background = '#f8f9fa';
                link.onmouseout = () => link.style.background = 'white';
                menu.appendChild(link);
            });

            // Toggle Logic
            btn.onclick = (e) => {
                e.stopPropagation();
                // Close others
                document.querySelectorAll('.tcu-pinned-dropdown').forEach(m => {
                    if (m !== menu) m.style.display = 'none';
                });
                menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            };

            menu.classList.add('tcu-pinned-dropdown'); // Marker for closing

            wrapper.appendChild(btn);
            wrapper.appendChild(menu);

            // Global click to close
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) menu.style.display = 'none';
            });

            return wrapper;
        };

        const defaultBtn = createBtn('開啟 iCan', 'https://admin.tcu.edu.tw/TCUstweb/TranIcan.php', '#007bff', '#0056b3');
        container.appendChild(defaultBtn);

        pins.forEach((pin, index) => {
            if (pin.name && pin.href) {
                let elem;
                if (pin.type === 'group' && pin.items && pin.items.length > 0) {
                    elem = createDropdown(pin.name, pin.items);
                } else {
                    elem = createBtn(pin.name, pin.href);
                }
                container.appendChild(enhanceForEditing(elem, index));
            }
        });

        // --- Toolbar (Absolute Top Right) ---
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            display: flex;
            gap: 5px;
        `;


        // Edit/Done Button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = PinningManager.isEditingTask2 ? '✓' : '✎';
        editBtn.title = PinningManager.isEditingTask2 ? '完成 (Done)' : '編輯 (Edit)';
        editBtn.style.cssText = `
            display: inline-flex;
            justify-content: center;
            align-items: center;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: none;
            background-color: ${PinningManager.isEditingTask2 ? '#28a745' : '#ffc107'};
            color: ${PinningManager.isEditingTask2 ? 'white' : '#333'};
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-size: 16px;
            transition: all 0.2s;
        `;
        editBtn.onclick = () => {
            PinningManager.isEditingTask2 = !PinningManager.isEditingTask2;
            PinningManager.renderTask2Items();
        };
        toolbar.appendChild(editBtn);

        container.appendChild(toolbar);
    },

    // Property to store original pins when entering edit mode
    // originalPins: null, // Removed feature
};
