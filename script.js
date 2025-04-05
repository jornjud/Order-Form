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
    const modalActionsDiv = summaryModal?.querySelector('.modal-actions'); // V16: ใช้ optional chaining เผื่อไม่มี modalActionsDiv
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
    let shops = [];
    let activeShopId = null;
    let summaryModalShopId = null;
    let hasUnsavedChanges = false;

    const initialShopsData = [];

    // --- V16.1: Rendering Functions ---

    /** V16.1: วาดแถบแท็บร้านค้าใหม่ทั้งหมด */
    function renderTabs() {
        console.log("renderTabs called. ActiveShopId:", activeShopId); // Debug log
        if (!shopTabsContainer || !addTabButton) {
            console.error("renderTabs: Missing shopTabsContainer or addTabButton");
            return;
        }
        const previouslyFocusedElement = document.activeElement;
        // Clear old tabs except + button and input container
        Array.from(shopTabsContainer.children).forEach(child => {
            if (child !== addTabButton && child !== newShopInputContainer) {
                shopTabsContainer.removeChild(child);
            }
        });

        // Create new tabs from state
        shops.forEach(shop => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button';
            tabButton.textContent = shop.name;
            tabButton.dataset.shopId = shop.id;
            if (shop.id === activeShopId) {
                tabButton.classList.add('active');
            }
            // V16.1: Listener is added in setupEventListeners using delegation
            // tabButton.addEventListener('click', handleTabClick); // Remove direct listener
            shopTabsContainer.insertBefore(tabButton, addTabButton);
        });

        // Restore focus (best effort)
        if (document.body.contains(previouslyFocusedElement)) {
             try { previouslyFocusedElement.focus({ preventScroll: true }); } catch (e) {} // preventScroll might help
        } else if (activeShopId) {
             const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`);
             activeTabButton?.focus({ preventScroll: true });
        }

        updateOverallSummaryButtonVisibility();
    }

    /** V16.1: วาดเนื้อหาของแท็บที่ถูกเลือก */
    function renderTabContent() {
        console.log("renderTabContent called. ActiveShopId:", activeShopId); // Debug log
        if (!tabContentArea) {
             console.error("renderTabContent: Missing tabContentArea");
             return;
        }
        tabContentArea.innerHTML = ''; // Clear old content
        const activeShop = shops.find(shop => shop.id === activeShopId);

        if (activeShop) {
            console.log("Rendering content for shop:", activeShop.name); // Debug log
            // Header
            const headerDiv = document.createElement('div'); headerDiv.className = 'shop-header';
            const shopNameDisplay = document.createElement('span');
            shopNameDisplay.className = 'shop-name-display'; shopNameDisplay.textContent = activeShop.name;
            const deleteShopBtn = document.createElement('button');
            deleteShopBtn.innerHTML = `<svg ...></svg>`; // Use actual SVG
            deleteShopBtn.className = 'delete-shop-btn'; deleteShopBtn.title = "ลบร้านค้านี้";
            deleteShopBtn.type = "button"; deleteShopBtn.dataset.shopId = activeShop.id;
            // V16.1: Listener added via delegation in setupEventListeners
            // deleteShopBtn.addEventListener('click', handleDeleteShopClick); // Remove direct listener
            headerDiv.appendChild(shopNameDisplay); headerDiv.appendChild(deleteShopBtn);
            tabContentArea.appendChild(headerDiv);

            // Entry Area
            const entryArea = createItemEntryArea(activeShop.id); tabContentArea.appendChild(entryArea);

            // Actions (Summarize button)
            const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'shop-actions';
            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = '📋 สรุปรายการร้านนี้'; summarizeBtn.className = 'action-button summarize-btn';
            summarizeBtn.type = "button";
            // V16.1: Use direct listener here as it's specific to this button instance
            summarizeBtn.addEventListener('click', () => showSummary(activeShopId));
            buttonsDiv.appendChild(summarizeBtn); tabContentArea.appendChild(buttonsDiv);

            if(noShopPlaceholder) noShopPlaceholder.style.display = 'none';
        } else {
            console.log("No active shop, showing placeholder."); // Debug log
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'block';
        }
    }

    // --- UI Creation Functions ---
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

    // --- V16.1: Event Handlers ---

    /** V16.1: จัดการการคลิกแท็บร้านค้า (Delegated) */
    function handleTabClick(event) {
        const clickedTab = event.target.closest('.tab-button');
        if (!clickedTab || clickedTab.classList.contains('active')) {
            return;
        }
        const newActiveShopId = clickedTab.dataset.shopId;
        console.log("Tab clicked, new active ID:", newActiveShopId); // Debug log
        if (newActiveShopId) {
            activeShopId = newActiveShopId;
            renderTabs();
            renderTabContent();
        }
    }

    /** V16.1: จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() {
        console.log("Add tab button clicked"); // Debug log
        if (newShopInputContainer && addTabButton && newShopNameInput) {
            newShopInputContainer.classList.remove('hidden');
            addTabButton.classList.add('hidden');
            newShopNameInput.value = '';
            newShopNameInput.focus();
             console.log("Showing new shop input"); // Debug log
        } else {
            console.error("handleAddTabClick: Missing required elements");
        }
    }

    /** V16.1: จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() {
        console.log("Cancel new shop"); // Debug log
         if (newShopInputContainer && addTabButton) {
            newShopInputContainer.classList.add('hidden');
            addTabButton.classList.remove('hidden');
            newShopNameInput.value = '';
        } else {
             console.error("handleCancelNewShop: Missing required elements");
        }
    }

    /** V16.1: จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() {
        console.log("Save new shop clicked"); // Debug log
        if (!newShopNameInput) {
             console.error("handleSaveNewShop: Missing newShopNameInput");
             return;
        }
        const newName = newShopNameInput.value.trim();

        if (!newName) {
            alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ");
            newShopNameInput.focus();
            return;
        }
        if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) {
             alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`);
             newShopNameInput.focus(); newShopNameInput.select();
             return;
        }

        const newShopId = `shop-${Date.now()}`;
        const newShopData = { id: newShopId, name: newName, items: [] };
        shops.push(newShopData);
        activeShopId = newShopId; // Activate the new shop
        console.log("New shop added:", newShopData); // Debug log

        renderTabs(); // Redraw tabs with the new one
        renderTabContent(); // Render the content for the new active shop
        handleCancelNewShop(); // Hide the input area

        // TODO: Save state
    }

     /** V16.1: จัดการการกดปุ่มลบร้าน (X) (Delegated) */
    function handleDeleteShopClick(event) {
        const deleteButton = event.target.closest('.delete-shop-btn');
        if (!deleteButton) return;

        const shopIdToDelete = deleteButton.dataset.shopId;
        const shopToDelete = shops.find(s => s.id === shopIdToDelete);
        console.log("Delete shop clicked for:", shopIdToDelete, shopToDelete?.name); // Debug log

        if (!shopToDelete) return;

        if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) {
            const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete);
            if (indexToDelete > -1) {
                shops.splice(indexToDelete, 1); // Remove from state
                 console.log("Shop removed from state."); // Debug log

                // Determine next active tab
                if (activeShopId === shopIdToDelete) {
                    if (shops.length === 0) { activeShopId = null; }
                    else if (indexToDelete >= shops.length) { activeShopId = shops[shops.length - 1].id; }
                    else { activeShopId = shops[indexToDelete].id; }
                     console.log("New activeShopId:", activeShopId); // Debug log
                }

                renderTabs();
                renderTabContent();
                // TODO: Save state
            }
        }
    }

    /** V16.1: จัดการการกดปุ่ม "เพิ่มรายการ" (+) ใน Entry Area (Delegated) */
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
        console.log(`Add item attempt: Qty=${quantity}, Unit=${unit}, Item=${itemName}, Shop=${shopId}`); // Debug log

        if (!itemName) { showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true); itemInput.focus(); return; }
        if (!quantity) { showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true); quantityInput.focus(); return; }

        const shop = shops.find(s => s.id === shopId);
        if (!shop) { console.error("ไม่เจอร้านใน state ID:", shopId); showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true); return; }

        const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicate) {
            console.log("Duplicate item found:", itemName); // Debug log
            showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true);
            itemInput.focus(); itemInput.select(); return;
        }

        shop.items.push({ quantity: quantity, unit: unit || '?', item: itemName });
        console.log("Item added to state:", shop.items); // Debug log
        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false);
        quantityInput.value = ''; unitInput.value = ''; itemInput.value = '';
        itemInput.focus();
        // TODO: Save state
    }

    /** V16.1: แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) {
        // (โค้ดเหมือนเดิมจาก V14)
        const statusDiv = entryAreaElement.querySelector('.entry-status'); if (!statusDiv) return;
        statusDiv.textContent = message; statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`; statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; statusDiv.textContent = ''; statusDiv.className = 'entry-status'; }, 2500);
    }

    // --- Core Logic Functions ---
    function updateOverallSummaryButtonVisibility() { /* (เหมือนเดิม) */
        const shopSectionsExist = shops.length > 0; if (overallSummaryContainer) { overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none'; }
    }

    /** V16.1: ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป (เพิ่ม shopId) */
    function getOrderData(shopId = null) {
        // (โค้ดเหมือนเดิมจาก V16)
        if (shopId) {
            const shop = shops.find(s => s.id === shopId);
            if (shop) { return [{ shopId: shop.id, shopName: shop.name, items: [...shop.items] }]; }
            else { return []; }
        } else {
             return shops
                .filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')
                .map(shop => ({ shopId: shop.id, shopName: shop.name, items: [...shop.items] }));
        }
    }
    function formatThaiTimestamp() { /* (เหมือนเดิม) */
        const now = new Date(); const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' }; const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }; try { const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' }); const buddhistYear = yearFormatter.format(now); const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); const formattedTime = now.toLocaleTimeString('th-TH', timeOptions); return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`; } catch (e) { console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }
    function escapeHtml(unsafe) { /* (เหมือนเดิม) */
        if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    /** V16.1: แสดง Modal สรุป (สร้างตารางที่แก้ไขได้ + ปุ่มลบ/บันทึก) */
    function showSummary(shopId = null) {
        console.log("showSummary called for shopId:", shopId); // Debug log
        if (!summaryModal || !summaryContent || !summaryTimestampElem || !modalActionsDiv) {
            console.error("showSummary: Missing required modal elements"); return;
        }

        summaryModalShopId = shopId; // เก็บ ID ที่ใช้เปิด
        hasUnsavedChanges = false; // รีเซ็ต flag

        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp;

        const data = getOrderData(summaryModalShopId);
        summaryContent.innerHTML = ''; // เคลียร์เนื้อหาเก่า
        if (copyStatus) copyStatus.style.display = 'none';

        // ลบปุ่ม Save เก่า (ถ้ามี) ป้องกันการสร้างซ้ำซ้อน
        document.getElementById(SAVE_CHANGES_BTN_ID)?.remove();

        if (data.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            data.forEach(shopData => {
                const currentShopId = shopData.shopId; // ใช้ ID ที่ได้จาก getOrderData
                if (!currentShopId) { console.error("Shop data missing ID in showSummary:", shopData); return; }

                const shopNameEscaped = escapeHtml(shopData.shopName);
                modalHtml += `<h3 style="/*...*/">🛒 ${shopNameEscaped}</h3>`;

                if (summaryModalShopId === null) { /* ... timestamp ... */
                    const timePart = overallTimestamp.split(' เวลา ')[1] || ''; const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ',''); modalHtml += `<p class="shop-timestamp-print" style="/*...*/">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                }

                // หัวตาราง (เปลี่ยนคอลัมน์สุดท้าย)
                modalHtml += `<table class="summary-table" data-shop-id="${currentShopId}" style="/*...*/"><thead><tr><th style="/*...*/ width: 15%;">จำนวน</th><th style="/*...*/ width: 20%;">หน่วย</th><th style="/*...*/ width: 50%;">รายการ</th><th style="/*...*/ width: 15%;">จัดการ</th></tr></thead><tbody>`;

                // รายการสินค้า (สร้าง input และปุ่มลบ)
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach((item, index) => {
                        modalHtml += `
                            <tr data-shop-id="${currentShopId}" data-item-index="${index}">
                                <td style="/*...*/ text-align: center;"><input type="number" value="${escapeHtml(item.quantity)}" class="summary-input summary-quantity" min="0" step="any" aria-label="จำนวนของ ${escapeHtml(item.item)}"></td>
                                <td style="/*...*/"><input type="text" value="${escapeHtml(item.unit)}" class="summary-input summary-unit" list="${GLOBAL_UNITS_DATALIST_ID}" aria-label="หน่วยของ ${escapeHtml(item.item)}"></td>
                                <td style="/*...*/ word-wrap: break-word;">${escapeHtml(item.item)}</td>
                                <td style="/*...*/ text-align: center;"><button class="delete-item-summary-btn" title="ลบรายการ ${escapeHtml(item.item)}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button></td>
                            </tr>`;
                    });
                } else {
                     modalHtml += `<tr><td colspan="4" style="/*...*/">(ไม่มีรายการ)</td></tr>`;
                }
                modalHtml += `</tbody></table>`;
            });
            summaryContent.innerHTML = modalHtml;

            // เพิ่มปุ่ม Save Changes ถ้ามีรายการให้แก้
            if (summaryContent.querySelector('table.summary-table tbody tr[data-item-index]')) {
                const saveChangesBtn = document.createElement('button');
                saveChangesBtn.id = SAVE_CHANGES_BTN_ID;
                saveChangesBtn.className = 'action-button save-changes-btn';
                saveChangesBtn.innerHTML = `<svg ...></svg> บันทึกการแก้ไข`; // Use actual SVG
                saveChangesBtn.disabled = true; // เริ่มต้นกดไม่ได้
                modalActionsDiv.insertBefore(saveChangesBtn, copySummaryButton);
            }
        }
        summaryModal.style.display = 'block';
    }

    /** V16.1: ปิด Modal (เพิ่มเช็ค unsaved changes) */
    function closeModal() {
        if (hasUnsavedChanges) {
            if (!confirm("เพื่อน! มีการแก้ไขที่ยังไม่ได้กดบันทึกนะ ต้องการปิดโดยไม่บันทึกจริงดิ?")) {
                return;
            }
        }
        if (summaryModal) summaryModal.style.display = 'none';
        summaryModalShopId = null;
        hasUnsavedChanges = false;
        document.getElementById(SAVE_CHANGES_BTN_ID)?.remove(); // ลบปุ่ม Save เสมอเมื่อปิด
    }

    /** V16.1: คัดลอกสรุป (เช็ค unsaved changes ก่อน) */
    function copySummaryToClipboard() {
        if (hasUnsavedChanges) {
             alert("เพื่อน! กรุณากด 'บันทึกการแก้ไข' ก่อนคัดลอกนะ เพื่อให้ได้ข้อมูลล่าสุด");
             return;
        }
        // (ส่วนที่เหลือเหมือนเดิมจาก V16)
        if (!summaryContent) return; let textToCopy = ""; const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n"; const dataToCopy = getOrderData(summaryModalShopId);
         if(dataToCopy.length === 0) { textToCopy += "(ไม่มีรายการสั่งซื้อ)"; }
         else { dataToCopy.forEach((shopData, index) => { const shopNameOnly = shopData.shopName.replace(/🛒\s*/, ''); textToCopy += `--- ${shopNameOnly} ---\n`; if (shopData.items.length > 0) { shopData.items.forEach(item => { textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`; }); } else { textToCopy += "(ไม่มีรายการ)\n"; } if (index < dataToCopy.length - 1) { textToCopy += "\n"; } }); }
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textToCopy.trim()).then(() => { if (copyStatus) { copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669'; copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); } }).catch(err => { console.error('Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); }); } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }

    /** V16.1: จัดการการลบรายการในหน้าสรุป (Delegated) */
    function handleDeleteItemInSummary(event) {
        const deleteButton = event.target.closest('.delete-item-summary-btn');
        if (!deleteButton) return;

        const tableRow = deleteButton.closest('tr'); if (!tableRow) return;
        const shopId = tableRow.dataset.shopId;
        const itemIndex = parseInt(tableRow.dataset.itemIndex, 10);

        if (shopId === undefined || isNaN(itemIndex)) { console.error("ไม่สามารถหา shopId หรือ itemIndex สำหรับลบได้"); return; }

        const shop = shops.find(s => s.id === shopId);
        if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.error("หาข้อมูลร้านหรือรายการที่จะลบไม่เจอ:", shopId, itemIndex); return; }
        const itemToDelete = shop.items[itemIndex];

        if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) {
            shop.items.splice(itemIndex, 1); // ลบออกจาก state
            console.log("Item deleted from state."); // Debug log
            // TODO: Save state

            // ทำให้ปุ่ม Save กดได้ เพราะถือว่ามีการเปลี่ยนแปลง
            hasUnsavedChanges = true;
            const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
            if(saveBtn) saveBtn.disabled = false;

            // วาด Modal ใหม่ทันที
            showSummary(summaryModalShopId);

             // แสดงข้อความว่าลบแล้ว
             if (copyStatus) {
                 copyStatus.textContent = `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`; copyStatus.style.color = '#b91c1c'; copyStatus.style.display = 'block';
                 setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669'; }, 3000);
             }
        }
    }

    /** V16.1: จัดการการบันทึกการแก้ไขในหน้าสรุป */
    function handleSaveChangesInSummary() {
        console.log("Save changes clicked"); // Debug log
        if (!summaryContent) return;
        let changesMadeCount = 0;

        summaryContent.querySelectorAll('table.summary-table tbody tr[data-item-index]').forEach(row => {
            const shopId = row.dataset.shopId;
            const itemIndex = parseInt(row.dataset.itemIndex, 10);
            const quantityInput = row.querySelector('.summary-quantity');
            const unitInput = row.querySelector('.summary-unit');

            if (shopId === undefined || isNaN(itemIndex) || !quantityInput || !unitInput) { console.warn("ข้ามแถวที่ไม่สมบูรณ์:", row); return; }

            const shop = shops.find(s => s.id === shopId);
            if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) { console.warn("หา item ใน state ไม่เจอสำหรับ:", shopId, itemIndex); return; }
            const currentItem = shop.items[itemIndex];

            const newQuantity = quantityInput.value.trim();
            const newUnit = unitInput.value.trim() || '?';

            if (currentItem.quantity !== newQuantity || currentItem.unit !== newUnit) {
                console.log(`Change detected for item ${itemIndex} in shop ${shopId}: Qty ${currentItem.quantity}->${newQuantity}, Unit ${currentItem.unit}->${newUnit}`); // Debug log
                currentItem.quantity = newQuantity;
                currentItem.unit = newUnit;
                changesMadeCount++;
            }
        });

        if (changesMadeCount > 0) {
            console.log(`${changesMadeCount} changes saved to state.`); // Debug log
            // TODO: Save state
            hasUnsavedChanges = false;
            const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
            if(saveBtn) saveBtn.disabled = true;

             if (copyStatus) {
                 copyStatus.textContent = `💾 บันทึก ${changesMadeCount} การแก้ไขเรียบร้อย!`; copyStatus.style.color = '#059669'; copyStatus.style.display = 'block';
                 setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; }, 3000);
             }
             // ไม่ต้อง redraw เพราะค่าใน input คือค่าล่าสุดแล้ว
        } else {
             console.log("No changes detected to save."); // Debug log
             if (copyStatus) {
                 copyStatus.textContent = `ℹ️ ไม่มีการแก้ไขให้บันทึก`; copyStatus.style.color = '#6b7280'; copyStatus.style.display = 'block';
                 setTimeout(() => { copyStatus.style.display = 'none'; copyStatus.textContent = '✅ คัดลอกรายการแล้ว!'; copyStatus.style.color = '#059669';}, 2000);
             }
             hasUnsavedChanges = false; // ก็ไม่มีการเปลี่ยนแปลง
             const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
             if(saveBtn) saveBtn.disabled = true; // ทำให้กดไม่ได้
        }
    }

     /** V16.1: จัดการเมื่อมีการแก้ไข Input ใน Modal สรุป */
    function handleSummaryInputChange(event) {
        // เช็คว่าเป็น input ที่เราสนใจหรือไม่
        if (event.target.classList.contains('summary-input')) {
            if (!hasUnsavedChanges) { // ทำแค่ครั้งแรกที่แก้
                 console.log("Change detected in summary input."); // Debug log
                 hasUnsavedChanges = true;
                 const saveBtn = document.getElementById(SAVE_CHANGES_BTN_ID);
                 if (saveBtn) {
                     saveBtn.disabled = false; // ทำให้ปุ่ม Save กดได้
                     console.log("Save button enabled."); // Debug log
                 }
            }
        }
    }

    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V16.1) ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...'; loadingErrorDiv.style.display = 'block'; /* ... styling ... */
        let fetchSuccess = false;
        try {
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' }); if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`); const jsonData = await response.json(); if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`); masterItemList = jsonData; fetchSuccess = true; loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`; /* ... styling ... */ setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000); createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error); loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ...`; /* ... styling ... */ loadingErrorDiv.style.display = 'block';
            // V16.1: ใช้ deep copy สำหรับ initial data
            shops = JSON.parse(JSON.stringify(initialShopsData));
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน (ถ้ามี)");
        } finally {
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);
            if (shops.length > 0 && !activeShopId) { activeShopId = shops[0].id; }
            else if (shops.length === 0) { activeShopId = null; }
            renderTabs(); renderTabContent();
            setupEventListeners(); // เรียก setup listeners หลัง DOM พร้อม
            console.log("--- initializeApp เสร็จสิ้น (V16.1) ---");
        }
    }

    /** V16.1: ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก */
    function setupEventListeners() {
        console.log("Setting up event listeners..."); // Debug log

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
        // คลิกแท็บร้านค้า
        shopTabsContainer?.addEventListener('click', handleTabClick);
        // คลิกปุ่มลบร้าน (X) ใน Content Area
        tabContentArea?.addEventListener('click', handleDeleteShopClick);
        // คลิกปุ่มเพิ่มรายการ (+) ใน Content Area
        tabContentArea?.addEventListener('click', handleAddItemClick);
        // กด Enter ในช่อง Item Input = เพิ่มรายการ
        tabContentArea?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && event.target.classList.contains('entry-item')) {
                 event.preventDefault(); const entryArea = event.target.closest('.item-entry-area');
                 const addButton = entryArea?.querySelector('.entry-add-btn'); addButton?.click();
             }
         });

        // --- V16: Listeners ใหม่สำหรับ Modal สรุป ---
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
         console.log("Event listeners setup complete."); // Debug log
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
