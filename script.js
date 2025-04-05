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
    const copyStatus = document.getElementById('copy-status'); // ข้อความ Copy สำเร็จ
    const modalActionsDiv = summaryModal.querySelector('.modal-actions'); // V16: Div ที่ใส่ปุ่มใน Modal
    const modalCloseButton = document.getElementById('modal-close-btn');
    const copySummaryButton = document.getElementById('copy-summary-btn');
    const closeModalActionButton = document.getElementById('close-modal-action-btn');

    // --- Constants ---
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list';
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list';
    const ITEMS_JSON_PATH = 'items.json';
    const SAVE_CHANGES_BTN_ID = 'save-summary-changes-btn'; // V16: ID สำหรับปุ่ม Save ใน Modal

    // --- State Variables ---
    let masterItemList = [];
    let shops = []; // [{ id, name, items: [{ quantity, unit, item }, ...] }, ...]
    let activeShopId = null;
    let summaryModalShopId = null; // V16: เก็บ ID ของร้านที่กำลังดูในสรุป (null คือดูทั้งหมด)
    let hasUnsavedChanges = false; // V16: Flag เช็คว่ามีการแก้ไขใน Modal ที่ยังไม่เซฟไหม

    const initialShopsData = [
        // { id: 'shop-init-1', name: 'ร้านตัวอย่าง 1', items: [] },
    ];

    // --- V16: Rendering Functions ---

    /** V16: วาดแถบแท็บร้านค้าใหม่ทั้งหมด */
    function renderTabs() {
        // (โค้ดเหมือนเดิมจาก V15)
        if (!shopTabsContainer || !addTabButton) return;
        const previouslyFocusedElement = document.activeElement;
        Array.from(shopTabsContainer.children).forEach(child => {
            if (child !== addTabButton && child !== newShopInputContainer) {
                shopTabsContainer.removeChild(child);
            }
        });
        shops.forEach(shop => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button'; tabButton.textContent = shop.name;
            tabButton.dataset.shopId = shop.id;
            if (shop.id === activeShopId) { tabButton.classList.add('active'); }
            tabButton.addEventListener('click', handleTabClick);
            shopTabsContainer.insertBefore(tabButton, addTabButton);
        });
        // Restore focus (best effort)
        if (document.body.contains(previouslyFocusedElement)) {
             try { previouslyFocusedElement.focus(); } catch (e) {}
        } else if (activeShopId) {
             const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`);
             activeTabButton?.focus();
        }
        updateOverallSummaryButtonVisibility();
    }

    /** V16: วาดเนื้อหาของแท็บที่ถูกเลือก */
    function renderTabContent() {
        // (โค้ดเหมือนเดิมจาก V15)
        if (!tabContentArea) return;
        tabContentArea.innerHTML = '';
        const activeShop = shops.find(shop => shop.id === activeShopId);
        if (activeShop) {
            // Header
            const headerDiv = document.createElement('div'); headerDiv.className = 'shop-header';
            const shopNameDisplay = document.createElement('span');
            shopNameDisplay.className = 'shop-name-display'; shopNameDisplay.textContent = activeShop.name;
            const deleteShopBtn = document.createElement('button');
            deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
            deleteShopBtn.className = 'delete-shop-btn'; deleteShopBtn.title = "ลบร้านค้านี้";
            deleteShopBtn.type = "button"; deleteShopBtn.dataset.shopId = activeShop.id;
            deleteShopBtn.addEventListener('click', handleDeleteShopClick);
            headerDiv.appendChild(shopNameDisplay); headerDiv.appendChild(deleteShopBtn);
            tabContentArea.appendChild(headerDiv);
            // Entry Area
            const entryArea = createItemEntryArea(activeShop.id); tabContentArea.appendChild(entryArea);
            // Actions
            const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'shop-actions';
            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = '📋 สรุปรายการร้านนี้'; summarizeBtn.className = 'action-button summarize-btn';
            summarizeBtn.type = "button"; summarizeBtn.addEventListener('click', () => showSummary(activeShopId));
            buttonsDiv.appendChild(summarizeBtn); tabContentArea.appendChild(buttonsDiv);
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'none';
        } else {
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'block';
        }
    }

    // --- UI Creation Functions (ส่วนใหญ่เหมือนเดิม) ---

    function createOrUpdateDatalist(listId, optionsArray) { /* (เหมือนเดิม) */
        let datalist = document.getElementById(listId);
        if (!datalist) { datalist = document.createElement('datalist'); datalist.id = listId; document.body.appendChild(datalist); datalist = document.getElementById(listId); if (!datalist) { console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`); return; } }
        datalist.innerHTML = ''; if (!Array.isArray(optionsArray)) { console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`); return; }
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));
        sortedOptions.forEach(optionValue => { if (typeof optionValue === 'string' && optionValue.trim() !== '') { try { const option = document.createElement('option'); option.value = optionValue; datalist.appendChild(option); } catch (e) { console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e); } } });
    }
    function createUnitInputEntry(selectedUnit = '') { /* (เหมือนเดิม) */
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'หน่วย'; input.className = 'entry-unit'; input.value = selectedUnit; input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); return input;
    }
    function createItemInputEntry(selectedItem = '') { /* (เหมือนเดิม) */
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'ใส่รายการ กด + เพื่อเพิ่ม...'; input.className = 'entry-item'; input.value = selectedItem; input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); return input;
    }
    function createItemEntryArea(shopId) { /* (เหมือนเดิม) */
        const entryDiv = document.createElement('div'); entryDiv.className = 'item-entry-area'; entryDiv.dataset.shopId = shopId;
        const quantityInput = document.createElement('input'); quantityInput.type = 'number'; quantityInput.placeholder = 'จำนวน'; quantityInput.min = "0"; quantityInput.step = "any"; quantityInput.className = 'entry-quantity';
        const unitInput = createUnitInputEntry(); const itemInput = createItemInputEntry();
        const addBtn = document.createElement('button'); addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`; addBtn.className = 'action-button entry-add-btn'; addBtn.title = "เพิ่มรายการนี้"; addBtn.type = "button";
        const statusDiv = document.createElement('div'); statusDiv.className = 'entry-status';
        entryDiv.appendChild(quantityInput); entryDiv.appendChild(unitInput); entryDiv.appendChild(itemInput); entryDiv.appendChild(addBtn); entryDiv.appendChild(statusDiv); return entryDiv;
    }

    // --- V16: Event Handlers ---

    /** V16: จัดการการคลิกแท็บร้านค้า */
    function handleTabClick(event) {
        // (โค้ดเหมือนเดิมจาก V15)
        const clickedTab = event.target.closest('.tab-button');
        if (!clickedTab || clickedTab.classList.contains('active')) { return; }
        const newActiveShopId = clickedTab.dataset.shopId;
        if (newActiveShopId) {
            activeShopId = newActiveShopId;
            renderTabs(); renderTabContent();
        }
    }

    /** V16: จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() {
        // (โค้ดเหมือนเดิมจาก V15)
        if (newShopInputContainer && addTabButton && newShopNameInput) {
            newShopInputContainer.classList.remove('hidden'); addTabButton.classList.add('hidden');
            newShopNameInput.value = ''; newShopNameInput.focus();
        }
    }

    /** V16: จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() {
        // (โค้ดเหมือนเดิมจาก V15)
         if (newShopInputContainer && addTabButton) {
            newShopInputContainer.classList.add('hidden'); addTabButton.classList.remove('hidden');
            newShopNameInput.value = '';
        }
    }

    /** V16: จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() {
        // (โค้ดเหมือนเดิมจาก V15)
        if (!newShopNameInput) return;
        const newName = newShopNameInput.value.trim();
        if (!newName) { alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ"); newShopNameInput.focus(); return; }
        if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) { alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`); newShopNameInput.focus(); newShopNameInput.select(); return; }
        const newShopId = `shop-${Date.now()}`;
        const newShopData = { id: newShopId, name: newName, items: [] };
        shops.push(newShopData); activeShopId = newShopId;
        renderTabs(); renderTabContent(); handleCancelNewShop();
        // TODO: Save state
    }

     /** V16: จัดการการกดปุ่มลบร้าน (X) */
    function handleDeleteShopClick(event) {
        // (โค้ดเหมือนเดิมจาก V15)
        const deleteButton = event.target.closest('.delete-shop-btn'); if (!deleteButton) return;
        const shopIdToDelete = deleteButton.dataset.shopId; const shopToDelete = shops.find(s => s.id === shopIdToDelete); if (!shopToDelete) return;
        if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) {
            const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete);
            if (indexToDelete > -1) {
                shops.splice(indexToDelete, 1);
                if (activeShopId === shopIdToDelete) {
                    if (shops.length === 0) { activeShopId = null; }
                    else if (indexToDelete >= shops.length) { activeShopId = shops[shops.length - 1].id; }
                    else { activeShopId = shops[indexToDelete].id; }
                }
                renderTabs(); renderTabContent();
                // TODO: Save state
            }
        }
    }

    /** V16: จัดการการกดปุ่ม "เพิ่มรายการ" (+) ใน Entry Area */
    function handleAddItemClick(event) {
        // (โค้ดเหมือนเดิมจาก V15)
        const addButton = event.target.closest('.entry-add-btn'); if (!addButton) return;
        const entryArea = addButton.closest('.item-entry-area'); if (!entryArea) return;
        const shopId = entryArea.dataset.shopId;
        const quantityInput = entryArea.querySelector('.entry-quantity');
        const unitInput = entryArea.querySelector('.entry-unit');
        const itemInput = entryArea.querySelector('.entry-item');
        if (!shopId || !quantityInput || !unitInput || !itemInput) { console.error("หา elements ใน entry area ไม่เจอ ร้าน:", shopId); return; }
        const quantity = quantityInput.value.trim(); const unit = unitInput.value.trim();
        const itemName = itemInput.value.trim(); const itemNameLower = itemName.toLowerCase();
        if (!itemName) { showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true); itemInput.focus(); return; }
        if (!quantity) { showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true); quantityInput.focus(); return; }
        const shop = shops.find(s => s.id === shopId); if (!shop) { console.error("ไม่เจอร้านใน state ID:", shopId); showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true); return; }
        const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicate) { showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true); itemInput.focus(); itemInput.select(); return; }
        shop.items.push({ quantity: quantity, unit: unit || '?', item: itemName });
        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false);
        quantityInput.value = ''; unitInput.value = ''; itemInput.value = ''; itemInput.focus();
        // TODO: Save state
    }

    /** V16: แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) {
        // (โค้ดเหมือนเดิมจาก V14)
        const statusDiv = entryAreaElement.querySelector('.entry-status'); if (!statusDiv) return;
        statusDiv.textContent = message; statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`; statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; statusDiv.textContent = ''; statusDiv.className = 'entry-status'; }, 2500);
    }

    // --- Core Logic Functions ---

    /** อัปเดตการแสดงผลปุ่มสรุปทั้งหมด */
    function updateOverallSummaryButtonVisibility() { /* (เหมือนเดิม) */
        const shopSectionsExist = shops.length > 0; if (overallSummaryContainer) { overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none'; }
    }

    /** V16: ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป (เพิ่ม shopId) */
    function getOrderData(shopId = null) {
        if (shopId) {
            const shop = shops.find(s => s.id === shopId);
            // V16: คืนค่า object เดียว ที่มี shopId ด้วย
            if (shop) { return [{ shopId: shop.id, shopName: shop.name, items: [...shop.items] }]; }
            else { return []; }
        } else {
             // V16: เพิ่ม shopId ในทุก object ที่ map ออกมา
             return shops
                .filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')
                .map(shop => ({
                    shopId: shop.id, // เพิ่ม shopId ตรงนี้
                    shopName: shop.name,
                    items: [...shop.items]
                }));
        }
    }

    /** จัดรูปแบบวันที่เวลาไทย */
    function formatThaiTimestamp() { /* (เหมือนเดิม) */
        const now = new Date(); const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' }; const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }; try { const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' }); const buddhistYear = yearFormatter.format(now); const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); const formattedTime = now.toLocaleTimeString('th-TH', timeOptions); return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`; } catch (e) { console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }
    /** Escape HTML */
    function escapeHtml(unsafe) { /* (เหมือนเดิม) */
        if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    /** V16: แสดง Modal สรุป (สร้างตารางที่แก้ไขได้ + ปุ่มลบ/บันทึก) */
    function showSummary(shopId = null) {
        if (!summaryModal || !summaryContent || !summaryTimestampElem || !modalActionsDiv) {
            console.error("หา Element ของ Modal ไม่เจอ!"); return;
        }

        summaryModalShopId = shopId; // V16: เก็บ shopId ที่ใช้เปิด Modal นี้ไว้
        hasUnsavedChanges = false; // V16: รีเซ็ต flag unsaved changes

        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp;

        const data = getOrderData(summaryModalShopId); // V16: ใช้ shopId ที่เก็บไว้
        summaryContent.innerHTML = ''; // เคลียร์เนื้อหาเก่า
        if (copyStatus) copyStatus.style.display = 'none';

        // --- ลบปุ่ม Save เก่า (ถ้ามี) ---
        const existingSaveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
        existingSaveBtn?.remove();

        const dataToShow = data;
        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            dataToShow.forEach(shopData => {
                // V16: ต้องมั่นใจว่า shopData.shopId มีอยู่ (แก้ getOrderData แล้ว)
                const currentShopId = shopData.shopId;
                if (!currentShopId) {
                    console.error("Shop data is missing ID in showSummary:", shopData);
                    return; // ข้ามร้านนี้ถ้าไม่มี ID
                }

                const shopNameEscaped = escapeHtml(shopData.shopName);
                modalHtml += `<h3 style="/*...*/">🛒 ${shopNameEscaped}</h3>`; // Header ร้าน

                if (summaryModalShopId === null) { // ใส่ timestamp ต่อร้าน ถ้าดูสรุปทั้งหมด
                    const timePart = overallTimestamp.split(' เวลา ')[1] || '';
                    const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ','');
                    modalHtml += `<p class="shop-timestamp-print" style="/*...*/">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                }

                // V16: ปรับปรุงหัวตาราง เปลี่ยนคอลัมน์สุดท้ายเป็น "จัดการ"
                modalHtml += `
                    <table class="summary-table" data-shop-id="${currentShopId}" style="/*...*/">
                        <thead>
                            <tr>
                                <th style="/*...*/ width: 15%;">จำนวน</th>
                                <th style="/*...*/ width: 20%;">หน่วย</th>
                                <th style="/*...*/ width: 50%;">รายการ</th>
                                <th style="/*...*/ width: 15%;">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                // V16: วนลูปสร้างแถวที่แก้ไขได้
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach((item, index) => {
                        // ใส่ data-shop-id และ data-item-index ที่แถว <tr> เพื่อง่ายต่อการอ้างอิง
                        modalHtml += `
                            <tr data-shop-id="${currentShopId}" data-item-index="${index}">
                                <td style="/*...*/ text-align: center;">
                                    <input type="number" value="${escapeHtml(item.quantity)}"
                                           class="summary-input summary-quantity" min="0" step="any"
                                           aria-label="จำนวนของ ${escapeHtml(item.item)}">
                                </td>
                                <td style="/*...*/">
                                    <input type="text" value="${escapeHtml(item.unit)}"
                                           class="summary-input summary-unit" list="${GLOBAL_UNITS_DATALIST_ID}"
                                           aria-label="หน่วยของ ${escapeHtml(item.item)}">
                                </td>
                                <td style="/*...*/ word-wrap: break-word;">
                                    ${escapeHtml(item.item)}
                                </td>
                                <td style="/*...*/ text-align: center;">
                                    <button class="delete-item-summary-btn" title="ลบรายการ ${escapeHtml(item.item)}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                     modalHtml += `<tr><td colspan="4" style="/*...*/">(ไม่มีรายการ)</td></tr>`;
                }

                // V16: ไม่ต้องมี tfoot รวมราคาแล้ว เพราะอาจจะสับสนตอนแก้ไข
                modalHtml += `</tbody></table>`;
            });
            summaryContent.innerHTML = modalHtml;

            // --- V16: เพิ่มปุ่ม "บันทึกการแก้ไข" ---
            const saveChangesBtn = document.createElement('button');
            saveChangesBtn.id = SAVE_CHANGES_BTN_ID;
            saveChangesBtn.className = 'action-button save-changes-btn'; // Add specific class for styling
            saveChangesBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> บันทึกการแก้ไข`;
            saveChangesBtn.disabled = true; // เริ่มต้นให้กดไม่ได้ จนกว่าจะมีการแก้ไข
            modalActionsDiv.insertBefore(saveChangesBtn, copySummaryButton); // แทรกปุ่ม Save ก่อนปุ่ม Copy

        } else {
             // กรณีไม่มีข้อมูล ให้แน่ใจว่าไม่มีปุ่ม Save ค้างอยู่
             existingSaveBtn?.remove();
        }
        summaryModal.style.display = 'block';
    }

    /** V16: ปิด Modal (เพิ่มเช็ค unsaved changes) */
    function closeModal() {
        if (hasUnsavedChanges) {
            if (!confirm("เพื่อน! มีการแก้ไขที่ยังไม่ได้กดบันทึกนะ ต้องการปิดโดยไม่บันทึกจริงดิ?")) {
                return; // ไม่ปิด ถ้าผู้ใช้กดยกเลิก
            }
        }
        if (summaryModal) summaryModal.style.display = 'none';
        // เคลียร์ shopId ที่ดูอยู่ และ flag unsaved
        summaryModalShopId = null;
        hasUnsavedChanges = false;
        // ลบปุ่ม Save ที่อาจสร้างไว้
        document.getElementById(SAVE_CHANGES_BTN_ID)?.remove();
    }

    /** V16: คัดลอกสรุป (ต้องมั่นใจว่าข้อมูลล่าสุดถูกดึงมา) */
    function copySummaryToClipboard() {
        if (hasUnsavedChanges) {
             alert("เพื่อน! กรุณากด 'บันทึกการแก้ไข' ก่อนคัดลอกนะ เพื่อให้ได้ข้อมูลล่าสุด");
             return;
        }
        if (!summaryContent) return;
        let textToCopy = ""; const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n";
        // V16: ดึงข้อมูลล่าสุดจาก State โดยใช้ summaryModalShopId ที่เก็บไว้
        const dataToCopy = getOrderData(summaryModalShopId);
        // (ส่วนที่เหลือเหมือนเดิม)
         if(dataToCopy.length === 0) { textToCopy += "(ไม่มีรายการสั่งซื้อ)"; }
         else {
             dataToCopy.forEach((shopData, index) => {
                const shopNameOnly = shopData.shopName.replace(/🛒\s*/, ''); textToCopy += `--- ${shopNameOnly} ---\n`;
                if (shopData.items.length > 0) { shopData.items.forEach(item => { textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`; }); }
                else { textToCopy += "(ไม่มีรายการ)\n"; }
                if (index < dataToCopy.length - 1) { textToCopy += "\n"; }
            });
         }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy.trim()).then(() => { if (copyStatus) { copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); } }).catch(err => { console.error('Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); });
        } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }

    /** V16: จัดการการลบรายการในหน้าสรุป */
    function handleDeleteItemInSummary(event) {
        const deleteButton = event.target.closest('.delete-item-summary-btn');
        if (!deleteButton) return;

        const tableRow = deleteButton.closest('tr');
        if (!tableRow) return;

        const shopId = tableRow.dataset.shopId;
        const itemIndex = parseInt(tableRow.dataset.itemIndex, 10); // แปลงเป็นเลขฐาน 10

        if (shopId === undefined || isNaN(itemIndex)) {
            console.error("ไม่สามารถหา shopId หรือ itemIndex สำหรับลบได้");
            return;
        }

        // หาข้อมูลร้านและรายการที่จะลบ
        const shop = shops.find(s => s.id === shopId);
        if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) {
            console.error("หาข้อมูลร้านหรือรายการที่จะลบไม่เจอ:", shopId, itemIndex);
            return;
        }
        const itemToDelete = shop.items[itemIndex];

        // ถามยืนยันก่อนลบ
        if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) {
            // ลบออกจาก state 'shops'
            shop.items.splice(itemIndex, 1);
            // TODO: Save state if implementing persistence

            // ทำให้ปุ่ม Save กดได้ (เพราะมีการเปลี่ยนแปลง)
            hasUnsavedChanges = true; // ตั้ง flag ว่ามีการเปลี่ยนแปลง (แม้จะเป็นการลบ)
            const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
            if(saveBtn) saveBtn.disabled = false;


            // V16: วาดตารางใน Modal ใหม่ทันที เพื่อให้เห็นว่าลบไปแล้ว
            // ใช้ summaryModalShopId ที่เก็บไว้ เพื่อให้รู้ว่าต้องสรุปร้านเดียวหรือทั้งหมด
            showSummary(summaryModalShopId);
            // เพิ่มข้อความบอกว่าลบแล้ว (อาจจะใช้ copyStatus หรือสร้าง element ใหม่)
             if (copyStatus) {
                 copyStatus.textContent = `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`;
                 copyStatus.style.color = '#b91c1c'; // สีแดง
                 copyStatus.style.display = 'block';
                 setTimeout(() => {
                     copyStatus.style.display = 'none';
                     copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; // คืนค่าเดิม
                     copyStatus.style.color = '#059669'; // สีเขียว
                 }, 3000);
             }
        }
    }

    /** V16: จัดการการบันทึกการแก้ไขในหน้าสรุป */
    function handleSaveChangesInSummary() {
        if (!summaryContent) return;
        let changesMadeCount = 0;

        // วนลูปหาทุกแถว (tr) ที่มี data-item-index ใน tbody ของทุกตารางใน summaryContent
        summaryContent.querySelectorAll('table.summary-table tbody tr[data-item-index]').forEach(row => {
            const shopId = row.dataset.shopId;
            const itemIndex = parseInt(row.dataset.itemIndex, 10);

            const quantityInput = row.querySelector('.summary-quantity');
            const unitInput = row.querySelector('.summary-unit');

            if (shopId === undefined || isNaN(itemIndex) || !quantityInput || !unitInput) {
                console.warn("ข้ามแถวที่ไม่สมบูรณ์:", row);
                return; // ข้ามแถวนี้ถ้าข้อมูลไม่ครบ
            }

            // หาข้อมูล item เดิมใน state
            const shop = shops.find(s => s.id === shopId);
            if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) {
                console.warn("หา item ใน state ไม่เจอสำหรับ:", shopId, itemIndex);
                return; // ข้ามถ้าหา item เดิมไม่เจอ
            }
            const currentItem = shop.items[itemIndex];

            // ดึงค่าใหม่จาก input
            const newQuantity = quantityInput.value.trim();
            const newUnit = unitInput.value.trim() || '?'; // ใส่ '?' ถ้าว่าง

            // --- ตรวจสอบว่ามีการเปลี่ยนแปลงจริง ---
            if (currentItem.quantity !== newQuantity || currentItem.unit !== newUnit) {
                // --- อัปเดตข้อมูลใน state 'shops' ---
                currentItem.quantity = newQuantity;
                currentItem.unit = newUnit;
                changesMadeCount++;
                // console.log(`Updated item[${itemIndex}] in shop ${shopId}:`, currentItem);
            }
        });

        if (changesMadeCount > 0) {
            // TODO: Save state if implementing persistence
            hasUnsavedChanges = false; // รีเซ็ต flag
            const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
            if(saveBtn) saveBtn.disabled = true; // ทำให้กด Save ไม่ได้อีก จนกว่าจะแก้ใหม่

            // แสดงข้อความว่าบันทึกแล้ว
             if (copyStatus) {
                 copyStatus.textContent = `💾 บันทึก ${changesMadeCount} การแก้ไขเรียบร้อย!`;
                 copyStatus.style.color = '#059669'; // สีเขียว
                 copyStatus.style.display = 'block';
                 setTimeout(() => {
                     copyStatus.style.display = 'none';
                     copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; // คืนค่าเดิม
                 }, 3000);
             }
             // อาจจะ redraw summary เพื่อให้แน่ใจว่า input แสดงค่าล่าสุด (แต่ไม่จำเป็นถ้า state ถูก)
             // showSummary(summaryModalShopId);

        } else {
            // ถ้าไม่มีการเปลี่ยนแปลง ก็บอกผู้ใช้ (หรือไม่ต้องทำอะไร)
             if (copyStatus) {
                 copyStatus.textContent = `ℹ️ ไม่มีการแก้ไขให้บันทึก`;
                 copyStatus.style.color = '#6b7280'; // สีเทา
                 copyStatus.style.display = 'block';
                 setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669';}, 2000);
             }
             hasUnsavedChanges = false; // รีเซ็ต flag
             const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
             if(saveBtn) saveBtn.disabled = true;
        }
    }

     /** V16: Function to handle input changes in summary modal */
    function handleSummaryInputChange(event) {
        if (event.target.classList.contains('summary-input')) {
            hasUnsavedChanges = true; // ตั้ง flag ว่ามีการแก้ไข
            const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
            if (saveBtn) {
                saveBtn.disabled = false; // ทำให้ปุ่ม Save กดได้
            }
        }
    }

    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V16) ---");
        /* ... (ส่วนโหลด items.json เหมือน V15) ... */
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...'; loadingErrorDiv.style.display = 'block'; /* ... styling ... */
        let fetchSuccess = false;
        try {
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' }); if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`); const jsonData = await response.json(); if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`); masterItemList = jsonData; fetchSuccess = true; loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`; /* ... styling ... */ setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000); createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error); loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ...`; /* ... styling ... */ loadingErrorDiv.style.display = 'block'; shops = JSON.parse(JSON.stringify(initialShopsData)); console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน (ถ้ามี)");
        } finally {
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);
            if (shops.length > 0 && !activeShopId) { activeShopId = shops[0].id; }
            else if (shops.length === 0) { activeShopId = null; }
            renderTabs(); renderTabContent();
            setupEventListeners(); // V16: เรียกใช้ฟังก์ชัน setup listeners
            console.log("--- initializeApp เสร็จสิ้น (V16) ---");
        }
    }

    /** V16: ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก */
    function setupEventListeners() {
        // --- Listeners จาก V15 ---
        addTabButton?.addEventListener('click', handleAddTabClick);
        cancelNewShopButton?.addEventListener('click', handleCancelNewShop);
        saveNewShopButton?.addEventListener('click', handleSaveNewShop);
        newShopNameInput?.addEventListener('keypress', (event) => { if (event.key === 'Enter') { handleSaveNewShop(); } });
        overallSummaryButton?.addEventListener('click', () => showSummary());
        modalCloseButton?.addEventListener('click', closeModal); // V16: ใช้ closeModal ที่แก้แล้ว
        copySummaryButton?.addEventListener('click', copySummaryToClipboard);
        closeModalActionButton?.addEventListener('click', closeModal); // V16: ใช้ closeModal ที่แก้แล้ว
        window.addEventListener('click', (event) => { if (event.target == summaryModal) closeModal(); }); // V16: ใช้ closeModal ที่แก้แล้ว
        tabContentArea?.addEventListener('click', handleAddItemClick); // เพิ่ม item
        tabContentArea?.addEventListener('keypress', (event) => { // Enter ในช่อง item = เพิ่ม
             if (event.key === 'Enter' && event.target.classList.contains('entry-item')) {
                 event.preventDefault(); const entryArea = event.target.closest('.item-entry-area');
                 const addButton = entryArea?.querySelector('.entry-add-btn'); addButton?.click();
             }
         });
         // V16: Listener สำหรับคลิกแท็บ (ย้ายมาจาก renderTabs เพื่อรวมศูนย์)
         shopTabsContainer?.addEventListener('click', handleTabClick);
         // V16: Listener สำหรับปุ่มลบร้าน (ย้ายมาจาก renderTabContent เพื่อรวมศูนย์)
         tabContentArea?.addEventListener('click', handleDeleteShopClick);


        // --- V16: Listeners ใหม่สำหรับ Modal สรุป ---
        // ใช้ Event Delegation สำหรับปุ่มลบในตารางสรุป
        summaryContent?.addEventListener('click', handleDeleteItemInSummary);
        // ใช้ Event Delegation สำหรับการเปลี่ยนแปลงใน input ของตารางสรุป
        summaryContent?.addEventListener('input', handleSummaryInputChange); // ใช้ 'input' event ดีกว่า 'change'
        // Listener สำหรับปุ่ม Save Changes (เนื่องจากปุ่มสร้างแบบ dynamic ต้องดักที่ parent)
        modalActionsDiv?.addEventListener('click', (event) => {
            if (event.target.id === SAVE_CHANGES_BTN_ID) {
                handleSaveChangesInSummary();
            }
        });
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
