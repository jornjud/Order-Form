'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    const shopsContainer = document.getElementById('shops-container');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const summaryTimestampElem = document.getElementById('summary-timestamp');
    const copyStatus = document.getElementById('copy-status');
    const overallSummaryContainer = document.getElementById('overall-summary-container');
    const loadingErrorDiv = document.getElementById('loading-error-message');
    const addShopButton = document.getElementById('add-shop-btn');
    const overallSummaryButton = document.getElementById('overall-summary-btn');
    const modalCloseButton = document.getElementById('modal-close-btn');
    const copySummaryButton = document.getElementById('copy-summary-btn');
    const closeModalActionButton = document.getElementById('close-modal-action-btn');

    // --- Constants ---
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list';
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list';
    const ITEMS_JSON_PATH = 'items.json';

    // --- State Variables ---
    let masterItemList = [];
    let shops = [];
    const initialShopsData = [
        { id: 'shop-init-1', name: 'ร้านตัวอย่าง 1 (ถ้าโหลด JSON ไม่ได้)', items: [ { quantity: '1', unit: 'กก.', item: 'ตัวอย่าง 1' } ] },
        { id: 'shop-init-2', name: 'ร้านตัวอย่าง 2', items: [ { quantity: '2', unit: 'ชิ้น', item: 'ตัวอย่าง 2' } ] }
    ];

    // --- UI Creation Functions ---

    /** สร้าง/อัปเดต Global Datalist */
    function createOrUpdateDatalist(listId, optionsArray) {
        let datalist = document.getElementById(listId);
        if (!datalist) { datalist = document.createElement('datalist'); datalist.id = listId; document.body.appendChild(datalist); datalist = document.getElementById(listId); if (!datalist) { console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`); return; } }
        datalist.innerHTML = ''; if (!Array.isArray(optionsArray)) { console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`); return; }
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));
        sortedOptions.forEach(optionValue => { if (typeof optionValue === 'string' && optionValue.trim() !== '') { try { const option = document.createElement('option'); option.value = optionValue; datalist.appendChild(option); } catch (e) { console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e); } } });
    }

    /** สร้าง Input สำหรับหน่วยนับ */
    function createUnitInput(selectedUnit = '') {
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'หน่วย'; input.className = 'unit-input'; input.value = selectedUnit; input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); return input;
    }

    /** สร้าง Input สำหรับรายการสินค้า */
    function createItemInput(selectedItem = '') {
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'ค้นหา/เลือกรายการ...'; input.className = 'item-input'; input.value = selectedItem; input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); return input;
    }

    /** ตรวจสอบรายการซ้ำ */
    function handleItemInputBlur(event) {
        const currentInput = event.target; const currentItemName = currentInput.value.trim().toLowerCase();
        const itemRow = currentInput.closest('.item-row'); const itemsListDiv = currentInput.closest('.items-list');
        if (!currentItemName || !itemRow || !itemsListDiv) return;
        const allItemInputs = itemsListDiv.querySelectorAll('.item-input'); let duplicateCount = 0;
        allItemInputs.forEach(input => { if (input.value.trim().toLowerCase() === currentItemName) duplicateCount++; });
        itemRow.style.backgroundColor = ''; itemRow.style.outline = '';
        if (duplicateCount > 1) { alert(`⚠️ เฮ้ยเพื่อน! รายการ "${currentInput.value.trim()}" มันมีอยู่แล้วในร้านนี้นะ เช็คดีๆ!`); itemRow.style.backgroundColor = '#fffbeb'; itemRow.style.outline = '2px solid #facc15'; }
    }

    /** สร้างแถวรายการสินค้า */
    function createItemRow(shopId, itemData = { quantity: '', unit: '', item: '' }) {
        const div = document.createElement('div'); div.className = 'item-row';
        const quantityInput = document.createElement('input'); quantityInput.type = 'number'; quantityInput.placeholder = 'จำนวน'; quantityInput.value = itemData.quantity; quantityInput.min = "0"; quantityInput.step = "any"; quantityInput.className = 'quantity-input';
        const unitInput = createUnitInput(itemData.unit); const itemInput = createItemInput(itemData.item);
        itemInput.addEventListener('blur', handleItemInputBlur);
        const removeBtnContainer = document.createElement('div'); removeBtnContainer.className = 'remove-btn-container';
        const removeBtn = document.createElement('button'); removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        removeBtn.className = 'remove-btn'; removeBtn.title = "ลบรายการนี้"; removeBtn.type = "button"; removeBtn.addEventListener('click', () => div.remove()); removeBtnContainer.appendChild(removeBtn);
        div.appendChild(quantityInput); div.appendChild(unitInput); div.appendChild(itemInput); div.appendChild(removeBtnContainer);
        return div;
    }

    /** สร้างส่วน UI ของร้านค้า */
    function createShopSection(shop) {
        if (!shop || typeof shop !== 'object' || !shop.id || !shop.name) { return null; }
        const section = document.createElement('div'); section.id = shop.id; section.className = 'shop-section';
        const headerDiv = document.createElement('div'); headerDiv.className = 'shop-header';
        const shopNameInput = document.createElement('input'); shopNameInput.type = 'text'; shopNameInput.value = shop.name; shopNameInput.className = 'shop-name-input'; shopNameInput.placeholder = "ใส่ชื่อร้านค้า...";
        shopNameInput.addEventListener('change', (e) => { const currentShop = shops.find(s => s.id === shop.id); if (currentShop) currentShop.name = e.target.value; /* TODO: Save */ });
        const deleteShopBtn = document.createElement('button'); deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
        deleteShopBtn.className = 'delete-shop-btn'; deleteShopBtn.title = "ลบร้านค้านี้"; deleteShopBtn.type = "button";
        deleteShopBtn.addEventListener('click', () => { if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopNameInput.value}" จริงดิ?`)) { section.remove(); shops = shops.filter(s => s.id !== shop.id); updateOverallSummaryButtonVisibility(); /* TODO: Save */ } });
        headerDiv.appendChild(shopNameInput); headerDiv.appendChild(deleteShopBtn); section.appendChild(headerDiv);
        const itemsDiv = document.createElement('div'); itemsDiv.className = 'items-list';
        if (shop.items && Array.isArray(shop.items)) { shop.items.forEach(item => { if (item && typeof item === 'object') itemsDiv.appendChild(createItemRow(shop.id, item)); }); }
        section.appendChild(itemsDiv);
        const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'shop-actions';
        const addItemBtn = document.createElement('button'); addItemBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg> เพิ่มรายการ`;
        addItemBtn.className = 'action-button add-item-btn'; addItemBtn.type = "button";
        addItemBtn.addEventListener('click', () => { const newItemRow = createItemRow(shop.id); itemsDiv.appendChild(newItemRow); newItemRow.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => { const qtyInput = newItemRow.querySelector('.quantity-input'); if(qtyInput) qtyInput.focus(); }, 300); });
        const summarizeBtn = document.createElement('button'); summarizeBtn.textContent = '📋 สรุปรายการร้านนี้'; summarizeBtn.className = 'action-button summarize-btn'; summarizeBtn.type = "button";
        summarizeBtn.addEventListener('click', () => showSummary(shop.id));
        buttonsDiv.appendChild(addItemBtn); buttonsDiv.appendChild(summarizeBtn); section.appendChild(buttonsDiv);
        return section;
    }

    // --- Core Logic Functions ---

    /** แสดงผลร้านค้าทั้งหมด */
    function renderShops() {
        if (!shopsContainer) return; shopsContainer.innerHTML = '';
        if (!shops || shops.length === 0) { shopsContainer.innerHTML = '<p style="text-align: center; color: grey; margin: 1rem 0;">ยังไม่มีร้านค้า กดปุ่ม "เพิ่มร้านค้าใหม่" เลยเพื่อน!</p>'; }
        else { shops.forEach(shop => { const shopSection = createShopSection(shop); if (shopSection) shopsContainer.appendChild(shopSection); }); }
        updateOverallSummaryButtonVisibility();
    }

    /** อัปเดตการแสดงผลปุ่มสรุปทั้งหมด */
    function updateOverallSummaryButtonVisibility() {
        const shopSectionsExist = shopsContainer?.querySelector('.shop-section') !== null;
        if (overallSummaryContainer) overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none';
    }

    /** เพิ่มร้านค้าใหม่ */
    function addShop() {
        const newShopId = `shop-${Date.now()}`; const newShopData = { id: newShopId, name: 'ร้านค้าใหม่ (คลิกแก้ชื่อ)', items: [] };
        shops.push(newShopData); const newShopSection = createShopSection(newShopData);
        if (newShopSection && shopsContainer) {
            const placeholder = shopsContainer.querySelector('p'); if (placeholder && placeholder.textContent.includes("ยังไม่มีร้านค้า")) placeholder.remove();
            shopsContainer.appendChild(newShopSection); newShopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => { const nameInput = newShopSection.querySelector('.shop-name-input'); if (nameInput) { nameInput.focus(); nameInput.select(); } }, 300);
            updateOverallSummaryButtonVisibility(); /* TODO: Save */
        }
    }

    /** เก็บข้อมูลจากฟอร์ม */
    function getOrderData(shopId = null) {
        const orderData = []; const shopSections = shopId ? (shopsContainer ? [shopsContainer.querySelector(`#${shopId}`)] : []) : (shopsContainer ? shopsContainer.querySelectorAll('.shop-section') : []);
        shopSections.forEach(section => {
            if (!section || !section.id) return; const shopNameInput = section.querySelector('.shop-name-input'); const shopName = shopNameInput ? shopNameInput.value.trim() : 'ร้านค้าไม่มีชื่อ'; const items = [];
            section.querySelectorAll('.item-row').forEach(row => {
                const quantityInput = row.querySelector('.quantity-input'); const unitInput = row.querySelector('.unit-input'); const itemInput = row.querySelector('.item-input');
                if (quantityInput && unitInput && itemInput) { const quantity = quantityInput.value.trim(); const unit = unitInput.value.trim(); const itemName = itemInput.value.trim(); if (itemName && quantity) items.push({ quantity, unit: unit || '?', item: itemName }); }
            });
            if (shopId !== null || items.length > 0 || (shopId === null && shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')) { orderData.push({ shopName, items }); }
        });
        return orderData;
    }

    /** จัดรูปแบบวันที่เวลาไทย */
    function formatThaiTimestamp() {
        const now = new Date(); const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' }; const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
        try { const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' }); const buddhistYear = yearFormatter.format(now); const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); const formattedTime = now.toLocaleTimeString('th-TH', timeOptions); return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`; }
        catch (e) { console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e); return `สรุป ณ ${now.toLocaleString('th-TH')}`; }
    }

    /** Escape HTML */
    function escapeHtml(unsafe) { if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    /**
     * *** V11: แสดง Modal สรุป (สร้างตาราง + แถวรวมราคา) ***
     * @param {string | null} shopId
     */
    function showSummary(shopId = null) {
        if (!summaryModal || !summaryContent || !summaryTimestampElem) { console.error("หา Element ของ Modal ไม่เจอ!"); return; }

        const currentTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = currentTimestamp; // แสดง Timestamp

        const data = getOrderData(shopId);
        summaryContent.innerHTML = ''; // เคลียร์เนื้อหาเก่า
        if (copyStatus) copyStatus.style.display = 'none';

        const dataToShow = shopId === null ? data.filter(shop => shop.items.length > 0 || shop.shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)') : data;

        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p>ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            dataToShow.forEach(shopData => {
                const shopNameEscaped = escapeHtml(shopData.shopName);
                modalHtml += `<h3>🛒 ${shopNameEscaped}</h3>`; // ชื่อร้าน

                // เริ่มสร้างตาราง
                modalHtml += `
                    <table>
                        <thead>
                            <tr>
                                <th>จำนวน</th>
                                <th>หน่วย</th>
                                <th>รายการ</th>
                                <th>หมายเหตุ/ราคา</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                // เพิ่มแถวข้อมูลสินค้า (ถ้ามี)
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach(item => {
                        modalHtml += `
                            <tr>
                                <td>${escapeHtml(item.quantity)}</td>
                                <td>${escapeHtml(item.unit)}</td>
                                <td>${escapeHtml(item.item)}</td>
                                <td></td> </tr>
                        `;
                    });
                } else {
                    // ถ้าไม่มีรายการ ให้แสดงแถวบอกว่าไม่มีรายการ
                     modalHtml += `<tr><td colspan="4" style="text-align: center; font-style: italic; color: grey;">(ไม่มีรายการ)</td></tr>`;
                }

                // *** V11: เพิ่มแถวรวมราคา (<tfoot>) ***
                modalHtml += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3">รวมราคา:</td>
                                <td></td> </tr>
                        </tfoot>
                    </table>
                `;
            });
            // ใส่ HTML ที่สร้างเสร็จแล้วลงใน summaryContent
            summaryContent.innerHTML = modalHtml;
        }
        summaryModal.style.display = 'block'; // แสดง Modal
    }

    /** ปิด Modal */
    function closeModal() { if (summaryModal) summaryModal.style.display = 'none'; }

    /** คัดลอกสรุป (เหมือนเดิม V10) */
    function copySummaryToClipboard() {
        if (!summaryContent) return; let textToCopy = "";
        const currentTimestamp = formatThaiTimestamp(); textToCopy += currentTimestamp + "\n\n";
        const data = getOrderData(); const dataToCopy = data.filter(shop => shop.items.length > 0 || shop.shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)');
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
            navigator.clipboard.writeText(textToCopy.trim())
                .then(() => { if (copyStatus) { copyStatus.style.display = 'block'; setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); } })
                .catch(err => { console.error('Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); });
        } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }

    // V11: ไม่มีฟังก์ชัน printSummary แล้ว

    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V11) ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...'; loadingErrorDiv.style.display = 'block';
        loadingErrorDiv.style.backgroundColor = '#fffbeb'; loadingErrorDiv.style.color = '#b45309'; loadingErrorDiv.style.borderColor = '#fef3c7';
        let fetchSuccess = false;
        try {
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`);
            const jsonData = await response.json();
            if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`);
            masterItemList = jsonData; fetchSuccess = true;
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`;
            loadingErrorDiv.style.backgroundColor = '#f0fdf4'; loadingErrorDiv.style.color = '#15803d'; loadingErrorDiv.style.borderColor = '#dcfce7';
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000);
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) เช็คไฟล์ items.json หรือเปิดผ่าน Live Server ดูนะ`;
            loadingErrorDiv.style.backgroundColor = '#fee2e2'; loadingErrorDiv.style.color = '#991b1b'; loadingErrorDiv.style.borderColor = '#fecaca';
            loadingErrorDiv.style.display = 'block';
            shops = initialShopsData; console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน");
        } finally {
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);
            if (!fetchSuccess && shops.length === 0) { shops = initialShopsData; }
            renderShops();
            console.log("--- initializeApp เสร็จสิ้น (V11) ---");
        }
    }

    // --- ตั้งค่า Event Listeners หลัก (เอา listener ของปุ่ม print ออก) ---
    addShopButton?.addEventListener('click', addShop);
    overallSummaryButton?.addEventListener('click', () => showSummary());
    modalCloseButton?.addEventListener('click', closeModal);
    copySummaryButton?.addEventListener('click', copySummaryToClipboard);
    // printSummaryButton?.addEventListener('click', printSummary); // V11: ลบบรรทัดนี้
    closeModalActionButton?.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target == summaryModal) closeModal(); });

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
