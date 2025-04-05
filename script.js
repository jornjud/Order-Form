'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    // ดึง Element ที่ต้องใช้บ่อยๆ มาเก็บไว้
    const loadingErrorDiv = document.getElementById('loading-error-message');
    const shopTabsContainer = document.getElementById('shop-tabs-container'); // V15: Container สำหรับแท็บ
    const addTabButton = document.getElementById('add-tab-btn'); // V15: ปุ่ม + เพิ่มแท็บ
    const newShopInputContainer = document.getElementById('new-shop-input-container'); // V15: Div กรอกชื่อร้านใหม่
    const newShopNameInput = document.getElementById('new-shop-name-input'); // V15: Input ชื่อร้านใหม่
    const saveNewShopButton = document.getElementById('save-new-shop-btn'); // V15: ปุ่มบันทึกร้านใหม่
    const cancelNewShopButton = document.getElementById('cancel-new-shop-btn'); // V15: ปุ่มยกเลิกร้านใหม่
    const tabContentArea = document.getElementById('tab-content-area'); // V15: พื้นที่แสดงเนื้อหาของแท็บ
    const noShopPlaceholder = document.getElementById('no-shop-placeholder'); // V15: ข้อความเมื่อไม่มีร้านค้า
    const overallSummaryContainer = document.getElementById('overall-summary-container');
    const overallSummaryButton = document.getElementById('overall-summary-btn');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const summaryTimestampElem = document.getElementById('summary-timestamp');
    const copyStatus = document.getElementById('copy-status');
    const modalCloseButton = document.getElementById('modal-close-btn');
    const copySummaryButton = document.getElementById('copy-summary-btn');
    const closeModalActionButton = document.getElementById('close-modal-action-btn');

    // --- Constants ---
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list';
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list';
    const ITEMS_JSON_PATH = 'items.json';

    // --- State Variables ---
    let masterItemList = []; // เก็บลิสต์ของทั้งหมด
    let shops = []; // V15: เก็บข้อมูลร้านค้าทั้งหมด [{ id, name, items: [...] }, ...]
    let activeShopId = null; // V15: เก็บ ID ของร้านค้าที่กำลังถูกเลือก (แท็บที่ active)

    // ข้อมูลตัวอย่าง (เผื่อโหลด JSON ไม่ได้ หรือยังไม่มีข้อมูล)
    const initialShopsData = [
        // { id: 'shop-init-1', name: 'ร้านตัวอย่าง 1', items: [] }, // เริ่มแบบไม่มีของตัวอย่าง
    ];

    // --- V15: Rendering Functions ---
    // ฟังก์ชันสำหรับวาดหน้าจอใหม่ตามข้อมูลใน State

    /** V15: วาดแถบแท็บร้านค้าใหม่ทั้งหมด */
    function renderTabs() {
        if (!shopTabsContainer || !addTabButton) return;

        // เก็บ element ที่ focus อยู่ปัจจุบัน (ถ้ามี)
        const previouslyFocusedElement = document.activeElement;

        // --- เคลียร์แท็บเก่า (ยกเว้นปุ่ม + และช่องกรอกชื่อร้านใหม่) ---
        // วนลูปหา element ที่ไม่ใช่ปุ่ม + และไม่ใช่ container กรอกชื่อร้าน แล้วลบทิ้ง
        Array.from(shopTabsContainer.children).forEach(child => {
            if (child !== addTabButton && child !== newShopInputContainer) {
                shopTabsContainer.removeChild(child);
            }
        });

        // --- สร้างแท็บร้านค้าจาก state 'shops' ---
        shops.forEach(shop => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button'; // กำหนด class
            tabButton.textContent = shop.name; // ใส่ชื่อร้าน
            tabButton.dataset.shopId = shop.id; // เก็บ shop ID ไว้ใน data attribute
            if (shop.id === activeShopId) {
                tabButton.classList.add('active'); // เพิ่ม class 'active' ถ้าเป็นแท็บที่เลือกอยู่
            }
            // ใส่ event listener ให้แต่ละแท็บ (ใช้ handleTabClick)
            tabButton.addEventListener('click', handleTabClick);
            // เอาแท็บไปต่อหน้าปุ่ม +
            shopTabsContainer.insertBefore(tabButton, addTabButton);
        });

        // คืนค่า focus ไปที่ element เดิม (ถ้าเป็นไปได้)
        if (previouslyFocusedElement && document.body.contains(previouslyFocusedElement)) {
             // ตรวจสอบว่า element ยังคงอยู่ใน DOM ก่อนที่จะ focus
             try {
                 previouslyFocusedElement.focus();
             } catch (e) {
                 // console.warn("Could not restore focus:", e);
             }
        } else if (activeShopId) {
             // ถ้าไม่มี focus เดิม แต่มี active tab ให้ลอง focus ที่ active tab
             const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`);
             activeTabButton?.focus();
        }

        // อัปเดตการแสดงผลปุ่มสรุปทั้งหมด
        updateOverallSummaryButtonVisibility();
    }

    /** V15: วาดเนื้อหาของแท็บที่ถูกเลือก */
    function renderTabContent() {
        if (!tabContentArea) return;
        tabContentArea.innerHTML = ''; // เคลียร์เนื้อหาเก่า

        // หาข้อมูลร้านค้าที่ active อยู่จาก state 'shops'
        const activeShop = shops.find(shop => shop.id === activeShopId);

        if (activeShop) { // ถ้ามีร้านค้าที่ active อยู่
            // --- สร้าง Header (ชื่อร้าน + ปุ่มลบ) ---
            const headerDiv = document.createElement('div');
            headerDiv.className = 'shop-header'; // ใช้ class เดิม

            // V15: แสดงชื่อร้านเป็น text ธรรมดา (อาจจะเพิ่มปุ่มแก้ไขทีหลัง)
            const shopNameDisplay = document.createElement('span');
            shopNameDisplay.className = 'shop-name-display';
            shopNameDisplay.textContent = activeShop.name;

            const deleteShopBtn = document.createElement('button');
            deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
            deleteShopBtn.className = 'delete-shop-btn';
            deleteShopBtn.title = "ลบร้านค้านี้";
            deleteShopBtn.type = "button";
            deleteShopBtn.dataset.shopId = activeShop.id; // ใส่ shopId ไว้ที่ปุ่มเลย เพื่อง่ายต่อการลบ
            // เพิ่ม listener ให้ปุ่มลบ (ใช้ handleDeleteShopClick)
            deleteShopBtn.addEventListener('click', handleDeleteShopClick);

            headerDiv.appendChild(shopNameDisplay);
            headerDiv.appendChild(deleteShopBtn);
            tabContentArea.appendChild(headerDiv);

            // --- สร้าง Item Entry Area ---
            const entryArea = createItemEntryArea(activeShop.id);
            tabContentArea.appendChild(entryArea);

             // --- สร้าง Action Buttons (ปุ่มสรุป) ---
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'shop-actions';

            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = '📋 สรุปรายการร้านนี้';
            summarizeBtn.className = 'action-button summarize-btn';
            summarizeBtn.type = "button";
            // ส่ง activeShopId ไปให้ showSummary
            summarizeBtn.addEventListener('click', () => showSummary(activeShopId));

            buttonsDiv.appendChild(summarizeBtn);
            tabContentArea.appendChild(buttonsDiv);

            // ซ่อน placeholder ถ้ามีร้านค้าแสดงอยู่
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'none';

        } else {
            // ถ้าไม่มีร้านค้า active (เช่น เพิ่งเปิดหน้าเว็บ หรือลบร้านสุดท้ายไป)
            // ให้แสดง placeholder
            if(noShopPlaceholder) noShopPlaceholder.style.display = 'block';
        }
    }

    // --- V15: UI Creation Functions (เหมือนเดิม แต่บางอันอาจไม่ถูกเรียกใช้โดยตรง) ---

    /** สร้าง/อัปเดต Global Datalist */
    function createOrUpdateDatalist(listId, optionsArray) {
        // (โค้ดเหมือนเดิมจาก V14)
        let datalist = document.getElementById(listId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist);
            datalist = document.getElementById(listId);
            if (!datalist) { console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`); return; }
        }
        datalist.innerHTML = '';
        if (!Array.isArray(optionsArray)) { console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`); return; }
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));
        sortedOptions.forEach(optionValue => {
            if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                try {
                    const option = document.createElement('option'); option.value = optionValue; datalist.appendChild(option);
                } catch (e) { console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e); }
            }
        });
    }

    /** สร้าง Input สำหรับหน่วยนับ (ใช้ใน Entry Area) */
    function createUnitInputEntry(selectedUnit = '') {
        // (โค้ดเหมือนเดิมจาก V14)
        const input = document.createElement('input');
        input.type = 'text'; input.placeholder = 'หน่วย'; input.className = 'entry-unit';
        input.value = selectedUnit; input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); return input;
    }

    /** สร้าง Input สำหรับรายการสินค้า (ใช้ใน Entry Area) */
    function createItemInputEntry(selectedItem = '') {
        // (โค้ดเหมือนเดิมจาก V14)
        const input = document.createElement('input');
        input.type = 'text'; input.placeholder = 'ใส่รายการ กด + เพื่อเพิ่ม...'; input.className = 'entry-item';
        input.value = selectedItem; input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); return input;
    }

    /** V15: สร้างส่วนกรอกข้อมูล (Entry Area) สำหรับแต่ละร้าน */
    function createItemEntryArea(shopId) {
        // (โค้ดเหมือนเดิมจาก V14)
        const entryDiv = document.createElement('div');
        entryDiv.className = 'item-entry-area'; entryDiv.dataset.shopId = shopId;
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number'; quantityInput.placeholder = 'จำนวน'; quantityInput.min = "0";
        quantityInput.step = "any"; quantityInput.className = 'entry-quantity';
        const unitInput = createUnitInputEntry(); const itemInput = createItemInputEntry();
        const addBtn = document.createElement('button');
        addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        addBtn.className = 'action-button entry-add-btn'; addBtn.title = "เพิ่มรายการนี้"; addBtn.type = "button";
        const statusDiv = document.createElement('div'); statusDiv.className = 'entry-status';
        entryDiv.appendChild(quantityInput); entryDiv.appendChild(unitInput); entryDiv.appendChild(itemInput);
        entryDiv.appendChild(addBtn); entryDiv.appendChild(statusDiv);
        return entryDiv;
    }

    // --- V15: Event Handlers ---
    // ฟังก์ชันที่ทำงานเมื่อเกิด Event ต่างๆ (คลิกปุ่ม, เปลี่ยนค่า input)

    /** V15: จัดการการคลิกแท็บร้านค้า */
    function handleTabClick(event) {
        const clickedTab = event.target.closest('.tab-button'); // หา element แท็บที่ถูกคลิก
        if (!clickedTab || clickedTab.classList.contains('active')) {
            return; // ถ้าไม่ได้คลิกแท็บ หรือคลิกแท็บที่ active อยู่แล้ว ก็ไม่ต้องทำอะไร
        }
        const newActiveShopId = clickedTab.dataset.shopId; // ดึง shopId จาก data attribute
        if (newActiveShopId) {
            activeShopId = newActiveShopId; // อัปเดต state activeShopId
            renderTabs(); // วาดแท็บใหม่ (เพื่อเปลี่ยน active class)
            renderTabContent(); // วาดเนื้อหาของแท็บที่เลือกใหม่
        }
    }

    /** V15: จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() {
        if (newShopInputContainer && addTabButton && newShopNameInput) {
            newShopInputContainer.classList.remove('hidden'); // แสดงช่องกรอกชื่อ
            addTabButton.classList.add('hidden'); // ซ่อนปุ่ม +
            newShopNameInput.value = ''; // เคลียร์ค่าเก่า
            newShopNameInput.focus(); // ย้าย cursor ไปที่ช่องกรอก
        }
    }

    /** V15: จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() {
         if (newShopInputContainer && addTabButton) {
            newShopInputContainer.classList.add('hidden'); // ซ่อนช่องกรอก
            addTabButton.classList.remove('hidden'); // แสดงปุ่ม + กลับมา
            newShopNameInput.value = ''; // เคลียร์ค่า
        }
    }

    /** V15: จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() {
        if (!newShopNameInput) return;
        const newName = newShopNameInput.value.trim(); // ดึงชื่อร้านใหม่

        if (!newName) {
            alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ"); // แจ้งเตือนถ้าไม่ได้ใส่ชื่อ
            newShopNameInput.focus();
            return;
        }
        // เช็คชื่อร้านซ้ำ (เผื่อไว้)
        if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) {
             alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`);
             newShopNameInput.focus();
             newShopNameInput.select();
             return;
        }

        // สร้างข้อมูลร้านใหม่
        const newShopId = `shop-${Date.now()}`;
        const newShopData = { id: newShopId, name: newName, items: [] };
        shops.push(newShopData); // เพิ่มเข้า state 'shops'

        activeShopId = newShopId; // ตั้งให้ร้านใหม่เป็น active เลย

        renderTabs(); // วาดแท็บใหม่
        renderTabContent(); // วาดเนื้อหาร้านใหม่

        handleCancelNewShop(); // ซ่อนช่องกรอก กลับไปแสดงปุ่ม +

        // ถ้ามีการบันทึกข้อมูลลง localStorage ก็ต้องเรียกใช้ตรงนี้ด้วย
    }

     /** V15: จัดการการกดปุ่มลบร้าน (X) */
    function handleDeleteShopClick(event) {
        const deleteButton = event.target.closest('.delete-shop-btn');
        if (!deleteButton) return;

        const shopIdToDelete = deleteButton.dataset.shopId;
        const shopToDelete = shops.find(s => s.id === shopIdToDelete);

        if (!shopToDelete) return;

        // ถามยืนยัน
        if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) {
            const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete);
            if (indexToDelete > -1) {
                // ลบร้านออกจาก state
                shops.splice(indexToDelete, 1);

                // --- หาแท็บที่จะ active ต่อไป ---
                if (activeShopId === shopIdToDelete) { // ถ้าลบแท็บที่ active อยู่
                    if (shops.length === 0) { // ถ้าไม่เหลือร้านค้าแล้ว
                        activeShopId = null;
                    } else if (indexToDelete >= shops.length) { // ถ้าลบอันสุดท้าย
                        // ให้ active อันก่อนหน้าอันสุดท้าย (คืออันสุดท้ายอันใหม่)
                        activeShopId = shops[shops.length - 1].id;
                    } else { // ถ้าลบอันกลางๆ หรืออันแรก
                        // ให้ active อันถัดไป (ที่ตำแหน่งเดิมของอันที่เพิ่งลบไป)
                        activeShopId = shops[indexToDelete].id;
                    }
                }
                // ถ้าลบแท็บอื่นที่ไม่ใช่ active ก็ไม่ต้องเปลี่ยน activeShopId

                // วาดหน้าจอใหม่
                renderTabs();
                renderTabContent();

                // ถ้ามีการบันทึกข้อมูลลง localStorage ก็ต้องเรียกใช้ตรงนี้ด้วย
            }
        }
    }


    /** V15: จัดการการกดปุ่ม "เพิ่มรายการ" (+) ใน Entry Area (ใช้ Event Delegation) */
    function handleAddItemClick(event) {
        const addButton = event.target.closest('.entry-add-btn');
        if (!addButton) return; // ไม่ใช่ปุ่มเพิ่ม

        const entryArea = addButton.closest('.item-entry-area');
        if (!entryArea) return; // หา entry area ไม่เจอ

        // V15: ดึง shopId จาก entry area หรือจาก activeShopId ก็ได้
        const shopId = entryArea.dataset.shopId; // หรือใช้ activeShopId
        const quantityInput = entryArea.querySelector('.entry-quantity');
        const unitInput = entryArea.querySelector('.entry-unit');
        const itemInput = entryArea.querySelector('.entry-item');

        if (!shopId || !quantityInput || !unitInput || !itemInput) {
            console.error("หา elements ใน entry area ไม่เจอ ร้าน:", shopId);
            return;
        }

        const quantity = quantityInput.value.trim();
        const unit = unitInput.value.trim();
        const itemName = itemInput.value.trim();
        const itemNameLower = itemName.toLowerCase();

        // --- Validation ---
        if (!itemName) {
            showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true);
            itemInput.focus(); return;
        }
        if (!quantity) {
            showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true);
            quantityInput.focus(); return;
        }

        // --- Find shop in state ---
        const shop = shops.find(s => s.id === shopId);
        if (!shop) {
            console.error("ไม่เจอร้านใน state ID:", shopId);
            showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true); return;
        }

        // --- Duplicate Check ---
        const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicate) {
            showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true);
            itemInput.focus(); itemInput.select(); return; // ไม่เคลียร์ช่อง
        }

        // --- Add item to state ---
        shop.items.push({ quantity: quantity, unit: unit || '?', item: itemName });

        // --- Success Feedback & Clear Inputs ---
        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false);
        quantityInput.value = ''; unitInput.value = ''; itemInput.value = '';
        itemInput.focus(); // Focus กลับไปที่ช่อง item รอใส่ชิ้นต่อไป

        // TODO: Save state if implementing persistence
        // console.log("Updated shop state:", shop);
    }

    /** V15: แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) {
        // (โค้ดเหมือนเดิมจาก V14)
        const statusDiv = entryAreaElement.querySelector('.entry-status');
        if (!statusDiv) return;
        statusDiv.textContent = message;
        statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none'; statusDiv.textContent = ''; statusDiv.className = 'entry-status';
        }, 2500);
    }

    // --- Core Logic Functions (ส่วนใหญ่เหมือนเดิม แต่ getOrderData อ่านจาก State) ---

    /** อัปเดตการแสดงผลปุ่มสรุปทั้งหมด */
    function updateOverallSummaryButtonVisibility() {
        // (โค้ดเหมือนเดิมจาก V14)
        const shopSectionsExist = shops.length > 0;
        if (overallSummaryContainer) {
            overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none';
        }
    }

    /** V15: ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป */
    function getOrderData(shopId = null) {
        // (โค้ดเหมือนเดิมจาก V14)
        if (shopId) {
            const shop = shops.find(s => s.id === shopId);
            if (shop) { return [{ shopName: shop.name, items: [...shop.items] }]; }
            else { return []; }
        } else {
             return shops
                .filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')
                .map(shop => ({ shopName: shop.name, items: [...shop.items] }));
        }
    }

    /** จัดรูปแบบวันที่เวลาไทย */
    function formatThaiTimestamp() {
        // (โค้ดเหมือนเดิมจาก V12)
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
        try {
            const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' });
            const buddhistYear = yearFormatter.format(now);
            const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear);
            const formattedTime = now.toLocaleTimeString('th-TH', timeOptions);
            return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`;
        } catch (e) { console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }

    /** Escape HTML special characters */
    function escapeHtml(unsafe) {
        // (โค้ดเหมือนเดิม)
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    /** V15: แสดง Modal สรุป (โค้ดส่วนสร้าง HTML เหมือน V12/V14) */
    function showSummary(shopId = null) {
        // (โค้ดส่วนใหญ่เหมือนเดิมจาก V12/V14)
        if (!summaryModal || !summaryContent || !summaryTimestampElem) { console.error("หา Element ของ Modal ไม่เจอ!"); return; }
        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp;
        const data = getOrderData(shopId); // ดึงข้อมูลจาก State
        summaryContent.innerHTML = '';
        if (copyStatus) copyStatus.style.display = 'none';
        const dataToShow = data;
        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            dataToShow.forEach(shopData => {
                const shopNameEscaped = escapeHtml(shopData.shopName);
                modalHtml += `<h3 style="font-size: 1.1rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.25rem; color: #1f2937; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb;">🛒 ${shopNameEscaped}</h3>`;
                if (shopId === null) {
                    const timePart = overallTimestamp.split(' เวลา ')[1] || '';
                    const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ','');
                    modalHtml += `<p class="shop-timestamp-print" style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; text-align: left;">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                }
                modalHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 0.9rem;"><thead style="background-color: #f8f9fa;"><tr><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; width: 15%; font-weight: 600;">จำนวน</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">หน่วย</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 45%; font-weight: 600;">รายการ</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">หมายเหตุ/ราคา</th></tr></thead><tbody>`;
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach(item => {
                        modalHtml += `<tr><td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: top;">${escapeHtml(item.quantity)}</td><td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;">${escapeHtml(item.unit)}</td><td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; word-wrap: break-word;">${escapeHtml(item.item)}</td><td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;"></td></tr>`;
                    });
                } else {
                     modalHtml += `<tr><td colspan="4" style="text-align: center; font-style: italic; color: grey; border: 1px solid #ddd; padding: 6px 8px;">(ไม่มีรายการ)</td></tr>`;
                }
                modalHtml += `</tbody><tfoot style="font-weight: bold; background-color: #f8f9fa;"><tr><td colspan="3" style="border: 1px solid #ddd; border-right: none; padding: 6px 10px 6px 8px; text-align: right;">รวมราคา:</td><td style="border: 1px solid #ddd; border-left: none; padding: 6px 8px; min-height: 1.5em;"></td></tr></tfoot></table>`;
            });
            summaryContent.innerHTML = modalHtml;
        }
        summaryModal.style.display = 'block';
    }

    /** ปิด Modal */
    function closeModal() {
        // (โค้ดเหมือนเดิม)
        if (summaryModal) summaryModal.style.display = 'none';
    }

    /** คัดลอกสรุป (โค้ดเหมือนเดิมจาก V14) */
    function copySummaryToClipboard() {
        // (โค้ดเหมือนเดิมจาก V14)
        if (!summaryContent) return; let textToCopy = ""; const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n"; const dataToCopy = getOrderData();
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

    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V15) ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...';
        loadingErrorDiv.style.display = 'block'; /* ... styling ... */

        let fetchSuccess = false;
        try {
            // --- โหลด Master Item List ---
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`);
            const jsonData = await response.json();
            if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`);
            masterItemList = jsonData;
            fetchSuccess = true;
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`; /* ... styling ... */
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000);
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ...`; /* ... styling ... */
            loadingErrorDiv.style.display = 'block';
            // V15: ถ้าโหลดไม่ได้ ให้ใช้ข้อมูลตัวอย่าง (ถ้ามี) หรือเริ่มจากว่างเปล่า
            shops = JSON.parse(JSON.stringify(initialShopsData)); // ใช้ข้อมูลตัวอย่าง
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน (ถ้ามี)");
        } finally {
            // --- Setup อื่นๆ ---
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS); // สร้าง datalist หน่วยเสมอ

            // V15: กำหนด active shop แรก (ถ้ามี)
            if (shops.length > 0 && !activeShopId) {
                activeShopId = shops[0].id;
            } else if (shops.length === 0) {
                activeShopId = null; // ไม่มีร้านค้า ก็ไม่มี active
            }

            // --- Render หน้าจอครั้งแรก ---
            renderTabs(); // วาดแท็บ
            renderTabContent(); // วาดเนื้อหาของแท็บแรก (หรือ placeholder)

            // --- ตั้งค่า Event Listeners ---
            setupEventListeners();

            console.log("--- initializeApp เสร็จสิ้น (V15) ---");
        }
    }

    /** V15: ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก */
    function setupEventListeners() {
        // ปุ่ม + เพิ่มแท็บ/ร้าน
        addTabButton?.addEventListener('click', handleAddTabClick);
        // ปุ่มยกเลิกการเพิ่มร้าน
        cancelNewShopButton?.addEventListener('click', handleCancelNewShop);
        // ปุ่มบันทึกร้านใหม่
        saveNewShopButton?.addEventListener('click', handleSaveNewShop);
        // กด Enter ในช่องชื่อร้านใหม่ = บันทึก
        newShopNameInput?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSaveNewShop();
            }
        });

        // ปุ่ม สรุปทั้งหมด (ลอย)
        overallSummaryButton?.addEventListener('click', () => showSummary()); // สรุปทุกร้าน
        // ปุ่ม X ปิด Modal
        modalCloseButton?.addEventListener('click', closeModal);
        // ปุ่ม Copy ใน Modal
        copySummaryButton?.addEventListener('click', copySummaryToClipboard);
        // ปุ่ม ปิด ใน Modal
        closeModalActionButton?.addEventListener('click', closeModal);
        // คลิกนอก Modal แล้วปิด
        window.addEventListener('click', (event) => {
            if (event.target == summaryModal) closeModal();
        });

        // V15: ใช้ Event Delegation สำหรับปุ่ม "เพิ่มรายการ" (+) ใน Content Area
        tabContentArea?.addEventListener('click', handleAddItemClick);

        // V15: Event Delegation สำหรับปุ่มลบร้าน (X) ใน Content Area (ถ้าไม่ได้ใส่ใน renderTabContent)
        // tabContentArea?.addEventListener('click', handleDeleteShopClick); // ถ้า listener ถูกใส่ใน renderTabContent แล้ว ไม่ต้องใส่ซ้ำตรงนี้

        // V15: กด Enter ในช่อง Item Input = เพิ่มรายการ
        tabContentArea?.addEventListener('keypress', (event) => {
             if (event.key === 'Enter' && event.target.classList.contains('entry-item')) {
                 event.preventDefault(); // ป้องกันพฤติกรรม Enter ปกติ
                 // หาปุ่ม Add ที่อยู่ใกล้ๆ input นี้แล้ว simulate การคลิก
                 const entryArea = event.target.closest('.item-entry-area');
                 const addButton = entryArea?.querySelector('.entry-add-btn');
                 addButton?.click(); // เรียก handleAddItemClick ผ่านการคลิก
             }
         });
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
