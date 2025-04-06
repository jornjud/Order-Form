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
    const modalActionsDiv = summaryModal?.querySelector('.modal-actions'); // V18: ยังใช้อยู่ แต่ไม่มีปุ่ม Save แล้ว
    const modalCloseButton = document.getElementById('modal-close-btn');
    const copySummaryButton = document.getElementById('copy-summary-btn');
    const closeModalActionButton = document.getElementById('close-modal-action-btn');

    // --- Constants ---
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list';
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list';
    const ITEMS_JSON_PATH = 'items.json';
    // const SAVE_CHANGES_BTN_ID = 'save-summary-changes-btn'; // V18: ไม่ใช้แล้ว

    // --- State Variables ---
    let masterItemList = [];
    let shops = [];
    let activeShopId = null;
    let summaryModalShopId = null; // V18: ยังเก็บไว้เผื่อใช้ตอนเปิด modal
    // let hasUnsavedChanges = false; // V18: ไม่จำเป็นต้องใช้ flag นี้แล้ว เพราะแก้ในหน้าหลัก

    // V18: ร้านค้าเริ่มต้น (เหมือน V17)
    const initialShopsData = [
         { id: `shop-init-${Date.now()+1}`, name: 'น้าไฝ', items: [] },
         { id: `shop-init-${Date.now()+2}`, name: 'น้าไพ', items: [] },
         { id: `shop-init-${Date.now()+3}`, name: 'น้ารุ่ง', items: [] },
    ];

    // --- V18: Rendering Functions ---

    /** V18: วาดแถบแท็บร้านค้าใหม่ทั้งหมด (เหมือน V17) */
    function renderTabs() {
        // (โค้ดเหมือนเดิมจาก V17.1)
        console.log("renderTabs called. ActiveShopId:", activeShopId); if (!shopTabsContainer || !addTabButton) { console.error("renderTabs: Missing elements"); return; } const previouslyFocusedElement = document.activeElement; Array.from(shopTabsContainer.children).forEach(child => { if (child !== addTabButton && child !== newShopInputContainer) { shopTabsContainer.removeChild(child); } });
        shops.forEach(shop => { const tabButton = document.createElement('button'); tabButton.className = 'tab-button'; tabButton.dataset.shopId = shop.id; const tabNameSpan = document.createElement('span'); tabNameSpan.className = 'tab-name'; tabNameSpan.textContent = shop.name; const deleteTabBtn = document.createElement('button'); deleteTabBtn.className = 'delete-tab-btn'; deleteTabBtn.innerHTML = '&times;'; deleteTabBtn.title = `ลบร้าน ${shop.name}`; deleteTabBtn.dataset.shopId = shop.id; tabButton.appendChild(tabNameSpan); tabButton.appendChild(deleteTabBtn); if (shop.id === activeShopId) { tabButton.classList.add('active'); } tabButton.addEventListener('click', handleTabClick); shopTabsContainer.insertBefore(tabButton, addTabButton); });
        if (document.body.contains(previouslyFocusedElement)) { try { previouslyFocusedElement.focus({ preventScroll: true }); } catch (e) {} } else if (activeShopId) { const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`); activeTabButton?.focus({ preventScroll: true }); } updateOverallSummaryButtonVisibility();
    }

    /** V18: วาดเนื้อหาของแท็บที่ถูกเลือก (เหมือน V17) */
    function renderTabContent() {
        // (โค้ดเหมือนเดิมจาก V17.1 - สร้าง header, entry area, list area, actions)
        console.log("renderTabContent called. ActiveShopId:", activeShopId); if (!tabContentArea) { console.error("renderTabContent: Missing tabContentArea"); return; } tabContentArea.innerHTML = ''; const activeShop = shops.find(shop => shop.id === activeShopId);
        if (activeShop) { console.log("Rendering content for shop:", activeShop.name); const headerDiv = document.createElement('div'); headerDiv.className = 'shop-header'; const shopNameDisplay = document.createElement('span'); shopNameDisplay.className = 'shop-name-display'; shopNameDisplay.textContent = activeShop.name; headerDiv.appendChild(shopNameDisplay); tabContentArea.appendChild(headerDiv); const entryArea = createItemEntryArea(activeShop.id); tabContentArea.appendChild(entryArea); const itemListArea = document.createElement('div'); itemListArea.className = 'item-list-area'; itemListArea.id = `item-list-${activeShop.id}`; const ul = document.createElement('ul'); if (activeShop.items.length > 0) { activeShop.items.forEach((item, index) => { ul.appendChild(createShopItemRow(activeShop.id, item, index)); }); } else { ul.innerHTML = '<li class="item-list-placeholder">ยังไม่มีรายการในร้านนี้...</li>'; } itemListArea.appendChild(ul); tabContentArea.appendChild(itemListArea); const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'shop-actions'; const summarizeBtn = document.createElement('button'); summarizeBtn.textContent = '📋 สรุปรายการร้านนี้'; summarizeBtn.className = 'action-button summarize-btn'; summarizeBtn.type = "button"; summarizeBtn.addEventListener('click', () => showSummary(activeShopId)); buttonsDiv.appendChild(summarizeBtn); tabContentArea.appendChild(buttonsDiv); if(noShopPlaceholder) noShopPlaceholder.style.display = 'none'; }
        else { console.log("No active shop, showing placeholder."); if(noShopPlaceholder) noShopPlaceholder.style.display = 'block'; }
    }

    /** V18: สร้างแถวสำหรับแสดงรายการสินค้าใน List Area (เพิ่มปุ่ม Edit) */
    function createShopItemRow(shopId, itemData, index) {
        const li = document.createElement('li');
        li.className = 'shop-item-row';
        li.dataset.shopId = shopId;
        li.dataset.itemIndex = index;

        // ส่วนแสดงผล (Display Mode) - สร้าง span ต่างๆ
        const displayDiv = document.createElement('div');
        displayDiv.className = 'item-display-mode'; // Div ครอบส่วนแสดงผล

        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'item-quantity';
        quantitySpan.textContent = itemData.quantity;

        const unitSpan = document.createElement('span');
        unitSpan.className = 'item-unit';
        unitSpan.textContent = itemData.unit || '?';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = itemData.item;

        const actionButtonsDiv = document.createElement('div'); // Div ครอบปุ่ม Edit/Delete
        actionButtonsDiv.className = 'item-actions-display';

        // ปุ่มแก้ไข (ดินสอ)
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-item-inline-btn'; // Class ใหม่
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"/></svg>`;
        editBtn.title = `แก้ไข ${itemData.item}`;

        // ปุ่มลบ (ถังขยะ)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-item-inline-btn'; // Class เดิม
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        deleteBtn.title = `ลบ ${itemData.item}`;

        actionButtonsDiv.appendChild(editBtn);
        actionButtonsDiv.appendChild(deleteBtn);

        displayDiv.appendChild(quantitySpan);
        displayDiv.appendChild(unitSpan);
        displayDiv.appendChild(nameSpan);
        displayDiv.appendChild(actionButtonsDiv); // เพิ่ม div ปุ่ม action

        // ส่วนแก้ไข (Edit Mode) - สร้าง input ต่างๆ (ซ่อนไว้ก่อน)
        const editDiv = document.createElement('div');
        editDiv.className = 'item-edit-mode hidden'; // ซ่อนไว้ด้วย class 'hidden'

        const editQuantityInput = document.createElement('input');
        editQuantityInput.type = 'number';
        editQuantityInput.className = 'edit-quantity-inline';
        editQuantityInput.value = itemData.quantity;
        editQuantityInput.min = "0"; editQuantityInput.step = "any";

        const editUnitInput = document.createElement('input');
        editUnitInput.type = 'text';
        editUnitInput.className = 'edit-unit-inline';
        editUnitInput.value = itemData.unit || '';
        editUnitInput.setAttribute('list', GLOBAL_UNITS_DATALIST_ID);

        // ชื่อรายการ (แสดงเป็น text แก้ไม่ได้ในโหมดนี้ก่อน)
        const editNameSpan = document.createElement('span');
        editNameSpan.className = 'item-name-edit-display'; // Class ใหม่
        editNameSpan.textContent = itemData.item;

        const editActionButtonsDiv = document.createElement('div'); // Div ครอบปุ่ม Save/Cancel
        editActionButtonsDiv.className = 'item-actions-edit';

        // ปุ่มบันทึก (เครื่องหมายถูก)
        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-edit-inline-btn';
        saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>`;
        saveBtn.title = 'บันทึกการแก้ไข';

        // ปุ่มยกเลิก (กากบาท)
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-edit-inline-btn';
        cancelBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        cancelBtn.title = 'ยกเลิกการแก้ไข';

        editActionButtonsDiv.appendChild(saveBtn);
        editActionButtonsDiv.appendChild(cancelBtn);

        editDiv.appendChild(editQuantityInput);
        editDiv.appendChild(editUnitInput);
        editDiv.appendChild(editNameSpan); // แสดงชื่อรายการเฉยๆ
        editDiv.appendChild(editActionButtonsDiv);

        // เพิ่มทั้งสองโหมดเข้าไปใน li
        li.appendChild(displayDiv);
        li.appendChild(editDiv);

        return li;
    }


    // --- UI Creation Functions (ส่วนใหญ่เหมือนเดิม) ---
    function createOrUpdateDatalist(listId, optionsArray) { /* (เหมือนเดิม) */
        let datalist = document.getElementById(listId); if (!datalist) { datalist = document.createElement('datalist'); datalist.id = listId; document.body.appendChild(datalist); datalist = document.getElementById(listId); if (!datalist) { console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`); return; } } datalist.innerHTML = ''; if (!Array.isArray(optionsArray)) { console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`); return; } const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th')); sortedOptions.forEach(optionValue => { if (typeof optionValue === 'string' && optionValue.trim() !== '') { try { const option = document.createElement('option'); option.value = optionValue; datalist.appendChild(option); } catch (e) { console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e); } } });
    }
    function createUnitInputEntry(selectedUnit = '') { /* (เหมือนเดิม) */
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'หน่วย'; input.className = 'entry-unit'; input.value = selectedUnit; input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); return input;
    }
    function createItemInputEntry(selectedItem = '') { /* (เหมือนเดิม) */
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'ใส่รายการ กด + เพื่อเพิ่ม...'; input.className = 'entry-item'; input.value = selectedItem; input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); return input;
    }
    function createItemEntryArea(shopId) { /* (เหมือนเดิม - SVG included) */
        const entryDiv = document.createElement('div'); entryDiv.className = 'item-entry-area'; entryDiv.dataset.shopId = shopId;
        const quantityInput = document.createElement('input'); quantityInput.type = 'number'; quantityInput.placeholder = 'จำนวน'; quantityInput.min = "0"; quantityInput.step = "any"; quantityInput.className = 'entry-quantity';
        const unitInput = createUnitInputEntry(); const itemInput = createItemInputEntry();
        const addBtn = document.createElement('button'); addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`; addBtn.className = 'action-button entry-add-btn'; addBtn.title = "เพิ่มรายการนี้"; addBtn.type = "button";
        const statusDiv = document.createElement('div'); statusDiv.className = 'entry-status';
        entryDiv.appendChild(quantityInput); entryDiv.appendChild(unitInput); entryDiv.appendChild(itemInput); entryDiv.appendChild(addBtn); entryDiv.appendChild(statusDiv); return entryDiv;
    }

    // --- V18: Event Handlers ---

    /** V18: จัดการการคลิกแท็บร้านค้า (เหมือน V17) */
    function handleTabClick(event) { /* (เหมือนเดิมจาก V17.1) */
        if (event.target.closest('.delete-tab-btn')) { event.stopPropagation(); return; } const clickedTab = event.target.closest('.tab-button'); if (!clickedTab || clickedTab.classList.contains('active')) { return; } const newActiveShopId = clickedTab.dataset.shopId; console.log("Tab selected:", newActiveShopId); if (newActiveShopId) { activeShopId = newActiveShopId; renderTabs(); renderTabContent(); }
    }
    /** V18: จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() { /* (เหมือนเดิม) */
        console.log("Add tab button clicked"); if (newShopInputContainer && addTabButton && newShopNameInput) { newShopInputContainer.classList.remove('hidden'); addTabButton.classList.add('hidden'); newShopNameInput.value = ''; newShopNameInput.focus(); console.log("Showing new shop input"); } else { console.error("handleAddTabClick: Missing required elements"); }
    }
    /** V18: จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() { /* (เหมือนเดิม) */
        console.log("Cancel new shop"); if (newShopInputContainer && addTabButton) { newShopInputContainer.classList.add('hidden'); addTabButton.classList.remove('hidden'); newShopNameInput.value = ''; } else { console.error("handleCancelNewShop: Missing required elements"); }
    }
    /** V18: จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() { /* (เหมือนเดิม) */
        console.log("Save new shop clicked"); if (!newShopNameInput) { console.error("handleSaveNewShop: Missing newShopNameInput"); return; } const newName = newShopNameInput.value.trim(); if (!newName) { alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ"); newShopNameInput.focus(); return; } if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) { alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`); newShopNameInput.focus(); newShopNameInput.select(); return; } const newShopId = `shop-${Date.now()}`; const newShopData = { id: newShopId, name: newName, items: [] }; shops.push(newShopData); activeShopId = newShopId; console.log("New shop added:", newShopData); renderTabs(); renderTabContent(); handleCancelNewShop(); /* TODO: Save state */
    }
     /** V18: จัดการการกดปุ่มลบร้าน (X บนแท็บ) (เหมือน V17) */
    function handleDeleteShopClick(event) { /* (เหมือนเดิมจาก V17.1) */
        const deleteButton = event.target.closest('.delete-tab-btn'); if (!deleteButton) return; const shopIdToDelete = deleteButton.dataset.shopId; const shopToDelete = shops.find(s => s.id === shopIdToDelete); console.log("Delete tab button clicked for:", shopIdToDelete, shopToDelete?.name); if (!shopToDelete) return; if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) { const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete); if (indexToDelete > -1) { shops.splice(indexToDelete, 1); console.log("Shop removed from state."); if (activeShopId === shopIdToDelete) { if (shops.length === 0) { activeShopId = null; } else if (indexToDelete >= shops.length) { activeShopId = shops[shops.length - 1].id; } else { activeShopId = shops[indexToDelete].id; } console.log("New activeShopId:", activeShopId); } renderTabs(); renderTabContent(); /* TODO: Save state */ } }
    }
    /** V18: จัดการการกดปุ่ม "เพิ่มรายการ" (+) และแสดงผลในลิสต์ทันที (เหมือน V17) */
    function handleAddItemClick(event) { /* (เหมือนเดิมจาก V17.1) */
        const addButton = event.target.closest('.entry-add-btn'); if (!addButton) return; const entryArea = addButton.closest('.item-entry-area'); if (!entryArea) return; const shopId = entryArea.dataset.shopId; const quantityInput = entryArea.querySelector('.entry-quantity'); const unitInput = entryArea.querySelector('.entry-unit'); const itemInput = entryArea.querySelector('.entry-item'); if (!shopId || !quantityInput || !unitInput || !itemInput) { console.error("หา elements ใน entry area ไม่เจอ ร้าน:", shopId); return; } const quantity = quantityInput.value.trim(); const unit = unitInput.value.trim(); const itemName = itemInput.value.trim(); const itemNameLower = itemName.toLowerCase(); console.log(`Add item attempt: Qty=${quantity}, Unit=${unit}, Item=${itemName}, Shop=${shopId}`); if (!itemName) { showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true); itemInput.focus(); return; } if (!quantity) { showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true); quantityInput.focus(); return; } const shop = shops.find(s => s.id === shopId); if (!shop) { console.error("ไม่เจอร้านใน state ID:", shopId); showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true); return; } const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower); if (isDuplicate) { console.log("Duplicate item found:", itemName); showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true); itemInput.focus(); itemInput.select(); return; } const newItem = { quantity: quantity, unit: unit || '?', item: itemName }; shop.items.push(newItem); const newItemIndex = shop.items.length - 1; console.log("Item added to state:", shop.items); const listAreaUl = tabContentArea.querySelector(`#item-list-${shopId} ul`); if (listAreaUl) { const placeholder = listAreaUl.querySelector('.item-list-placeholder'); placeholder?.remove(); const newItemRow = createShopItemRow(shopId, newItem, newItemIndex); listAreaUl.appendChild(newItemRow); listAreaUl.parentElement.scrollTop = listAreaUl.parentElement.scrollHeight; } else { console.error("Could not find list area UL for shop:", shopId); renderTabContent(); } showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false); quantityInput.value = ''; unitInput.value = ''; itemInput.value = ''; itemInput.focus(); /* TODO: Save state */
    }
     /** V18: จัดการการกดปุ่มลบรายการ (ถังขยะ) ใน List Area (เหมือน V17) */
    function handleDeleteItemInline(event) { /* (เหมือนเดิมจาก V17.1) */
        const deleteButton = event.target.closest('.delete-item-inline-btn'); if (!deleteButton) return; const tableRow = deleteButton.closest('.shop-item-row'); if (!tableRow) return; const shopId = tableRow.dataset.shopId; const itemIndex = parseInt(tableRow.dataset.itemIndex, 10); if (shopId === undefined || isNaN(itemIndex)) { console.error("ไม่สามารถหา shopId หรือ itemIndex สำหรับลบ inline ได้"); return; } const shop = shops.find(s => s.id === shopId); if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.error("หาข้อมูลร้านหรือรายการที่จะลบ inline ไม่เจอ:", shopId, itemIndex); return; } const itemToDelete = shop.items[itemIndex]; if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) { shop.items.splice(itemIndex, 1); console.log("Item deleted inline from state."); /* TODO: Save state */ renderTabContent(); const entryArea = tabContentArea.querySelector(`.item-entry-area[data-shop-id="${shopId}"]`); if (entryArea) { showEntryStatus(entryArea, `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`, false); } }
    }
    /** V18: แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) { /* (เหมือนเดิม) */
        const statusDiv = entryAreaElement?.querySelector('.entry-status'); if (!statusDiv) return; statusDiv.textContent = message; statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`; statusDiv.style.display = 'block'; setTimeout(() => { statusDiv.style.display = 'none'; statusDiv.textContent = ''; statusDiv.className = 'entry-status'; }, 2500);
    }

    /** V18: จัดการการกดปุ่มแก้ไข (ดินสอ) ใน List Area */
    function handleEditItemInline(event) {
        const editButton = event.target.closest('.edit-item-inline-btn');
        if (!editButton) return;

        const itemRow = editButton.closest('.shop-item-row');
        if (!itemRow) return;

        // สลับโหมด: ซ่อน display mode, แสดง edit mode
        const displayMode = itemRow.querySelector('.item-display-mode');
        const editMode = itemRow.querySelector('.item-edit-mode');
        if (displayMode && editMode) {
            displayMode.classList.add('hidden');
            editMode.classList.remove('hidden');
            // Focus ที่ช่องจำนวนเมื่อเข้าโหมดแก้ไข
            const quantityInput = editMode.querySelector('.edit-quantity-inline');
            quantityInput?.focus();
            quantityInput?.select();
        } else {
            console.error("Could not find display/edit mode divs in item row");
        }
    }

    /** V18: จัดการการกดปุ่มบันทึก (เครื่องหมายถูก) ในโหมดแก้ไข Inline */
    function handleSaveEditInline(event) {
        const saveButton = event.target.closest('.save-edit-inline-btn');
        if (!saveButton) return;

        const itemRow = saveButton.closest('.shop-item-row');
        const editMode = saveButton.closest('.item-edit-mode');
        const displayMode = itemRow?.querySelector('.item-display-mode');
        if (!itemRow || !editMode || !displayMode) return;

        const shopId = itemRow.dataset.shopId;
        const itemIndex = parseInt(itemRow.dataset.itemIndex, 10);

        const editQuantityInput = editMode.querySelector('.edit-quantity-inline');
        const editUnitInput = editMode.querySelector('.edit-unit-inline');

        if (shopId === undefined || isNaN(itemIndex) || !editQuantityInput || !editUnitInput) {
            console.error("Cannot find elements or data for saving inline edit");
            return;
        }

        const newQuantity = editQuantityInput.value.trim();
        const newUnit = editUnitInput.value.trim() || '?';

        // Validation (เบื้องต้น)
        if (!newQuantity) {
            alert("เพื่อน! จำนวนห้ามว่างนะ");
            editQuantityInput.focus();
            return;
        }

        // หา item ใน state
        const shop = shops.find(s => s.id === shopId);
        if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) {
            console.error("Cannot find item in state to save edit:", shopId, itemIndex);
            alert("เกิดข้อผิดพลาด: ไม่พบรายการที่จะแก้ไข");
            // อาจจะยกเลิกโหมดแก้ไขไปเลย
            handleCancelEditInline(event); // เรียก cancel แทน
            return;
        }

        // อัปเดต state
        shop.items[itemIndex].quantity = newQuantity;
        shop.items[itemIndex].unit = newUnit;
        console.log(`Item ${itemIndex} updated in shop ${shopId}:`, shop.items[itemIndex]);
        // TODO: Save state

        // อัปเดตการแสดงผลใน display mode
        const quantitySpan = displayMode.querySelector('.item-quantity');
        const unitSpan = displayMode.querySelector('.item-unit');
        if (quantitySpan) quantitySpan.textContent = newQuantity;
        if (unitSpan) unitSpan.textContent = newUnit;

        // สลับโหมดกลับ
        editMode.classList.add('hidden');
        displayMode.classList.remove('hidden');
    }

    /** V18: จัดการการกดปุ่มยกเลิก (X) ในโหมดแก้ไข Inline */
    function handleCancelEditInline(event) {
        const cancelButton = event.target.closest('.cancel-edit-inline-btn');
        if (!cancelButton) return;

        const itemRow = cancelButton.closest('.shop-item-row');
        const editMode = cancelButton.closest('.item-edit-mode');
        const displayMode = itemRow?.querySelector('.item-display-mode');

        if (itemRow && editMode && displayMode) {
            // ไม่ต้องทำอะไรกับ state แค่สลับโหมดกลับ
            editMode.classList.add('hidden');
            displayMode.classList.remove('hidden');
            // ไม่ต้อง reset ค่า input เพราะเมื่อกด Edit ใหม่ มันจะดึงค่าจาก state มาใส่อยู่แล้ว
        }
    }


    // --- Core Logic Functions ---
    function updateOverallSummaryButtonVisibility() { /* (เหมือนเดิม) */
        const shopSectionsExist = shops.length > 0; if (overallSummaryContainer) { overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none'; }
    }
    /** V18: ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป (เหมือน V17) */
    function getOrderData(shopId = null) { /* (เหมือนเดิมจาก V17) */
        if (shopId) { const shop = shops.find(s => s.id === shopId); if (shop) { return [{ shopId: shop.id, shopName: shop.name, items: [...shop.items] }]; } else { return []; } } else { return shops.filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)').map(shop => ({ shopId: shop.id, shopName: shop.name, items: [...shop.items] })); }
    }
    function formatThaiTimestamp() { /* (เหมือนเดิม) */
        const now = new Date(); const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' }; const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }; try { const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' }); const buddhistYear = yearFormatter.format(now); const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); const formattedTime = now.toLocaleTimeString('th-TH', timeOptions); return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`; } catch (e) { console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }
    function escapeHtml(unsafe) { /* (เหมือนเดิม) */
        if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    /** V18: แสดง Modal สรุป (กลับไปเป็นแบบ Read-Only) */
    function showSummary(shopId = null) {
        console.log("showSummary called for shopId:", shopId);
        if (!summaryModal || !summaryContent || !summaryTimestampElem || !modalActionsDiv) {
            console.error("showSummary: Missing required modal elements"); return;
        }

        summaryModalShopId = shopId; // เก็บ ID ไว้เผื่อใช้ตอน Copy

        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp;

        const data = getOrderData(summaryModalShopId);
        summaryContent.innerHTML = '';
        if (copyStatus) copyStatus.style.display = 'none';

        // V18: ลบปุ่ม Save Changes ถ้ามีค้างอยู่ (ไม่ควรมีแล้ว แต่กันเหนียว)
        document.getElementById(SAVE_CHANGES_BTN_ID)?.remove();

        const dataToShow = data;
        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            dataToShow.forEach(shopData => {
                const currentShopId = shopData.shopId;
                if (!currentShopId) { console.error("Shop data missing ID in showSummary:", shopData); return; }

                const shopNameEscaped = escapeHtml(shopData.shopName);
                modalHtml += `<h3 style="/*...*/">🛒 ${shopNameEscaped}</h3>`;

                if (summaryModalShopId === null) { /* ... timestamp ... */
                    const timePart = overallTimestamp.split(' เวลา ')[1] || ''; const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ',''); modalHtml += `<p class="shop-timestamp-print" style="/*...*/">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                }

                // V18: หัวตารางแบบ Read-Only (ไม่มีคอลัมน์ "จัดการ")
                modalHtml += `
                    <table class="summary-table" data-shop-id="${currentShopId}" style="/*...*/">
                        <thead>
                            <tr>
                                <th style="/*...*/ width: 15%;">จำนวน</th>
                                <th style="/*...*/ width: 20%;">หน่วย</th>
                                <th style="/*...*/ width: 65%;">รายการ</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                // V18: สร้างแถวแบบ Read-Only
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach((item, index) => {
                        modalHtml += `
                            <tr>
                                <td style="/*...*/ text-align: center;">${escapeHtml(item.quantity)}</td>
                                <td style="/*...*/">${escapeHtml(item.unit)}</td>
                                <td style="/*...*/ word-wrap: break-word;">${escapeHtml(item.item)}</td>
                            </tr>
                        `; // ไม่มีปุ่มลบ/แก้ไขในนี้
                    });
                } else {
                     modalHtml += `<tr><td colspan="3" style="/*...*/">(ไม่มีรายการ)</td></tr>`; // เหลือ 3 คอลัมน์
                }
                modalHtml += `</tbody></table>`;
            });
            summaryContent.innerHTML = modalHtml;
        }
        summaryModal.style.display = 'block';
    }

    /** V18: ปิด Modal */
    function closeModal() {
        // (โค้ดเหมือนเดิม ไม่ต้องเช็ค unsaved changes แล้ว)
        if (summaryModal) summaryModal.style.display = 'none';
        summaryModalShopId = null;
        // ไม่ต้องลบปุ่ม Save เพราะไม่มีแล้ว
    }

    /** V18: คัดลอกสรุป */
    function copySummaryToClipboard() {
        // (โค้ดเหมือนเดิมจาก V17 - ไม่ต้องเช็ค unsaved changes)
        if (!summaryContent) return; let textToCopy = ""; const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n"; const dataToCopy = getOrderData(summaryModalShopId); if(dataToCopy.length === 0) { textToCopy += "(ไม่มีรายการสั่งซื้อ)"; } else { dataToCopy.forEach((shopData, index) => { const shopNameOnly = shopData.shopName.replace(/🛒\s*/, ''); textToCopy += `--- ${shopNameOnly} ---\n`; if (shopData.items.length > 0) { shopData.items.forEach(item => { textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`; }); } else { textToCopy += "(ไม่มีรายการ)\n"; } if (index < dataToCopy.length - 1) { textToCopy += "\n"; } }); } if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textToCopy.trim()).then(() => { if (copyStatus) { copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); } }).catch(err => { console.error('Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); }); } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }

    // --- V18: ลบฟังก์ชันที่เกี่ยวกับ Modal Editing ออก ---
    // function handleDeleteItemInSummary(event) { /* ... ลบออก ... */ }
    // function handleSaveChangesInSummary() { /* ... ลบออก ... */ }
    // function handleSummaryInputChange(event) { /* ... ลบออก ... */ }


    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V18) ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...'; loadingErrorDiv.style.display = 'block'; /* ... styling ... */
        let fetchSuccess = false;
        try {
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' }); if (!response.ok) { console.error(`Failed to fetch ${ITEMS_JSON_PATH}: ${response.status} ${response.statusText}`); let errorBody = ''; try { errorBody = await response.text(); } catch (e) {} throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status}) ${errorBody}`); } const jsonData = await response.json(); if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`); masterItemList = jsonData; fetchSuccess = true; loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`; /* ... styling ... */ setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000); createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error); loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) จะใช้ร้านค้าเริ่มต้นแทนนะ`; /* ... styling ... */ loadingErrorDiv.style.display = 'block'; shops = JSON.parse(JSON.stringify(initialShopsData)); console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นเนื่องจาก fetch ล้มเหลว");
        } finally {
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);
            // V18: เช็คและใช้ initial shops ถ้า shops ว่าง (เหมือน V17.2)
            if (shops.length === 0) {
                console.warn("Shops array is empty after init attempt, using initial data.");
                shops = JSON.parse(JSON.stringify(initialShopsData));
            }
            if (shops.length > 0 && !activeShopId) { activeShopId = shops[0].id; }
            else if (shops.length === 0) { activeShopId = null; }
            renderTabs(); renderTabContent();
            setupEventListeners(); // เรียก setup listeners
            console.log("--- initializeApp เสร็จสิ้น (V18) ---");
        }
    }

    /** V18: ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก */
    function setupEventListeners() {
        console.log("Setting up event listeners...");

        // --- Listeners จาก V17 ---
        addTabButton?.addEventListener('click', handleAddTabClick);
        cancelNewShopButton?.addEventListener('click', handleCancelNewShop);
        saveNewShopButton?.addEventListener('click', handleSaveNewShop);
        newShopNameInput?.addEventListener('keypress', (event) => { if (event.key === 'Enter') { handleSaveNewShop(); } });
        overallSummaryButton?.addEventListener('click', () => showSummary());
        modalCloseButton?.addEventListener('click', closeModal);
        copySummaryButton?.addEventListener('click', copySummaryToClipboard);
        closeModalActionButton?.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => { if (event.target == summaryModal) closeModal(); });
        shopTabsContainer?.addEventListener('click', handleTabClick); // เลือกแท็บ
        shopTabsContainer?.addEventListener('click', handleDeleteShopClick); // ลบแท็บ (X บนแท็บ)
        tabContentArea?.addEventListener('click', handleAddItemClick); // เพิ่ม item (+)
        tabContentArea?.addEventListener('keypress', (event) => { // Enter ในช่อง item = เพิ่ม
             if (event.key === 'Enter' && event.target.classList.contains('entry-item')) {
                 event.preventDefault(); const entryArea = event.target.closest('.item-entry-area');
                 const addButton = entryArea?.querySelector('.entry-add-btn'); addButton?.click();
             }
         });
        tabContentArea?.addEventListener('click', handleDeleteItemInline); // ลบ item inline (ถังขยะ)

        // --- V18: Listeners ใหม่สำหรับ Inline Editing ---
        tabContentArea?.addEventListener('click', handleEditItemInline); // กดปุ่ม Edit (ดินสอ)
        tabContentArea?.addEventListener('click', handleSaveEditInline); // กดปุ่ม Save (ถูก)
        tabContentArea?.addEventListener('click', handleCancelEditInline); // กดปุ่ม Cancel (X)

        // --- V18: ลบ Listeners ของ Modal Editing ออก ---
        // summaryContent?.addEventListener('click', handleDeleteItemInSummary); // ลบออก
        // summaryContent?.addEventListener('input', handleSummaryInputChange); // ลบออก
        // modalActionsDiv?.addEventListener('click', (event) => { // ลบส่วน Save ออก
        //     if (event.target.id === SAVE_CHANGES_BTN_ID || event.target.closest(`#${SAVE_CHANGES_BTN_ID}`)) {
        //         handleSaveChangesInSummary();
        //     }
        // });

         console.log("Event listeners setup complete.");
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
