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

    // --- Constants ---
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list';
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list';
    const ITEMS_JSON_PATH = 'items.json';
    const SAVE_CHANGES_BTN_ID = 'save-summary-changes-btn';

    // --- State Variables ---
    let masterItemList = [];
    let shops = []; // State หลัก เก็บข้อมูลร้านค้าและรายการ
    let activeShopId = null; // ID ของแท็บที่กำลังเปิดอยู่
    let summaryModalShopId = null; // ID ของร้านที่กำลังดูใน Modal สรุป
    let hasUnsavedChanges = false; // Flag เช็คการแก้ไขใน Modal

    // V17: กำหนดร้านค้าเริ่มต้น
    const initialShopsData = [
         { id: `shop-init-${Date.now()+1}`, name: 'น้าไฝ', items: [] }, // ใช้ timestamp เพื่อให้ ID ไม่ซ้ำง่ายๆ
         { id: `shop-init-${Date.now()+2}`, name: 'น้าไพ', items: [] },
         { id: `shop-init-${Date.now()+3}`, name: 'น้ารุ่ง', items: [] },
    ];

    // --- V17: Rendering Functions ---

    /** V17: วาดแถบแท็บร้านค้าใหม่ทั้งหมด (เพิ่มปุ่มลบ X บนแท็บ) */
    function renderTabs() {
        console.log("renderTabs called. ActiveShopId:", activeShopId);
        if (!shopTabsContainer || !addTabButton) { console.error("renderTabs: Missing elements"); return; }
        const previouslyFocusedElement = document.activeElement;
        // Clear old tabs
        Array.from(shopTabsContainer.children).forEach(child => {
            if (child !== addTabButton && child !== newShopInputContainer) {
                shopTabsContainer.removeChild(child);
            }
        });

        // Create new tabs from state
        shops.forEach(shop => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button';
            tabButton.dataset.shopId = shop.id; // ใส่ shopId ที่ปุ่มหลัก (สำหรับการเลือกแท็บ)

            const tabNameSpan = document.createElement('span');
            tabNameSpan.className = 'tab-name';
            tabNameSpan.textContent = shop.name;

            // V17: สร้างปุ่มลบ '×' ใส่ในแท็บ
            const deleteTabBtn = document.createElement('button');
            deleteTabBtn.className = 'delete-tab-btn'; // Class สำหรับปุ่มลบแท็บ
            deleteTabBtn.innerHTML = '&times;'; // ใช้ × (multiplication sign)
            deleteTabBtn.title = `ลบร้าน ${shop.name}`;
            deleteTabBtn.dataset.shopId = shop.id; // ใส่ shopId ที่ปุ่มลบด้วย (สำหรับการลบ)
            // Listener สำหรับปุ่มลบนี้จะใช้ delegation ที่ setupEventListeners

            tabButton.appendChild(tabNameSpan);
            tabButton.appendChild(deleteTabBtn); // เพิ่มปุ่มลบเข้าไปในแท็บ

            if (shop.id === activeShopId) {
                tabButton.classList.add('active');
            }
            // Listener สำหรับ *การเลือกแท็บ*
            tabButton.addEventListener('click', handleTabClick);

            shopTabsContainer.insertBefore(tabButton, addTabButton);
        });

        // Restore focus
        if (document.body.contains(previouslyFocusedElement)) {
             try { previouslyFocusedElement.focus({ preventScroll: true }); } catch (e) {}
        } else if (activeShopId) {
             const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`);
             activeTabButton?.focus({ preventScroll: true });
        }
        updateOverallSummaryButtonVisibility();
    }

    /** V17: วาดเนื้อหาของแท็บที่ถูกเลือก (เพิ่ม List Area ที่มองเห็น) */
    function renderTabContent() {
        console.log("renderTabContent called. ActiveShopId:", activeShopId);
        if (!tabContentArea) { console.error("renderTabContent: Missing tabContentArea"); return; }
        tabContentArea.innerHTML = '';
        const activeShop = shops.find(shop => shop.id === activeShopId);

        if (activeShop) {
            console.log("Rendering content for shop:", activeShop.name);
            // --- Header (V17: ไม่มีปุ่มลบร้านตรงนี้แล้ว) ---
            const headerDiv = document.createElement('div');
            headerDiv.className = 'shop-header';
            const shopNameDisplay = document.createElement('span');
            shopNameDisplay.className = 'shop-name-display';
            shopNameDisplay.textContent = activeShop.name;
            headerDiv.appendChild(shopNameDisplay);
            tabContentArea.appendChild(headerDiv);

            // --- Item Entry Area (เหมือนเดิม) ---
            const entryArea = createItemEntryArea(activeShop.id);
            tabContentArea.appendChild(entryArea);

            // --- V17: พื้นที่แสดงรายการสินค้าที่เพิ่มแล้ว (Scrollable List) ---
            const itemListArea = document.createElement('div');
            itemListArea.className = 'item-list-area'; // Class ใหม่สำหรับจัดสไตล์ (scrollable)
            itemListArea.id = `item-list-${activeShop.id}`; // ID เฉพาะสำหรับร้านนี้

            const ul = document.createElement('ul');
            if (activeShop.items.length > 0) {
                activeShop.items.forEach((item, index) => {
                    // สร้างแถวรายการพร้อมปุ่มลบ inline
                    ul.appendChild(createShopItemRow(activeShop.id, item, index));
                });
            } else {
                ul.innerHTML = '<li class="item-list-placeholder">ยังไม่มีรายการในร้านนี้...</li>';
            }
            itemListArea.appendChild(ul);
            tabContentArea.appendChild(itemListArea); // เพิ่ม List Area ต่อท้าย

            // --- Actions (ปุ่มสรุป/แก้ไข) ---
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'shop-actions';
            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = '📋 สรุป/แก้ไขร้านนี้'; // เปลี่ยนข้อความ
            summarizeBtn.className = 'action-button summarize-btn';
            summarizeBtn.type = "button";
            summarizeBtn.addEventListener('click', () => showSummary(activeShopId));
            buttonsDiv.appendChild(summarizeBtn);
            tabContentArea.appendChild(buttonsDiv);

            if(noShopPlaceholder) noShopPlaceholder.style.display = 'none';
        } else {
            console.log("No active shop, showing placeholder.");
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'block';
        }
    }

    /** V17: สร้างแถวสำหรับแสดงรายการสินค้าใน List Area (พร้อมปุ่มลบ inline) */
    function createShopItemRow(shopId, itemData, index) {
        const li = document.createElement('li');
        li.className = 'shop-item-row'; // Class ใหม่สำหรับแถวในลิสต์
        li.dataset.shopId = shopId;
        li.dataset.itemIndex = index; // เก็บ index ไว้อ้างอิงตอนลบ

        // สร้าง span แสดงผลข้อมูล
        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'item-quantity';
        quantitySpan.textContent = itemData.quantity;

        const unitSpan = document.createElement('span');
        unitSpan.className = 'item-unit';
        unitSpan.textContent = itemData.unit || '?';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = itemData.item;

        // สร้างปุ่มลบ (ถังขยะ)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-item-inline-btn'; // Class ใหม่สำหรับปุ่มลบนี้
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        deleteBtn.title = `ลบ ${itemData.item}`;
        // Listener จะใช้ delegation ที่ setupEventListeners

        // ประกอบร่างแถว
        li.appendChild(quantitySpan);
        li.appendChild(unitSpan);
        li.appendChild(nameSpan);
        li.appendChild(deleteBtn); // เพิ่มปุ่มลบ

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

    // --- V17.1: Event Handlers ---

    /** V17.1: จัดการการคลิกแท็บร้านค้า (Delegated - เฉพาะตัวแท็บ ไม่ใช่ปุ่มลบ) */
    function handleTabClick(event) {
        // (โค้ดเหมือนเดิมจาก V16.1)
        if (event.target.closest('.delete-tab-btn')) { event.stopPropagation(); return; }
        const clickedTab = event.target.closest('.tab-button'); if (!clickedTab || clickedTab.classList.contains('active')) { return; }
        const newActiveShopId = clickedTab.dataset.shopId; console.log("Tab selected:", newActiveShopId);
        if (newActiveShopId) { activeShopId = newActiveShopId; renderTabs(); renderTabContent(); }
    }

    /** V17.1: จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() { /* (เหมือนเดิม) */
        console.log("Add tab button clicked"); if (newShopInputContainer && addTabButton && newShopNameInput) { newShopInputContainer.classList.remove('hidden'); addTabButton.classList.add('hidden'); newShopNameInput.value = ''; newShopNameInput.focus(); console.log("Showing new shop input"); } else { console.error("handleAddTabClick: Missing required elements"); }
    }
    /** V17.1: จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() { /* (เหมือนเดิม) */
        console.log("Cancel new shop"); if (newShopInputContainer && addTabButton) { newShopInputContainer.classList.add('hidden'); addTabButton.classList.remove('hidden'); newShopNameInput.value = ''; } else { console.error("handleCancelNewShop: Missing required elements"); }
    }
    /** V17.1: จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() { /* (เหมือนเดิม) */
        console.log("Save new shop clicked"); if (!newShopNameInput) { console.error("handleSaveNewShop: Missing newShopNameInput"); return; } const newName = newShopNameInput.value.trim(); if (!newName) { alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ"); newShopNameInput.focus(); return; } if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) { alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`); newShopNameInput.focus(); newShopNameInput.select(); return; } const newShopId = `shop-${Date.now()}`; const newShopData = { id: newShopId, name: newName, items: [] }; shops.push(newShopData); activeShopId = newShopId; console.log("New shop added:", newShopData); renderTabs(); renderTabContent(); handleCancelNewShop(); /* TODO: Save state */
    }

     /** V17.1: จัดการการกดปุ่มลบร้าน (X บนแท็บ) (Delegated) */
    function handleDeleteShopClick(event) {
        const deleteButton = event.target.closest('.delete-tab-btn'); // V17.1: ใช้ selector นี้
        if (!deleteButton) return;

        const shopIdToDelete = deleteButton.dataset.shopId;
        const shopToDelete = shops.find(s => s.id === shopIdToDelete);
        console.log("Delete tab button clicked for:", shopIdToDelete, shopToDelete?.name);

        if (!shopToDelete) return;

        if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) {
            const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete);
            if (indexToDelete > -1) {
                shops.splice(indexToDelete, 1);
                console.log("Shop removed from state.");

                // หาแท็บที่จะ active ต่อไป
                if (activeShopId === shopIdToDelete) {
                    if (shops.length === 0) { activeShopId = null; }
                    else if (indexToDelete >= shops.length) { activeShopId = shops[shops.length - 1].id; }
                    else { activeShopId = shops[indexToDelete].id; }
                    console.log("New activeShopId:", activeShopId);
                }

                renderTabs();
                renderTabContent(); // Render content ของแท็บใหม่ (หรือ placeholder)
                // TODO: Save state
            }
        }
    }

    /** V17.1: จัดการการกดปุ่ม "เพิ่มรายการ" (+) และแสดงผลในลิสต์ทันที */
    function handleAddItemClick(event) {
        const addButton = event.target.closest('.entry-add-btn');
        if (!addButton) return;

        const entryArea = addButton.closest('.item-entry-area');
        if (!entryArea) return;

        const shopId = entryArea.dataset.shopId;
        const quantityInput = entryArea.querySelector('.entry-quantity');
        const unitInput = entryArea.querySelector('.entry-unit');
        const itemInput = entryArea.querySelector('.entry-item');

        if (!shopId || !quantityInput || !unitInput || !itemInput) { console.error("หา elements ใน entry area ไม่เจอ ร้าน:", shopId); return; }

        const quantity = quantityInput.value.trim(); const unit = unitInput.value.trim();
        const itemName = itemInput.value.trim(); const itemNameLower = itemName.toLowerCase();
        console.log(`Add item attempt: Qty=${quantity}, Unit=${unit}, Item=${itemName}, Shop=${shopId}`);

        if (!itemName) { showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true); itemInput.focus(); return; }
        if (!quantity) { showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true); quantityInput.focus(); return; }

        const shop = shops.find(s => s.id === shopId);
        if (!shop) { console.error("ไม่เจอร้านใน state ID:", shopId); showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true); return; }

        const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicate) {
            console.log("Duplicate item found:", itemName);
            showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true);
            itemInput.focus(); itemInput.select(); return;
        }

        // เพิ่มของลง State
        const newItem = { quantity: quantity, unit: unit || '?', item: itemName };
        shop.items.push(newItem);
        const newItemIndex = shop.items.length - 1; // Index ของ item ที่เพิ่งเพิ่ม
        console.log("Item added to state:", shop.items);

        // V17.1: แสดงผลรายการใหม่ใน List Area ทันที
        const listAreaUl = tabContentArea.querySelector(`#item-list-${shopId} ul`);
        if (listAreaUl) {
            // ลบ placeholder ถ้ามี
            const placeholder = listAreaUl.querySelector('.item-list-placeholder');
            placeholder?.remove();
            // สร้างแถวใหม่แล้ว append
            const newItemRow = createShopItemRow(shopId, newItem, newItemIndex);
            listAreaUl.appendChild(newItemRow);
            // เลื่อน scroll ไปที่รายการล่าสุด (ถ้า list area มี scroll)
            listAreaUl.parentElement.scrollTop = listAreaUl.parentElement.scrollHeight;
        } else {
            console.error("Could not find list area UL for shop:", shopId);
            // ถ้าหาไม่เจอ อาจจะต้อง renderTabContent() ใหม่ทั้งหมด แต่จะเสีย focus
            renderTabContent(); // Fallback: redraw everything
        }


        // แสดงสถานะ + เคลียร์ช่องกรอก
        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false);
        quantityInput.value = ''; unitInput.value = ''; itemInput.value = '';
        itemInput.focus();
        // TODO: Save state
    }

     /** V17.1: จัดการการกดปุ่มลบรายการ (ถังขยะ) ใน List Area (Delegated) */
    function handleDeleteItemInline(event) {
        const deleteButton = event.target.closest('.delete-item-inline-btn');
        if (!deleteButton) return;

        const tableRow = deleteButton.closest('.shop-item-row'); // V17.1: ใช้ class นี้
        if (!tableRow) return;

        const shopId = tableRow.dataset.shopId;
        const itemIndex = parseInt(tableRow.dataset.itemIndex, 10);

        if (shopId === undefined || isNaN(itemIndex)) {
            console.error("ไม่สามารถหา shopId หรือ itemIndex สำหรับลบ inline ได้");
            return;
        }

        const shop = shops.find(s => s.id === shopId);
        if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) {
            console.error("หาข้อมูลร้านหรือรายการที่จะลบ inline ไม่เจอ:", shopId, itemIndex);
            return;
        }
        const itemToDelete = shop.items[itemIndex];

        if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) {
            // ลบออกจาก state 'shops'
            shop.items.splice(itemIndex, 1);
            console.log("Item deleted inline from state.");
            // TODO: Save state

            // V17.1: วาดเนื้อหาของแท็บนี้ใหม่ทั้งหมด เพื่ออัปเดต List Area และ index ของรายการที่เหลือ
            renderTabContent();

             // แสดงข้อความว่าลบแล้ว (อาจจะแสดงใน entry status หรือที่อื่น)
             const entryArea = tabContentArea.querySelector(`.item-entry-area[data-shop-id="${shopId}"]`);
             if (entryArea) {
                 showEntryStatus(entryArea, `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`, false); // ใช้สีปกติ หรืออาจจะสีเหลือง
             }
        }
    }


    /** V17.1: แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) { /* (เหมือนเดิม) */
        const statusDiv = entryAreaElement?.querySelector('.entry-status'); if (!statusDiv) return; statusDiv.textContent = message; statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`; statusDiv.style.display = 'block'; setTimeout(() => { statusDiv.style.display = 'none'; statusDiv.textContent = ''; statusDiv.className = 'entry-status'; }, 2500);
    }

    // --- Core Logic Functions ---
    function updateOverallSummaryButtonVisibility() { /* (เหมือนเดิม) */
        const shopSectionsExist = shops.length > 0; if (overallSummaryContainer) { overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none'; }
    }
    /** V17.1: ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป (เพิ่ม shopId) */
    function getOrderData(shopId = null) { /* (เหมือนเดิมจาก V16) */
        if (shopId) { const shop = shops.find(s => s.id === shopId); if (shop) { return [{ shopId: shop.id, shopName: shop.name, items: [...shop.items] }]; } else { return []; } } else { return shops.filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)').map(shop => ({ shopId: shop.id, shopName: shop.name, items: [...shop.items] })); }
    }
    function formatThaiTimestamp() { /* (เหมือนเดิม) */
        const now = new Date(); const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' }; const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }; try { const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' }); const buddhistYear = yearFormatter.format(now); const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); const formattedTime = now.toLocaleTimeString('th-TH', timeOptions); return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`; } catch (e) { console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }
    function escapeHtml(unsafe) { /* (เหมือนเดิม) */
        if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    /** V17.1: แสดง Modal สรุป (เหมือน V16 - สร้างตารางที่แก้ไขได้ + ปุ่มลบ/บันทึก) */
    function showSummary(shopId = null) {
        // (โค้ดเหมือนเดิมจาก V16.1)
        console.log("showSummary called for shopId:", shopId); if (!summaryModal || !summaryContent || !summaryTimestampElem || !modalActionsDiv) { console.error("showSummary: Missing required modal elements"); return; } summaryModalShopId = shopId; hasUnsavedChanges = false; const overallTimestamp = formatThaiTimestamp(); summaryTimestampElem.textContent = overallTimestamp; const data = getOrderData(summaryModalShopId); summaryContent.innerHTML = ''; if (copyStatus) copyStatus.style.display = 'none'; document.getElementById(SAVE_CHANGES_BTN_ID)?.remove(); const dataToShow = data;
        if (dataToShow.length === 0) { summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>'; }
        else { let modalHtml = ''; dataToShow.forEach(shopData => { const currentShopId = shopData.shopId; if (!currentShopId) { console.error("Shop data missing ID in showSummary:", shopData); return; } const shopNameEscaped = escapeHtml(shopData.shopName); modalHtml += `<h3 style="/*...*/">🛒 ${shopNameEscaped}</h3>`; if (summaryModalShopId === null) { const timePart = overallTimestamp.split(' เวลา ')[1] || ''; const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ',''); modalHtml += `<p class="shop-timestamp-print" style="/*...*/">(ข้อมูล ณ ${datePart} ${timePart})</p>`; } modalHtml += `<table class="summary-table" data-shop-id="${currentShopId}" style="/*...*/"><thead><tr><th style="/*...*/ width: 15%;">จำนวน</th><th style="/*...*/ width: 20%;">หน่วย</th><th style="/*...*/ width: 50%;">รายการ</th><th style="/*...*/ width: 15%;">จัดการ</th></tr></thead><tbody>`; if (shopData.items && shopData.items.length > 0) { shopData.items.forEach((item, index) => { modalHtml += `<tr data-shop-id="${currentShopId}" data-item-index="${index}"><td style="/*...*/ text-align: center;"><input type="number" value="${escapeHtml(item.quantity)}" class="summary-input summary-quantity" min="0" step="any" aria-label="จำนวนของ ${escapeHtml(item.item)}"></td><td style="/*...*/"><input type="text" value="${escapeHtml(item.unit)}" class="summary-input summary-unit" list="${GLOBAL_UNITS_DATALIST_ID}" aria-label="หน่วยของ ${escapeHtml(item.item)}"></td><td style="/*...*/ word-wrap: break-word;">${escapeHtml(item.item)}</td><td style="/*...*/ text-align: center;"><button class="delete-item-summary-btn" title="ลบรายการ ${escapeHtml(item.item)}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button></td></tr>`; }); } else { modalHtml += `<tr><td colspan="4" style="/*...*/">(ไม่มีรายการ)</td></tr>`; } modalHtml += `</tbody></table>`; }); summaryContent.innerHTML = modalHtml; if (summaryContent.querySelector('table.summary-table tbody tr[data-item-index]')) { const saveChangesBtn = document.createElement('button'); saveChangesBtn.id = SAVE_CHANGES_BTN_ID; saveChangesBtn.className = 'action-button save-changes-btn'; saveChangesBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> บันทึกการแก้ไข`; saveChangesBtn.disabled = true; modalActionsDiv.insertBefore(saveChangesBtn, copySummaryButton); } }
        summaryModal.style.display = 'block';
    }

    /** V17.1: ปิด Modal (เหมือน V16) */
    function closeModal() { /* (เหมือนเดิมจาก V16) */
        if (hasUnsavedChanges) { if (!confirm("เพื่อน! มีการแก้ไขที่ยังไม่ได้กดบันทึกนะ ต้องการปิดโดยไม่บันทึกจริงดิ?")) { return; } } if (summaryModal) summaryModal.style.display = 'none'; summaryModalShopId = null; hasUnsavedChanges = false; document.getElementById(SAVE_CHANGES_BTN_ID)?.remove();
    }
    /** V17.1: คัดลอกสรุป (เหมือน V16) */
    function copySummaryToClipboard() { /* (เหมือนเดิมจาก V16) */
        if (hasUnsavedChanges) { alert("เพื่อน! กรุณากด 'บันทึกการแก้ไข' ก่อนคัดลอกนะ เพื่อให้ได้ข้อมูลล่าสุด"); return; } if (!summaryContent) return; let textToCopy = ""; const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n"; const dataToCopy = getOrderData(summaryModalShopId); if(dataToCopy.length === 0) { textToCopy += "(ไม่มีรายการสั่งซื้อ)"; } else { dataToCopy.forEach((shopData, index) => { const shopNameOnly = shopData.shopName.replace(/🛒\s*/, ''); textToCopy += `--- ${shopNameOnly} ---\n`; if (shopData.items.length > 0) { shopData.items.forEach(item => { textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`; }); } else { textToCopy += "(ไม่มีรายการ)\n"; } if (index < dataToCopy.length - 1) { textToCopy += "\n"; } }); } if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textToCopy.trim()).then(() => { if (copyStatus) { copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); } }).catch(err => { console.error('Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); }); } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }
    /** V17.1: จัดการการลบรายการในหน้าสรุป (เหมือน V16) */
    function handleDeleteItemInSummary(event) { /* (เหมือนเดิมจาก V16) */
        const deleteButton = event.target.closest('.delete-item-summary-btn'); if (!deleteButton) return; const tableRow = deleteButton.closest('tr'); if (!tableRow) return; const shopId = tableRow.dataset.shopId; const itemIndex = parseInt(tableRow.dataset.itemIndex, 10); if (shopId === undefined || isNaN(itemIndex)) { console.error("ไม่สามารถหา shopId หรือ itemIndex สำหรับลบได้"); return; } const shop = shops.find(s => s.id === shopId); if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.error("หาข้อมูลร้านหรือรายการที่จะลบไม่เจอ:", shopId, itemIndex); return; } const itemToDelete = shop.items[itemIndex]; if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) { shop.items.splice(itemIndex, 1); console.log("Item deleted from state."); /* TODO: Save state */ hasUnsavedChanges = true; const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID); if(saveBtn) saveBtn.disabled = false; showSummary(summaryModalShopId); if (copyStatus) { copyStatus.textContent = `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`; copyStatus.style.color = '#b91c1c'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669'; }, 3000); } }
    }
    /** V17.1: จัดการการบันทึกการแก้ไขในหน้าสรุป (เหมือน V16) */
    function handleSaveChangesInSummary() { /* (เหมือนเดิมจาก V16) */
        console.log("Save changes clicked"); if (!summaryContent) return; let changesMadeCount = 0; summaryContent.querySelectorAll('table.summary-table tbody tr[data-item-index]').forEach(row => { const shopId = row.dataset.shopId; const itemIndex = parseInt(row.dataset.itemIndex, 10); const quantityInput = row.querySelector('.summary-quantity'); const unitInput = row.querySelector('.summary-unit'); if (shopId === undefined || isNaN(itemIndex) || !quantityInput || !unitInput) { console.warn("ข้ามแถวที่ไม่สมบูรณ์:", row); return; } const shop = shops.find(s => s.id === shopId); if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.warn("หา item ใน state ไม่เจอสำหรับ:", shopId, itemIndex); return; } const currentItem = shop.items[itemIndex]; const newQuantity = quantityInput.value.trim(); const newUnit = unitInput.value.trim() || '?'; if (currentItem.quantity !== newQuantity || currentItem.unit !== newUnit) { console.log(`Change detected for item ${itemIndex} in shop ${shopId}: Qty ${currentItem.quantity}->${newQuantity}, Unit ${currentItem.unit}->${newUnit}`); currentItem.quantity = newQuantity; currentItem.unit = newUnit; changesMadeCount++; } }); if (changesMadeCount > 0) { console.log(`${changesMadeCount} changes saved to state.`); /* TODO: Save state */ hasUnsavedChanges = false; const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID); if(saveBtn) saveBtn.disabled = true; if (copyStatus) { copyStatus.textContent = `💾 บันทึก ${changesMadeCount} การแก้ไขเรียบร้อย!`; copyStatus.style.color = '#059669'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; }, 3000); } } else { console.log("No changes detected to save."); if (copyStatus) { copyStatus.textContent = `ℹ️ ไม่มีการแก้ไขให้บันทึก`; copyStatus.style.color = '#6b7280'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669';}, 2000); } hasUnsavedChanges = false; const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID); if(saveBtn) saveBtn.disabled = true; }
    }
    /** V17.1: จัดการเมื่อมีการแก้ไข Input ใน Modal สรุป (เหมือน V16) */
    function handleSummaryInputChange(event) { /* (เหมือนเดิมจาก V16) */
        if (event.target.classList.contains('summary-input')) { if (!hasUnsavedChanges) { console.log("Change detected in summary input."); hasUnsavedChanges = true; const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID); if (saveBtn) { saveBtn.disabled = false; console.log("Save button enabled."); } } }
    }

    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V17.1) ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...'; loadingErrorDiv.style.display = 'block'; /* ... styling ... */
        let fetchSuccess = false;
        try {
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' }); if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`); const jsonData = await response.json(); if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`); masterItemList = jsonData; fetchSuccess = true; loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`; /* ... styling ... */ setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000); createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error); loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ...`; /* ... styling ... */ loadingErrorDiv.style.display = 'block';
            // V17.1: ใช้ initialShopsData ที่มีร้านเริ่มต้น
            shops = JSON.parse(JSON.stringify(initialShopsData));
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้น");
        } finally {
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);
            // V17.1: กำหนด active shop แรกเสมอ ถ้ามีร้านค้า
            if (shops.length > 0 && !activeShopId) {
                activeShopId = shops[0].id;
            } else if (shops.length === 0) {
                activeShopId = null;
            }
            renderTabs(); renderTabContent();
            setupEventListeners();
            console.log("--- initializeApp เสร็จสิ้น (V17.1) ---");
        }
    }

    /** V17.1: ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก */
    function setupEventListeners() {
        console.log("Setting up event listeners...");

        // ปุ่ม + เพิ่มแท็บ/ร้าน
        addTabButton?.addEventListener('click', handleAddTabClick);
        // ปุ่มยกเลิกการเพิ่มร้าน
        cancelNewShopButton?.addEventListener('click', handleCancelNewShop);
        // ปุ่มบันทึกร้านใหม่
        saveNewShopButton?.addEventListener('click', handleSaveNewShop);
        // กด Enter ในช่องชื่อร้านใหม่ = บันทึก
        newShopNameInput?.addEventListener('keypress', (event) => { if (event.key === 'Enter') { handleSaveNewShop(); } });

        // ปุ่ม สรุปทั้งหมด (ลอย)
        overallSummaryButton?.addEventListener('click', () => showSummary());

        // ปุ่ม Modal (ปิด, Copy, ปิด Action)
        modalCloseButton?.addEventListener('click', closeModal);
        copySummaryButton?.addEventListener('click', copySummaryToClipboard);
        closeModalActionButton?.addEventListener('click', closeModal);
        // คลิกนอก Modal แล้วปิด
        window.addEventListener('click', (event) => { if (event.target == summaryModal) closeModal(); });

        // --- Event Delegation ---
        // คลิกแท็บร้านค้า (ตัวแท็บ ไม่ใช่ปุ่มลบ)
        shopTabsContainer?.addEventListener('click', handleTabClick);
        // V17.1: คลิกปุ่มลบร้าน (X บนแท็บ)
        shopTabsContainer?.addEventListener('click', handleDeleteShopClick);

        // คลิกปุ่มเพิ่มรายการ (+) ใน Content Area
        tabContentArea?.addEventListener('click', handleAddItemClick);
        // กด Enter ในช่อง Item Input = เพิ่มรายการ
        tabContentArea?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && event.target.classList.contains('entry-item')) {
                 event.preventDefault(); const entryArea = event.target.closest('.item-entry-area');
                 const addButton = entryArea?.querySelector('.entry-add-btn'); addButton?.click();
             }
         });
        // V17.1: คลิกปุ่มลบรายการ (ถังขยะ) ใน List Area
        tabContentArea?.addEventListener('click', handleDeleteItemInline);


        // --- V16/V17: Listeners สำหรับ Modal สรุป ---
        // คลิกปุ่มลบรายการในตารางสรุป
        summaryContent?.addEventListener('click', handleDeleteItemInSummary);
        // มีการแก้ไข input ในตารางสรุป
        summaryContent?.addEventListener('input', handleSummaryInputChange);
        // คลิกปุ่ม Save Changes ใน Modal Actions
        modalActionsDiv?.addEventListener('click', (event) => {
            if (event.target.id === SAVE_CHANGES_BTN_ID || event.target.closest(`#${SAVE_CHANGES_BTN_ID}`)) {
                handleSaveChangesInSummary();
            }
        });
         console.log("Event listeners setup complete.");
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
