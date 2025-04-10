'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    const loadingErrorDiv = document.getElementById('loading-error-message');
    const shopTabsContainer = document.getElementById('shop-tabs-container');
    const addTabButton = document.getElementById('add-tab-btn');
    const newShopInputContainer = document.getElementById('new-shop-input-container');
    const newShopNameInput = document.getElementById('new-shop-name-input');
    const saveNewShopButton = document.getElementById('save-new-shop-btn');
    const cancelNewShopButton = document.getElementById('cancel-new-shop-btn');
    const tabContentArea = document.getElementById('tab-content-area');
    const noShopPlaceholder = document.getElementById('no-shop-placeholder');
    const overallSummaryContainer = document.getElementById('overall-summary-container');
    const overallSummaryButton = document.getElementById('overall-summary-btn');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const summaryTimestampElem = document.getElementById('summary-timestamp');
    const copyStatus = document.getElementById('copy-status');
    const modalActionsDiv = summaryModal?.querySelector('.modal-actions');
    const modalCloseButton = document.getElementById('modal-close-btn');
    const copySummaryButton = document.getElementById('copy-summary-btn');
    const closeModalActionButton = document.getElementById('close-modal-action-btn');
    const exportImagesBtn = document.getElementById('export-images-btn');
    const imageExportOutputDiv = document.getElementById('image-export-output');

    // --- Constants ---
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list';
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list';
    // ไม่ใช้ ITEMS_JSON_PATH แล้ว เพราะโหลดจาก API แทน
    const LOCAL_STORAGE_KEY_SHOPS = 'maoOrderFormShopsV1'; // Key สำหรับเก็บข้อมูลร้านค้า

    // --- State Variables ---
    let masterItemList = []; // รายการแนะนำสินค้าทั้งหมด (จะโหลดจาก API)
    let shops = []; // State หลัก เก็บข้อมูลร้านค้าและรายการ (ยังคงโหลด/เซฟจาก localStorage)
    let activeShopId = null; // ID ของแท็บที่กำลังเปิดอยู่
    let summaryModalShopId = null; // ID ของร้านที่กำลังดูใน Modal สรุป

    // ร้านค้าเริ่มต้น (ใช้เมื่อไม่มีข้อมูลใน localStorage)
    const initialShopsData = [
         { id: `shop-init-${Date.now()+1}`, name: 'น้าไฝ', items: [] },
         { id: `shop-init-${Date.now()+2}`, name: 'น้าไพ', items: [] },
         { id: `shop-init-${Date.now()+3}`, name: 'น้ารุ่ง', items: [] },
    ];

    // --- Save/Load Functions (เฉพาะ Shops) ---
    /** บันทึกข้อมูล shops array ลง localStorage */
    function saveShopsToLocalStorage() {
        try {
            const jsonString = JSON.stringify(shops);
            localStorage.setItem(LOCAL_STORAGE_KEY_SHOPS, jsonString);
            console.log(`[Client] ข้อมูลร้านค้าถูกบันทึกลง localStorage (${new Date().toLocaleTimeString()})`);
        } catch (error) {
            console.error("[Client] เกิดข้อผิดพลาดตอนบันทึกข้อมูลร้านค้าลง localStorage:", error);
        }
    }
    /** โหลดข้อมูล shops array จาก localStorage */
    function loadShopsFromLocalStorage() {
        const savedDataString = localStorage.getItem(LOCAL_STORAGE_KEY_SHOPS);
        if (savedDataString) {
            console.log("[Client] พบข้อมูลร้านค้าใน localStorage, กำลังโหลด...");
            try {
                const parsedData = JSON.parse(savedDataString);
                if (Array.isArray(parsedData)) {
                    if (parsedData.every(shop => shop && typeof shop.id === 'string' && typeof shop.name === 'string' && Array.isArray(shop.items))) {
                        shops = parsedData;
                        console.log(`[Client] ข้อมูลร้านค้า ${shops.length} ร้าน ถูกโหลดจาก localStorage สำเร็จ`);
                        return true;
                    } else {
                        console.warn("[Client] ข้อมูลร้านค้าใน localStorage มีโครงสร้างไม่ถูกต้อง, จะใช้ค่าเริ่มต้นแทน");
                        localStorage.removeItem(LOCAL_STORAGE_KEY_SHOPS);
                        return false;
                    }
                } else {
                     console.warn("[Client] ข้อมูลร้านค้าใน localStorage ไม่ใช่ Array, จะใช้ค่าเริ่มต้นแทน");
                     localStorage.removeItem(LOCAL_STORAGE_KEY_SHOPS);
                     return false;
                }
            } catch (error) {
                console.error("[Client] เกิด Error ตอนแปลงข้อมูลร้านค้าจาก localStorage:", error);
                localStorage.removeItem(LOCAL_STORAGE_KEY_SHOPS);
                return false;
            }
        } else {
            console.log("[Client] ไม่พบข้อมูลร้านค้าใน localStorage");
            return false;
        }
    }

    // --- Rendering Functions --- (เหมือนเดิม ไม่ต้องแก้)

    /** วาดแถบแท็บร้านค้าใหม่ทั้งหมด */
    function renderTabs() {
        console.log("[Client] renderTabs called. ActiveShopId:", activeShopId);
        if (!shopTabsContainer || !addTabButton) { console.error("[Client] renderTabs: Missing elements"); return; }
        const previouslyFocusedElement = document.activeElement;
        Array.from(shopTabsContainer.children).forEach(child => {
            if (child !== addTabButton && child !== newShopInputContainer) {
                shopTabsContainer.removeChild(child);
            }
        });
        shops.forEach(shop => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button';
            tabButton.dataset.shopId = shop.id;
            const tabNameSpan = document.createElement('span');
            tabNameSpan.className = 'tab-name';
            tabNameSpan.textContent = shop.name;
            const deleteTabBtn = document.createElement('button');
            deleteTabBtn.className = 'delete-tab-btn';
            deleteTabBtn.innerHTML = '&times;';
            deleteTabBtn.title = `ลบร้าน ${shop.name}`;
            deleteTabBtn.dataset.shopId = shop.id;
            tabButton.appendChild(tabNameSpan);
            tabButton.appendChild(deleteTabBtn);
            if (shop.id === activeShopId) {
                tabButton.classList.add('active');
            }
            shopTabsContainer.insertBefore(tabButton, addTabButton);
        });
        if (document.body.contains(previouslyFocusedElement)) {
            try { previouslyFocusedElement.focus({ preventScroll: true }); } catch (e) {}
        } else if (activeShopId) {
            const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`);
            activeTabButton?.focus({ preventScroll: true });
        }
        updateOverallSummaryButtonVisibility();
    }

    /** วาดเนื้อหาของแท็บที่ถูกเลือก */
    function renderTabContent() {
        console.log("[Client] renderTabContent called. ActiveShopId:", activeShopId);
        if (!tabContentArea) { console.error("[Client] renderTabContent: Missing tabContentArea"); return; }
        tabContentArea.innerHTML = '';
        const activeShop = shops.find(shop => shop.id === activeShopId);
        if (activeShop) {
            console.log("[Client] Rendering content for shop:", activeShop.name);
            const headerDiv = document.createElement('div');
            headerDiv.className = 'shop-header';
            const shopNameDisplay = document.createElement('span');
            shopNameDisplay.className = 'shop-name-display';
            shopNameDisplay.textContent = activeShop.name;
            headerDiv.appendChild(shopNameDisplay);
            tabContentArea.appendChild(headerDiv);
            const entryArea = createItemEntryArea(activeShop.id);
            tabContentArea.appendChild(entryArea);
            const itemListArea = document.createElement('div');
            itemListArea.className = 'item-list-area';
            itemListArea.id = `item-list-${activeShop.id}`;
            const ul = document.createElement('ul');
            if (activeShop.items.length > 0) {
                activeShop.items.forEach((item, index) => {
                    ul.appendChild(createShopItemRow(activeShop.id, item, index));
                });
            } else {
                ul.innerHTML = '<li class="item-list-placeholder">ยังไม่มีรายการในร้านนี้...</li>';
            }
            itemListArea.appendChild(ul);
            tabContentArea.appendChild(itemListArea);
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'shop-actions';
            const clearBtn = document.createElement('button');
            clearBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> ล้างรายการร้านนี้`;
            clearBtn.className = 'action-button clear-items-btn';
            clearBtn.type = "button";
            clearBtn.dataset.shopId = activeShop.id;
            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = '📋 สรุปรายการร้านนี้';
            summarizeBtn.className = 'action-button summarize-btn';
            summarizeBtn.type = "button";
            summarizeBtn.addEventListener('click', () => showSummary(activeShopId));
            buttonsDiv.appendChild(clearBtn);
            buttonsDiv.appendChild(summarizeBtn);
            tabContentArea.appendChild(buttonsDiv);
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'none';
        } else {
            console.log("[Client] No active shop, showing placeholder.");
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'block';
        }
    }

    /** สร้างแถวสำหรับแสดงรายการสินค้าใน List Area */
    function createShopItemRow(shopId, itemData, index) {
        const li = document.createElement('li'); li.className = 'shop-item-row'; li.dataset.shopId = shopId; li.dataset.itemIndex = index; const displayDiv = document.createElement('div'); displayDiv.className = 'item-display-mode'; const quantitySpan = document.createElement('span'); quantitySpan.className = 'item-quantity'; quantitySpan.textContent = itemData.quantity; const unitSpan = document.createElement('span'); unitSpan.className = 'item-unit'; unitSpan.textContent = itemData.unit || '?'; const nameSpan = document.createElement('span'); nameSpan.className = 'item-name'; nameSpan.textContent = itemData.item; const actionButtonsDiv = document.createElement('div'); actionButtonsDiv.className = 'item-actions-display'; const editBtn = document.createElement('button'); editBtn.className = 'edit-item-inline-btn'; editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"/></svg>`; editBtn.title = `แก้ไข ${itemData.item}`; const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-item-inline-btn'; deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`; deleteBtn.title = `ลบ ${itemData.item}`; actionButtonsDiv.appendChild(editBtn); actionButtonsDiv.appendChild(deleteBtn); displayDiv.appendChild(quantitySpan); displayDiv.appendChild(unitSpan); displayDiv.appendChild(nameSpan); displayDiv.appendChild(actionButtonsDiv); const editDiv = document.createElement('div'); editDiv.className = 'item-edit-mode hidden'; const editQuantityInput = document.createElement('input'); editQuantityInput.type = 'number'; editQuantityInput.className = 'edit-quantity-inline'; editQuantityInput.value = itemData.quantity; editQuantityInput.min = "0"; editQuantityInput.step = "any"; const editUnitInput = document.createElement('input'); editUnitInput.type = 'text'; editUnitInput.className = 'edit-unit-inline'; editUnitInput.value = itemData.unit || ''; editUnitInput.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); const editNameSpan = document.createElement('span'); editNameSpan.className = 'item-name-edit-display'; editNameSpan.textContent = itemData.item; const editActionButtonsDiv = document.createElement('div'); editActionButtonsDiv.className = 'item-actions-edit'; const saveBtn = document.createElement('button'); saveBtn.className = 'save-edit-inline-btn'; saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>`; saveBtn.title = 'บันทึกการแก้ไข'; const cancelBtn = document.createElement('button'); cancelBtn.className = 'cancel-edit-inline-btn'; cancelBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; cancelBtn.title = 'ยกเลิกการแก้ไข'; editActionButtonsDiv.appendChild(saveBtn); editActionButtonsDiv.appendChild(cancelBtn); editDiv.appendChild(editQuantityInput); editDiv.appendChild(editUnitInput); editDiv.appendChild(editNameSpan); editDiv.appendChild(editActionButtonsDiv); li.appendChild(displayDiv); li.appendChild(editDiv); return li;
    }

    // --- UI Creation Functions --- (เหมือนเดิม ไม่ต้องแก้)
    function createOrUpdateDatalist(listId, optionsArray) {
        let datalist = document.getElementById(listId); if (!datalist) { datalist = document.createElement('datalist'); datalist.id = listId; document.body.appendChild(datalist); datalist = document.getElementById(listId); if (!datalist) { console.error(`[Client] !!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`); return; } } datalist.innerHTML = ''; if (!Array.isArray(optionsArray)) { console.error(`[Client] ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`); return; } const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th')); sortedOptions.forEach(optionValue => { if (typeof optionValue === 'string' && optionValue.trim() !== '') { try { const option = document.createElement('option'); option.value = optionValue; datalist.appendChild(option); } catch (e) { console.error(`[Client] เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e); } } });
    }
    function createUnitInputEntry(selectedUnit = '') {
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'หน่วย'; input.className = 'entry-unit'; input.value = selectedUnit; input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); return input;
    }
    function createItemInputEntry(selectedItem = '') {
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'ใส่รายการ กด + เพื่อเพิ่ม...'; input.className = 'entry-item'; input.value = selectedItem; input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); return input;
    }
    function createItemEntryArea(shopId) {
        const entryDiv = document.createElement('div'); entryDiv.className = 'item-entry-area'; entryDiv.dataset.shopId = shopId; const quantityInput = document.createElement('input'); quantityInput.type = 'number'; quantityInput.placeholder = 'จำนวน'; quantityInput.min = "0"; quantityInput.step = "any"; quantityInput.className = 'entry-quantity'; const unitInput = createUnitInputEntry(); const itemInput = createItemInputEntry(); const addBtn = document.createElement('button'); addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`; addBtn.className = 'action-button entry-add-btn'; addBtn.title = "เพิ่มรายการนี้"; addBtn.type = "button"; const statusDiv = document.createElement('div'); statusDiv.className = 'entry-status'; entryDiv.appendChild(quantityInput); entryDiv.appendChild(unitInput); entryDiv.appendChild(itemInput); entryDiv.appendChild(addBtn); entryDiv.appendChild(statusDiv); return entryDiv;
    }

    // --- Event Handlers ---
    // Handler ส่วนใหญ่เหมือนเดิม ยกเว้น handleAddItemClick ที่ต้องเพิ่มส่วน fetch POST

    /** จัดการการคลิกแท็บร้านค้า */
    function handleTabClick(event) { if (event.target.closest('.delete-tab-btn')) { return; } const clickedTab = event.target.closest('.tab-button'); if (!clickedTab || clickedTab.classList.contains('active')) { return; } const newActiveShopId = clickedTab.dataset.shopId; console.log("[Client] Tab selected:", newActiveShopId); if (newActiveShopId) { activeShopId = newActiveShopId; renderTabs(); renderTabContent(); } }
    /** จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() { console.log("[Client] Add tab button clicked"); if (newShopInputContainer && addTabButton && newShopNameInput) { newShopInputContainer.classList.remove('hidden'); addTabButton.classList.add('hidden'); newShopNameInput.value = ''; newShopNameInput.focus(); console.log("[Client] Showing new shop input"); } else { console.error("[Client] handleAddTabClick: Missing required elements"); } }
    /** จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() { console.log("[Client] Cancel new shop"); if (newShopInputContainer && addTabButton) { newShopInputContainer.classList.add('hidden'); addTabButton.classList.remove('hidden'); newShopNameInput.value = ''; } else { console.error("[Client] handleCancelNewShop: Missing required elements"); } }
    /** จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() { console.log("[Client] Save new shop clicked"); if (!newShopNameInput) { console.error("[Client] handleSaveNewShop: Missing newShopNameInput"); return; } const newName = newShopNameInput.value.trim(); if (!newName) { alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ"); newShopNameInput.focus(); return; } if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) { alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`); newShopNameInput.focus(); newShopNameInput.select(); return; } const newShopId = `shop-${Date.now()}`; const newShopData = { id: newShopId, name: newName, items: [] }; shops.push(newShopData); activeShopId = newShopId; console.log("[Client] New shop added:", newShopData); renderTabs(); renderTabContent(); handleCancelNewShop(); saveShopsToLocalStorage(); }
     /** จัดการการกดปุ่มลบร้าน (X บนแท็บ) */
    function handleDeleteShopClick(event) { const deleteButton = event.target.closest('.delete-tab-btn'); if (!deleteButton) return; const shopIdToDelete = deleteButton.dataset.shopId; const shopToDelete = shops.find(s => s.id === shopIdToDelete); console.log("[Client] Delete tab button clicked for:", shopIdToDelete, shopToDelete?.name); if (!shopToDelete) return; if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) { const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete); if (indexToDelete > -1) { shops.splice(indexToDelete, 1); console.log("[Client] Shop removed from state."); if (activeShopId === shopIdToDelete) { if (shops.length === 0) { activeShopId = null; } else if (indexToDelete >= shops.length) { activeShopId = shops[shops.length - 1].id; } else { activeShopId = shops[indexToDelete].id; } console.log("[Client] New activeShopId:", activeShopId); } renderTabs(); renderTabContent(); saveShopsToLocalStorage(); } } }
    /** จัดการการกดปุ่ม "เพิ่มรายการ" (+) และส่งรายการใหม่ (ถ้ามี) ไปยังเซิร์ฟเวอร์ */
    function handleAddItemClick(event) {
        const addButton = event.target.closest('.entry-add-btn');
        if (!addButton) return;
        const entryArea = addButton.closest('.item-entry-area');
        if (!entryArea) return;

        const shopId = entryArea.dataset.shopId;
        const quantityInput = entryArea.querySelector('.entry-quantity');
        const unitInput = entryArea.querySelector('.entry-unit');
        const itemInput = entryArea.querySelector('.entry-item');

        if (!shopId || !quantityInput || !unitInput || !itemInput) {
            console.error("[Client] หา elements ใน entry area ไม่เจอ ร้าน:", shopId); return;
        }

        const quantity = quantityInput.value.trim();
        const unit = unitInput.value.trim();
        const itemName = itemInput.value.trim();
        const itemNameLower = itemName.toLowerCase();

        console.log(`[Client] Add item attempt: Qty=${quantity}, Unit=${unit}, Item=${itemName}, Shop=${shopId}`);

        if (!itemName) {
            showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true); itemInput.focus(); return;
        }
        if (!quantity) {
            showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true); quantityInput.focus(); return;
        }

        const shop = shops.find(s => s.id === shopId);
        if (!shop) {
            console.error("[Client] ไม่เจอร้านใน state ID:", shopId); showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true); return;
        }

        // --- ส่วนจัดการการเพิ่ม Item ลงใน Shop (Client-side state) ---
        const isDuplicateInShop = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicateInShop) {
            console.log("[Client] Duplicate item found in this shop:", itemName);
            showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true); itemInput.focus(); itemInput.select(); return;
        }

        const newItem = { quantity: quantity, unit: unit || '?', item: itemName };
        shop.items.push(newItem);
        const newItemIndex = shop.items.length - 1;
        console.log("[Client] Item added to shop state:", shop.items);

        // Update UI for the shop list
        const listAreaUl = tabContentArea.querySelector(`#item-list-${shopId} ul`);
        if (listAreaUl) {
            const placeholder = listAreaUl.querySelector('.item-list-placeholder'); placeholder?.remove();
            const newItemRow = createShopItemRow(shopId, newItem, newItemIndex);
            listAreaUl.appendChild(newItemRow);
            listAreaUl.parentElement.scrollTop = listAreaUl.parentElement.scrollHeight;
        } else {
            console.error("[Client] Could not find list area UL for shop:", shopId); renderTabContent(); // Fallback to re-render
        }
        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" เข้าร้านแล้ว!`, false);

        // Save updated shop data to localStorage
        saveShopsToLocalStorage();

        // Clear input fields
        quantityInput.value = '';
        unitInput.value = '';
        itemInput.value = '';
        itemInput.focus();

        // --- ส่วนเช็คและส่ง Item ใหม่ไป Backend ---
        if (itemNameLower) { // เช็คว่าชื่อรายการไม่ว่าง
            const isTrulyNewGlobally = !masterItemList.some(existingItem => existingItem.toLowerCase() === itemNameLower);

            if (isTrulyNewGlobally) {
                console.log(`[Client] "${itemName}" เป็นของใหม่! กำลังส่งไปให้เซิร์ฟเวอร์...`);
                // ส่งรายการใหม่ไปที่เซิร์ฟเวอร์ (Backend) ที่ /api/items
                fetch('/api/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ newItem: itemName }), // ส่งชื่อรายการใหม่ไป
                })
                .then(response => response.json().then(data => ({ ok: response.ok, status: response.status, data }))) // Wrap response
                .then(({ ok, status, data }) => {
                    if (ok && data.success && data.added) {
                        console.log(`[Client] เซิร์ฟเวอร์เพิ่ม "${itemName}" ลง items.json สำเร็จ!`);
                        // อัปเดต masterItemList ฝั่ง Client ด้วยเลย (Optimistic Update)
                        masterItemList.push(itemName);
                        masterItemList.sort((a, b) => a.localeCompare(b, 'th'));
                        createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList); // อัปเดต datalist ทันที
                    } else if (ok && data.success && !data.added) {
                        console.log(`[Client] เซิร์ฟเวอร์แจ้งว่า "${itemName}" มีอยู่แล้ว (อาจจะเพิ่มไปก่อนหน้าแล้ว)`);
                         // แม้จะมีอยู่แล้ว ก็ควรอัปเดต Datalist เผื่อกรณีโหลดครั้งแรกไม่สำเร็จ
                         if (!masterItemList.some(i => i.toLowerCase() === itemNameLower)) {
                             masterItemList.push(itemName);
                             masterItemList.sort((a, b) => a.localeCompare(b, 'th'));
                             createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
                         }
                    } else {
                         console.warn('[Client] เซิร์ฟเวอร์ตอบกลับมาว่าเพิ่มรายการไม่สำเร็จ:', data.message || `Status: ${status}`);
                    }
                })
                .catch(error => {
                    console.error('[Client] เกิดข้อผิดพลาดตอนส่งรายการใหม่ไปเซิร์ฟเวอร์:', error);
                    // อาจจะแจ้งเตือนผู้ใช้ว่าการอัปเดต list suggestion อาจจะไม่สำเร็จ
                    showEntryStatus(entryArea, `⚠️ เพิ่ม "${itemName}" เข้าร้านแล้ว แต่ส่งไปอัปเดตรายการแนะนำไม่สำเร็จ`, true);
                });
            } else {
                 console.log(`[Client] "${itemName}" มีใน masterItemList อยู่แล้ว ไม่ต้องส่งไปเซิร์ฟเวอร์`);
            }
        }
        // --- จบส่วนส่ง Backend ---
    } // --- จบ handleAddItemClick ---

    /** แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) { const statusDiv = entryAreaElement?.querySelector('.entry-status'); if (!statusDiv) return; statusDiv.textContent = message; statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`; statusDiv.style.display = 'block'; setTimeout(() => { statusDiv.style.display = 'none'; statusDiv.textContent = ''; statusDiv.className = 'entry-status'; }, 2500); }
     /** จัดการการกดปุ่มลบรายการ (ถังขยะ) ใน List Area */
    function handleDeleteItemInline(event) { const deleteButton = event.target.closest('.delete-item-inline-btn'); if (!deleteButton) return; const tableRow = deleteButton.closest('.shop-item-row'); if (!tableRow) return; const shopId = tableRow.dataset.shopId; const itemIndex = parseInt(tableRow.dataset.itemIndex, 10); if (shopId === undefined || isNaN(itemIndex)) { console.error("[Client] ไม่สามารถหา shopId หรือ itemIndex สำหรับลบ inline ได้"); return; } const shop = shops.find(s => s.id === shopId); if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.error("[Client] หาข้อมูลร้านหรือรายการที่จะลบ inline ไม่เจอ:", shopId, itemIndex); return; } const itemToDelete = shop.items[itemIndex]; if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) { shop.items.splice(itemIndex, 1); console.log("[Client] Item deleted inline from shop state."); saveShopsToLocalStorage(); // Save after modifying shop items renderTabContent(); // Re-render to update the list const entryArea = tabContentArea.querySelector(`.item-entry-area[data-shop-id="${shopId}"]`); if (entryArea) { showEntryStatus(entryArea, `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`, false); } } }
    /** จัดการการกดปุ่มแก้ไข (ดินสอ) ใน List Area */
    function handleEditItemInline(event) { const editButton = event.target.closest('.edit-item-inline-btn'); if (!editButton) return; const itemRow = editButton.closest('.shop-item-row'); if (!itemRow) return; const displayMode = itemRow.querySelector('.item-display-mode'); const editMode = itemRow.querySelector('.item-edit-mode'); if (displayMode && editMode) { const shopId = itemRow.dataset.shopId; const itemIndex = parseInt(itemRow.dataset.itemIndex, 10); const shop = shops.find(s => s.id === shopId); if (shop && shop.items[itemIndex]) { const currentItem = shop.items[itemIndex]; const editQuantityInput = editMode.querySelector('.edit-quantity-inline'); const editUnitInput = editMode.querySelector('.edit-unit-inline'); if(editQuantityInput) editQuantityInput.value = currentItem.quantity; if(editUnitInput) editUnitInput.value = currentItem.unit || ''; } displayMode.classList.add('hidden'); editMode.classList.remove('hidden'); const quantityInput = editMode.querySelector('.edit-quantity-inline'); quantityInput?.focus(); quantityInput?.select(); } else { console.error("[Client] Could not find display/edit mode divs in item row"); } }
    /** จัดการการกดปุ่มบันทึก (เครื่องหมายถูก) ในโหมดแก้ไข Inline */
    function handleSaveEditInline(event) { const saveButton = event.target.closest('.save-edit-inline-btn'); if (!saveButton) return; const itemRow = saveButton.closest('.shop-item-row'); const editMode = saveButton.closest('.item-edit-mode'); const displayMode = itemRow?.querySelector('.item-display-mode'); if (!itemRow || !editMode || !displayMode) return; const shopId = itemRow.dataset.shopId; const itemIndex = parseInt(itemRow.dataset.itemIndex, 10); const editQuantityInput = editMode.querySelector('.edit-quantity-inline'); const editUnitInput = editMode.querySelector('.edit-unit-inline'); if (shopId === undefined || isNaN(itemIndex) || !editQuantityInput || !editUnitInput) { console.error("[Client] Cannot find elements or data for saving inline edit"); return; } const newQuantity = editQuantityInput.value.trim(); const newUnit = editUnitInput.value.trim() || '?'; if (!newQuantity || parseFloat(newQuantity) < 0) { alert("เพื่อน! จำนวนต้องไม่ว่าง และห้ามติดลบนะ"); editQuantityInput.focus(); return; } const shop = shops.find(s => s.id === shopId); if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.error("[Client] Cannot find item in state to save edit:", shopId, itemIndex); alert("เกิดข้อผิดพลาด: ไม่พบรายการที่จะแก้ไข"); handleCancelEditInline(event); return; } shop.items[itemIndex].quantity = newQuantity; shop.items[itemIndex].unit = newUnit; console.log(`[Client] Item ${itemIndex} updated in shop ${shopId}:`, shop.items[itemIndex]); saveShopsToLocalStorage(); // Save after modifying shop items const quantitySpan = displayMode.querySelector('.item-quantity'); const unitSpan = displayMode.querySelector('.item-unit'); if (quantitySpan) quantitySpan.textContent = newQuantity; if (unitSpan) unitSpan.textContent = newUnit; editMode.classList.add('hidden'); displayMode.classList.remove('hidden'); }
    /** จัดการการกดปุ่มยกเลิก (X) ในโหมดแก้ไข Inline */
    function handleCancelEditInline(event) { const cancelButton = event.target.closest('.cancel-edit-inline-btn'); if (!cancelButton) return; const itemRow = cancelButton.closest('.shop-item-row'); const editMode = cancelButton.closest('.item-edit-mode'); const displayMode = itemRow?.querySelector('.item-display-mode'); if (itemRow && editMode && displayMode) { editMode.classList.add('hidden'); displayMode.classList.remove('hidden'); } }
    /** จัดการการกดปุ่ม "ล้างรายการร้านนี้" (Delegated) */
    function handleClearShopItems(event) { const clearButton = event.target.closest('.clear-items-btn'); if (!clearButton) return; const shopId = clearButton.dataset.shopId; const shop = shops.find(s => s.id === shopId); if (!shop) { console.error("[Client] Cannot find shop to clear items for ID:", shopId); return; } if (shop.items.length === 0) { alert(`ร้าน "${shop.name}" ไม่มีรายการให้ล้างอยู่แล้วเพื่อน`); return; } if (confirm(`**คำเตือน!** ยืนยันล้างรายการของทั้งหมดในร้าน "${shop.name}" จริงดิ?\nร้านค้าจะยังอยู่ แต่ของจะหายหมดนะ!`)) { shop.items = []; console.log(`[Client] Cleared items for shop ${shopId}`); saveShopsToLocalStorage(); renderTabContent(); const entryArea = tabContentArea.querySelector(`.item-entry-area[data-shop-id="${shopId}"]`); if (entryArea) { showEntryStatus(entryArea, `🧹 ล้างรายการร้าน "${shop.name}" เรียบร้อย!`, false); } } }

    // --- Core Logic Functions --- (เหมือนเดิม ไม่ต้องแก้)
    function updateOverallSummaryButtonVisibility() {
        const shopSectionsExist = shops.length > 0; if (overallSummaryContainer) { overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none'; }
    }
    /** ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป */
    function getOrderData(shopId = null) {
        if (shopId) { const shop = shops.find(s => s.id === shopId); if (shop) { return [{ shopId: shop.id, shopName: shop.name, items: [...shop.items] }]; } else { return []; } } else { return shops.map(shop => ({ shopId: shop.id, shopName: shop.name, items: [...shop.items] })); }
    }
    function formatThaiTimestamp() {
        const now = new Date(); const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' }; const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }; try { const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' }); const buddhistYear = yearFormatter.format(now); const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); const formattedTime = now.toLocaleTimeString('th-TH', timeOptions); return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`; } catch (e) { console.error("[Client] เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    /** แสดง Modal สรุป (Read-Only + 4 Columns + Footer) */
    function showSummary(shopId = null) {
        console.log("[Client] showSummary called for shopId:", shopId);
        if (!summaryModal || !summaryContent || !summaryTimestampElem || !modalActionsDiv || !imageExportOutputDiv) {
            console.error("[Client] showSummary: Missing required modal elements"); return;
        }
        summaryModalShopId = shopId;
        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp;

        console.log("[Client] Calling getOrderData with:", summaryModalShopId);
        const data = getOrderData(summaryModalShopId);
        console.log("[Client] Data received from getOrderData:", JSON.stringify(data).substring(0, 200) + '...');

        summaryContent.innerHTML = ''; // Clear previous summary content
        imageExportOutputDiv.innerHTML = ''; // Clear previous image output
        if (copyStatus) copyStatus.style.display = 'none';

        if (data.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            data.forEach(shopData => {
                const currentShopId = shopData.shopId;
                if (!currentShopId) { console.error("[Client] Shop data missing ID in showSummary loop:", shopData); return; }

                const shopNameEscaped = escapeHtml(shopData.shopName);
                modalHtml += `<div class="shop-summary-block" data-shop-id="${currentShopId}" data-shop-name="${shopNameEscaped}">`;
                modalHtml += `<h3 style="font-size: 1.1rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.25rem; color: #1f2937; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb;">🛒 ${shopNameEscaped}</h3>`;
                if (summaryModalShopId === null) {
                    const timePart = overallTimestamp.split(' เวลา ')[1] || '';
                    const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ','');
                    modalHtml += `<p class="shop-timestamp-print" style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; text-align: left;">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                }
                modalHtml += `<table class="summary-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 0.9rem;"><thead><tr><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; width: 15%; font-weight: 600;">จำนวน</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">หน่วย</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 45%; font-weight: 600;">รายการ</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">ราคา/หมายเหตุ</th></tr></thead><tbody>`;
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach((item, index) => {
                        modalHtml += `<tr>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: top;">${escapeHtml(item.quantity)}</td>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;">${escapeHtml(item.unit)}</td>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; word-wrap: break-word;">${escapeHtml(item.item)}</td>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;"></td>
                                      </tr>`;
                    });
                } else {
                     modalHtml += `<tr><td colspan="4" style="text-align: center; font-style: italic; color: grey; border: 1px solid #ddd; padding: 6px 8px;">(ไม่มีรายการ)</td></tr>`;
                }
                 modalHtml += `</tbody><tfoot style="font-weight: bold; background-color: #f8f9fa;"><tr><td colspan="3" style="border: 1px solid #ddd; border-right: none; padding: 6px 10px 6px 8px; text-align: right;">รวมราคา:</td><td style="border: 1px solid #ddd; border-left: none; padding: 6px 8px; min-height: 1.5em;"></td></tr></tfoot>`;
                 modalHtml += `</table>`;
                 modalHtml += `</div>`;
            });
            summaryContent.innerHTML = modalHtml;
        }
        console.log("[Client] Attempting to display modal...");
        summaryModal.style.display = 'block';
        console.log("[Client] Modal display style set to 'block'.");
    }

    /** ปิด Modal */
    function closeModal() {
        if (summaryModal) summaryModal.style.display = 'none'; summaryModalShopId = null;
    }
    /** คัดลอกสรุป */
    function copySummaryToClipboard() {
         if (!summaryContent) return; let textToCopy = ""; const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n"; const dataToCopy = getOrderData(summaryModalShopId); if(dataToCopy.length === 0) { textToCopy += "(ไม่มีรายการสั่งซื้อ)"; } else { dataToCopy.forEach((shopData, index) => { const shopNameOnly = shopData.shopName.replace(/🛒\s*/, ''); textToCopy += `--- ${shopNameOnly} ---\n`; if (shopData.items.length > 0) { shopData.items.forEach(item => { textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`; }); } else { textToCopy += "(ไม่มีรายการ)\n"; } if (index < dataToCopy.length - 1) { textToCopy += "\n"; } }); } if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textToCopy.trim()).then(() => { if (copyStatus) { copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); } }).catch(err => { console.error('[Client] Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); }); } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }

    // --- V20: Function to Export Summary as Images --- (เหมือนเดิม ไม่ต้องแก้)
    async function exportSummaryAsImages() {
        if (typeof html2canvas === 'undefined') {
            alert('เกิดข้อผิดพลาด: ไม่สามารถโหลด Library html2canvas ได้');
            console.error('[Client] html2canvas is not defined. Make sure the library is included correctly.');
            return;
        }
        if (!imageExportOutputDiv) {
            console.error('[Client] Image export output div not found!'); return;
        }
        imageExportOutputDiv.innerHTML = '<p class="export-status">⏳ กำลังสร้างรูปภาพสรุป กรุณารอสักครู่...</p>';
        const shopBlocks = document.querySelectorAll('#summaryContent .shop-summary-block');
        if (shopBlocks.length === 0) {
            imageExportOutputDiv.innerHTML = '<p class="export-status">🤷 ไม่มีรายการสรุปให้สร้างรูปภาพ</p>'; return;
        }
        console.log(`[Client] Found ${shopBlocks.length} shop blocks to export.`);
        let successCount = 0; let errorCount = 0;
        for (const shopBlock of shopBlocks) {
            const shopId = shopBlock.dataset.shopId;
            const shopName = shopBlock.dataset.shopName || `ร้านค้า-${shopId}`;
            try {
                console.log(`[Client] Processing shop: ${shopName}`);
                const options = { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', };
                const canvas = await html2canvas(shopBlock, options);
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                img.style.maxWidth = '95%'; img.style.border = '1px solid #ccc'; img.style.marginBottom = '5px'; img.alt = `รูปสรุป ${shopName}`;
                const link = document.createElement('a');
                link.href = img.src;
                const safeShopName = shopName.replace(/[^a-z0-9ก-๙เ-์]/gi, '_').substring(0, 30);
                link.download = `สรุป-${safeShopName}.png`;
                link.textContent = `📥 ดาวน์โหลดรูป ${shopName}`;
                link.className = 'action-button download-image-btn';
                const outputItem = document.createElement('div');
                outputItem.className = 'image-export-item';
                outputItem.appendChild(img); outputItem.appendChild(link);
                if (successCount === 0 && errorCount === 0) { imageExportOutputDiv.innerHTML = ''; }
                imageExportOutputDiv.appendChild(outputItem); successCount++;
                console.log(`[Client] Successfully generated image for ${shopName}`);
            } catch (error) {
                console.error(`[Client] เกิดข้อผิดพลาดตอนสร้างรูปภาพสำหรับร้าน ${shopName}:`, error); errorCount++;
                 if (successCount === 0 && errorCount === 1) { imageExportOutputDiv.innerHTML = ''; }
                const errorMsg = document.createElement('p'); errorMsg.textContent = `❌ สร้างรูปสำหรับร้าน ${shopName} ไม่สำเร็จ`; errorMsg.style.color = 'red'; imageExportOutputDiv.appendChild(errorMsg);
            }
        } // End of loop
        const finalStatus = document.createElement('p'); finalStatus.className = 'export-status';
        if (successCount > 0 && errorCount === 0) { finalStatus.textContent = `✅ สร้างรูปภาพเสร็จแล้ว ${successCount} รูป!`; finalStatus.style.color = 'green'; }
        else if (successCount > 0 && errorCount > 0) { finalStatus.textContent = `⚠️ สร้างรูปภาพเสร็จ ${successCount} รูป แต่เกิดข้อผิดพลาด ${errorCount} รูป`; finalStatus.style.color = 'orange'; }
        else { finalStatus.textContent = `❌ ไม่สามารถสร้างรูปภาพได้เลย (${errorCount} ข้อผิดพลาด)`; finalStatus.style.color = 'red'; }
        imageExportOutputDiv.prepend(finalStatus);
        console.log(`[Client] Image export finished. Success: ${successCount}, Errors: ${errorCount}`);
    }


    // --- Initialization Function (แก้ไขส่วนโหลด masterItemList) ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("[Client] --- เริ่มต้น initializeApp ---");
        if (!loadingErrorDiv) { console.error("[Client] หา #loading-error-message ไม่เจอ!"); return; }

        // 1. โหลดข้อมูลร้านค้าจาก LocalStorage (เหมือนเดิม)
        const loadedShops = loadShopsFromLocalStorage();
        if (!loadedShops) {
            shops = JSON.parse(JSON.stringify(initialShopsData));
            console.warn("[Client] ใช้ข้อมูลร้านค้าเริ่มต้น");
        }

        // 2. โหลด Master Item List จาก API ของเซิร์ฟเวอร์
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของจากเซิร์ฟเวอร์...';
        loadingErrorDiv.style.display = 'block';
        try {
            const response = await fetch('/api/items'); // <<< โหลดจาก API
            if (!response.ok) {
                throw new Error(`โหลดลิสต์ของไม่ได้ (${response.status}) ลองเช็คว่าเปิดเซิร์ฟเวอร์ (node server.js) รึยัง?`);
            }
            const jsonData = await response.json();
            if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลที่ได้จาก /api/items ไม่ใช่ Array`);
            masterItemList = jsonData;
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการจากเซิร์ฟเวอร์เรียบร้อย!`;
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error('[Client] !!! เกิดข้อผิดพลาดตอนโหลด items จาก /api/items:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ไม่เป็นไร ลองเช็คเซิร์ฟเวอร์แล้วรีเฟรชดู`;
            masterItemList = []; // ถ้าโหลดไม่ได้ ให้ใช้ list ว่างไปก่อน
        } finally {
             // 3. สร้าง Datalists (ทำหลังจากพยายามโหลดข้อมูลแล้วเสมอ)
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList); // ใช้ masterItemList ที่โหลดมา (หรือ list ว่างถ้าโหลดเฟล)
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS); // สร้าง datalist หน่วย

             // 4. ตั้งค่า Active Shop และ Render UI เริ่มต้น
            if (shops.length > 0 && (!activeShopId || !shops.some(s => s.id === activeShopId))) {
                activeShopId = shops[0].id;
            } else if (shops.length === 0) {
                activeShopId = null;
            }
            renderTabs();
            renderTabContent();

             // 5. ตั้งค่า Event Listeners (ทำหลัง Render ครั้งแรก)
            setupEventListeners();
            console.log("[Client] --- initializeApp เสร็จสิ้น ---");
        }
    }

    /** ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก (เหมือนเดิม) */
    function setupEventListeners() {
        console.log("[Client] Setting up event listeners...");
        addTabButton?.addEventListener('click', handleAddTabClick);
        cancelNewShopButton?.addEventListener('click', handleCancelNewShop);
        saveNewShopButton?.addEventListener('click', handleSaveNewShop);
        newShopNameInput?.addEventListener('keypress', (event) => { if (event.key === 'Enter') { handleSaveNewShop(); } });
        if (overallSummaryButton) {
            overallSummaryButton.addEventListener('click', () => { console.log("[Client] Overall summary button clicked!"); showSummary(); });
        } else { console.error("[Client] Overall summary button not found!"); }
        modalCloseButton?.addEventListener('click', closeModal);
        copySummaryButton?.addEventListener('click', copySummaryToClipboard);
        closeModalActionButton?.addEventListener('click', closeModal);
        exportImagesBtn?.addEventListener('click', exportSummaryAsImages);
        window.addEventListener('click', (event) => { if (event.target == summaryModal) closeModal(); });
        if (shopTabsContainer) {
            shopTabsContainer.addEventListener('click', handleTabClick);
            shopTabsContainer.addEventListener('click', handleDeleteShopClick);
        } else { console.error("[Client] shopTabsContainer not found for delegation!"); }
        if (tabContentArea) {
            tabContentArea.addEventListener('click', handleAddItemClick); // จุดสำคัญที่แก้ไขไปแล้ว
            tabContentArea.addEventListener('keypress', (event) => { if (event.key === 'Enter' && event.target.classList.contains('entry-item')) { event.preventDefault(); const entryArea = event.target.closest('.item-entry-area'); const addButton = entryArea?.querySelector('.entry-add-btn'); addButton?.click(); } });
            tabContentArea.addEventListener('click', handleDeleteItemInline);
            tabContentArea.addEventListener('click', handleEditItemInline);
            tabContentArea.addEventListener('click', handleSaveEditInline);
            tabContentArea.addEventListener('click', handleCancelEditInline);
            tabContentArea.addEventListener('click', handleClearShopItems);
        } else { console.error("[Client] tabContentArea not found for delegation!"); }
        console.log("[Client] Event listeners setup complete.");
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener