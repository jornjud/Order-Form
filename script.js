'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    const shopsContainer = document.getElementById('shops-container');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const summaryTimestampElem = document.getElementById('summary-timestamp'); // *** เพิ่ม: Element สำหรับ Timestamp ***
    const copyStatus = document.getElementById('copy-status');
    const overallSummaryContainer = document.getElementById('overall-summary-container');
    const loadingErrorDiv = document.getElementById('loading-error-message');
    const addShopButton = document.getElementById('add-shop-btn');
    const overallSummaryButton = document.getElementById('overall-summary-btn');
    const modalCloseButton = document.getElementById('modal-close-btn');
    const copySummaryButton = document.getElementById('copy-summary-btn');
    const printSummaryButton = document.getElementById('print-summary-btn'); // *** เพิ่ม: ปุ่ม Print/PDF ***
    const closeModalActionButton = document.getElementById('close-modal-action-btn');
    const printArea = document.getElementById('print-area'); // *** เพิ่ม: พื้นที่สำหรับพิมพ์ ***

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

    /**
     * สร้าง/อัปเดต Global Datalist อย่างปลอดภัย
     * @param {string} listId - ID ของ datalist
     * @param {string[]} optionsArray - Array ของค่า options
     */
    function createOrUpdateDatalist(listId, optionsArray) {
        let datalist = document.getElementById(listId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist);
            datalist = document.getElementById(listId); // ดึงมาอีกครั้งหลัง append
            if (!datalist) {
                 console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`);
                 return;
            }
        }
        datalist.innerHTML = ''; // เคลียร์ options เก่า
        if (!Array.isArray(optionsArray)) {
            console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`);
            return;
        }
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));
        sortedOptions.forEach(optionValue => {
            if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                try {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    datalist.appendChild(option);
                } catch (e) {
                    console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e);
                }
            }
        });
        // console.log(`สร้าง/อัปเดต datalist ID: ${listId} เสร็จสิ้น`);
    }

    /**
     * สร้าง Input สำหรับหน่วยนับ (ใช้ Datalist)
     * @param {string} selectedUnit
     * @returns {HTMLInputElement}
     */
    function createUnitInput(selectedUnit = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'หน่วย';
        input.className = 'unit-input';
        input.value = selectedUnit;
        input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID);
        return input;
    }

    /**
     * สร้าง Input สำหรับรายการสินค้า (ใช้ Global Datalist)
     * @param {string} selectedItem
     * @returns {HTMLInputElement}
     */
    function createItemInput(selectedItem = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ค้นหา/เลือกรายการ...';
        input.className = 'item-input';
        input.value = selectedItem;
        input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID);
        return input;
    }

    /**
     * ตรวจสอบรายการซ้ำ (เมื่อ blur จากช่อง item)
     * @param {Event} event
     */
    function handleItemInputBlur(event) {
        const currentInput = event.target;
        const currentItemName = currentInput.value.trim().toLowerCase();
        const itemRow = currentInput.closest('.item-row');
        const itemsListDiv = currentInput.closest('.items-list');
        if (!currentItemName || !itemRow || !itemsListDiv) return;

        const allItemInputs = itemsListDiv.querySelectorAll('.item-input');
        let duplicateCount = 0;
        allItemInputs.forEach(input => {
            if (input.value.trim().toLowerCase() === currentItemName) {
                duplicateCount++;
            }
        });
        itemRow.style.backgroundColor = ''; // ลบ highlight เก่า
        itemRow.style.outline = '';
        if (duplicateCount > 1) {
            console.warn(`ตรวจเจอรายการซ้ำ: "${currentInput.value.trim()}"`);
            alert(`⚠️ เฮ้ยเพื่อน! รายการ "${currentInput.value.trim()}" มันมีอยู่แล้วในร้านนี้นะ เช็คดีๆ!`);
            itemRow.style.backgroundColor = '#fffbeb';
            itemRow.style.outline = '2px solid #facc15';
        }
    }

    /**
     * สร้างแถวรายการสินค้า 1 แถว
     * @param {string} shopId
     * @param {object} itemData
     * @returns {HTMLDivElement}
     */
    function createItemRow(shopId, itemData = { quantity: '', unit: '', item: '' }) {
        const div = document.createElement('div');
        div.className = 'item-row';
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number'; quantityInput.placeholder = 'จำนวน'; quantityInput.value = itemData.quantity;
        quantityInput.min = "0"; quantityInput.step = "any"; quantityInput.className = 'quantity-input';
        const unitInput = createUnitInput(itemData.unit);
        const itemInput = createItemInput(itemData.item);
        itemInput.addEventListener('blur', handleItemInputBlur); // ตรวจซ้ำ
        const removeBtnContainer = document.createElement('div');
        removeBtnContainer.className = 'remove-btn-container';
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        removeBtn.className = 'remove-btn'; removeBtn.title = "ลบรายการนี้"; removeBtn.type = "button";
        removeBtn.addEventListener('click', () => div.remove());
        removeBtnContainer.appendChild(removeBtn);
        div.appendChild(quantityInput); div.appendChild(unitInput); div.appendChild(itemInput); div.appendChild(removeBtnContainer);
        return div;
    }

    /**
     * สร้างส่วน UI ของร้านค้า 1 ร้าน
     * @param {object} shop
     * @returns {HTMLDivElement | null}
     */
    function createShopSection(shop) {
        if (!shop || typeof shop !== 'object' || !shop.id || !shop.name) { return null; }
        const section = document.createElement('div');
        section.id = shop.id; section.className = 'shop-section';
        const headerDiv = document.createElement('div'); headerDiv.className = 'shop-header';
        const shopNameInput = document.createElement('input');
        shopNameInput.type = 'text'; shopNameInput.value = shop.name; shopNameInput.className = 'shop-name-input';
        shopNameInput.placeholder = "ใส่ชื่อร้านค้า...";
        shopNameInput.addEventListener('change', (e) => {
             const currentShop = shops.find(s => s.id === shop.id);
             if (currentShop) currentShop.name = e.target.value; /* TODO: Save */
        });
         const deleteShopBtn = document.createElement('button');
         deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
         deleteShopBtn.className = 'delete-shop-btn'; deleteShopBtn.title = "ลบร้านค้านี้"; deleteShopBtn.type = "button";
         deleteShopBtn.addEventListener('click', () => {
             if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopNameInput.value}" จริงดิ?`)) {
                section.remove(); shops = shops.filter(s => s.id !== shop.id);
                updateOverallSummaryButtonVisibility(); /* TODO: Save */
             }
         });
        headerDiv.appendChild(shopNameInput); headerDiv.appendChild(deleteShopBtn); section.appendChild(headerDiv);
        const itemsDiv = document.createElement('div'); itemsDiv.className = 'items-list';
        if (shop.items && Array.isArray(shop.items)) {
            shop.items.forEach(item => { if (item && typeof item === 'object') itemsDiv.appendChild(createItemRow(shop.id, item)); });
        }
        section.appendChild(itemsDiv);
        const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'shop-actions';
        const addItemBtn = document.createElement('button');
        addItemBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg> เพิ่มรายการ`;
        addItemBtn.className = 'action-button add-item-btn'; addItemBtn.type = "button";
        addItemBtn.addEventListener('click', () => {
            const newItemRow = createItemRow(shop.id); itemsDiv.appendChild(newItemRow);
             newItemRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
             setTimeout(() => { const qtyInput = newItemRow.querySelector('.quantity-input'); if(qtyInput) qtyInput.focus(); }, 300);
        });
        const summarizeBtn = document.createElement('button');
        summarizeBtn.textContent = '📋 สรุปรายการร้านนี้'; summarizeBtn.className = 'action-button summarize-btn'; summarizeBtn.type = "button";
        summarizeBtn.addEventListener('click', () => showSummary(shop.id));
        buttonsDiv.appendChild(addItemBtn); buttonsDiv.appendChild(summarizeBtn); section.appendChild(buttonsDiv);
        return section;
    }

    // --- Core Logic Functions ---

    /**
     * แสดงผลร้านค้าทั้งหมด
     */
    function renderShops() {
        if (!shopsContainer) return;
        shopsContainer.innerHTML = '';
        if (!shops || shops.length === 0) {
            shopsContainer.innerHTML = '<p style="text-align: center; color: grey; margin: 1rem 0;">ยังไม่มีร้านค้า กดปุ่ม "เพิ่มร้านค้าใหม่" เลยเพื่อน!</p>';
        } else {
            shops.forEach(shop => { const shopSection = createShopSection(shop); if (shopSection) shopsContainer.appendChild(shopSection); });
        }
        updateOverallSummaryButtonVisibility();
    }

     /**
      * อัปเดตการแสดงผลปุ่มสรุปทั้งหมด
      */
     function updateOverallSummaryButtonVisibility() {
         const shopSectionsExist = shopsContainer?.querySelector('.shop-section') !== null;
         if (overallSummaryContainer) overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none';
     }

    /**
     * เพิ่มร้านค้าใหม่
     */
    function addShop() {
        const newShopId = `shop-${Date.now()}`;
        const newShopData = { id: newShopId, name: 'ร้านค้าใหม่ (คลิกแก้ชื่อ)', items: [] };
        shops.push(newShopData);
        const newShopSection = createShopSection(newShopData);
        if (newShopSection && shopsContainer) {
            const placeholder = shopsContainer.querySelector('p');
            if (placeholder && placeholder.textContent.includes("ยังไม่มีร้านค้า")) placeholder.remove();
            shopsContainer.appendChild(newShopSection);
             newShopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
             setTimeout(() => { const nameInput = newShopSection.querySelector('.shop-name-input'); if (nameInput) { nameInput.focus(); nameInput.select(); } }, 300);
            updateOverallSummaryButtonVisibility();
            // TODO: Save data
        }
    }

    /**
     * เก็บข้อมูลจากฟอร์ม
     * @param {string | null} shopId
     * @returns {object[]}
     */
    function getOrderData(shopId = null) {
        const orderData = [];
        const shopSections = shopId ? (shopsContainer ? [shopsContainer.querySelector(`#${shopId}`)] : []) : (shopsContainer ? shopsContainer.querySelectorAll('.shop-section') : []);
        shopSections.forEach(section => {
            if (!section || !section.id) return;
            const shopNameInput = section.querySelector('.shop-name-input');
            const shopName = shopNameInput ? shopNameInput.value.trim() : 'ร้านค้าไม่มีชื่อ';
            const items = [];
            section.querySelectorAll('.item-row').forEach(row => {
                const quantityInput = row.querySelector('.quantity-input');
                const unitInput = row.querySelector('.unit-input');
                const itemInput = row.querySelector('.item-input');
                if (quantityInput && unitInput && itemInput) {
                    const quantity = quantityInput.value.trim();
                    const unit = unitInput.value.trim();
                    const itemName = itemInput.value.trim();
                    if (itemName && quantity) items.push({ quantity, unit: unit || '?', item: itemName });
                }
            });
            if (shopId !== null || items.length > 0 || (shopId === null && shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')) {
                 orderData.push({ shopName, items });
             }
        });
        return orderData;
    }

    /**
     * จัดรูปแบบวันที่เวลาเป็นภาษาไทย
     * @returns {string} ข้อความวันที่เวลาที่จัดรูปแบบแล้ว
     */
    function formatThaiTimestamp() {
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
        // ใช้ Intl.DateTimeFormat เพื่อให้ได้ พ.ศ. ชัวร์ๆ
        const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' });
        const buddhistYear = yearFormatter.format(now); // จะได้ "พ.ศ. XXXX"
        const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear); // แทนที่ปี ค.ศ. ด้วย พ.ศ.
        const formattedTime = now.toLocaleTimeString('th-TH', timeOptions);
        return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`;
    }

    /**
     * แสดง Modal สรุปรายการ (พร้อม Timestamp)
     * @param {string | null} shopId
     */
    function showSummary(shopId = null) {
        if (!summaryModal || !summaryContent || !summaryTimestampElem) {
             console.error("หา Element ของ Modal ไม่เจอ!");
             return;
        }

        const currentTimestamp = formatThaiTimestamp(); // *** สร้าง Timestamp ***
        summaryTimestampElem.textContent = currentTimestamp; // *** แสดง Timestamp ***

        const data = getOrderData(shopId);
        summaryContent.innerHTML = '';
        if (copyStatus) copyStatus.style.display = 'none';

        const dataToShow = shopId === null ? data.filter(shop => shop.items.length > 0 || shop.shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)') : data;

        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; padding: 1rem 0;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            dataToShow.forEach(shopData => {
                const shopDiv = document.createElement('div');
                const title = document.createElement('h3');
                title.textContent = `🛒 ${shopData.shopName}`;
                shopDiv.appendChild(title);
                if (shopData.items && shopData.items.length > 0) {
                    const list = document.createElement('ul');
                    shopData.items.forEach(item => {
                        const listItem = document.createElement('li');
                        listItem.textContent = `${item.quantity} ${item.unit} : ${item.item}`;
                        list.appendChild(listItem);
                    });
                    shopDiv.appendChild(list);
                } else {
                     const noItemText = document.createElement('p');
                     noItemText.textContent = "(ร้านนี้ยังไม่มีรายการสั่งซื้อนะจ๊ะ)";
                     shopDiv.appendChild(noItemText);
                }
                summaryContent.appendChild(shopDiv);
            });
        }
        summaryModal.style.display = 'block';
    }

    /**
     * ปิด Modal
     */
    function closeModal() {
        if (summaryModal) summaryModal.style.display = 'none';
    }

    /**
     * คัดลอกสรุปรายการไปยัง Clipboard (พร้อม Timestamp)
     */
    function copySummaryToClipboard() {
        if (!summaryContent) return;
        let textToCopy = "";
        const currentTimestamp = formatThaiTimestamp(); // *** สร้าง Timestamp ***
        textToCopy += currentTimestamp + "\n\n"; // *** เพิ่ม Timestamp ด้านบน ***

        const shopDivs = summaryContent.querySelectorAll(':scope > div');
         if(shopDivs.length === 0 && summaryContent.querySelector('p')) {
             textToCopy += summaryContent.querySelector('p').textContent;
         } else {
             shopDivs.forEach((shopDiv, index) => {
                const titleElement = shopDiv.querySelector('h3');
                if (!titleElement) return;
                const titleText = titleElement.textContent;
                const shopNameOnly = titleText.replace(/🛒\s*/, '');
                textToCopy += `--- ${shopNameOnly} ---\n`;
                const listItems = shopDiv.querySelectorAll('ul li');
                if (listItems.length > 0) {
                    listItems.forEach(li => { textToCopy += li.textContent + "\n"; });
                } else {
                     const noItemText = shopDiv.querySelector('p');
                     if (noItemText) { textToCopy += noItemText.textContent + "\n"; }
                }
                if (index < shopDivs.length - 1) { textToCopy += "\n"; }
            });
         }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy.trim())
                .then(() => {
                    if (copyStatus) {
                        copyStatus.style.display = 'block';
                        setTimeout(() => { copyStatus.style.display = 'none'; }, 2500);
                    }
                })
                .catch(err => { console.error('Clipboard copy failed:', err); alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊'); });
        } else { alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ'); }
    }

    /**
     * *** เพิ่ม: ฟังก์ชันเตรียมข้อมูลและสั่งพิมพ์ ***
     */
    function printSummary() {
        console.log(">> printSummary: เริ่มเตรียมพิมพ์...");
        if (!printArea) {
            console.error("หา #print-area ไม่เจอ!");
            alert("เกิดข้อผิดพลาด: ไม่พบพื้นที่สำหรับพิมพ์");
            return;
        }

        const currentTimestamp = formatThaiTimestamp();
        const data = getOrderData(); // ดึงข้อมูลทั้งหมด

        // กรองร้านค้าที่มีรายการ หรือตั้งชื่อแล้ว
        const dataToPrint = data.filter(shop => shop.items.length > 0 || shop.shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)');

        if (dataToPrint.length === 0) {
            alert("ไม่มีรายการให้พิมพ์นะเพื่อน!");
            return;
        }

        let printHTML = `<p class="print-timestamp">${currentTimestamp}</p>`; // ใส่ timestamp ด้านบน

        dataToPrint.forEach(shopData => {
            printHTML += `<h3 class="print-shop-name">${shopData.shopName}</h3>`; // ใส่ชื่อร้าน

            if (shopData.items && shopData.items.length > 0) {
                printHTML += `
                    <table>
                        <thead>
                            <tr>
                                <th>จำนวน</th>
                                <th>หน่วย</th>
                                <th>รายการ</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                shopData.items.forEach(item => {
                    // ทำความสะอาดข้อมูลก่อนใส่ใน HTML (ป้องกัน HTML Injection เบื้องต้น)
                    const qty = escapeHtml(item.quantity);
                    const unit = escapeHtml(item.unit);
                    const name = escapeHtml(item.item);
                    printHTML += `<tr><td>${qty}</td><td>${unit}</td><td>${name}</td></tr>`;
                });
                printHTML += `
                        </tbody>
                    </table>
                `;
            } else {
                printHTML += `<p style="margin-left: 1em;">(ไม่มีรายการ)</p>`;
            }
        });

        printArea.innerHTML = printHTML; // ใส่ HTML ที่สร้างลงใน #print-area
        console.log(">> printSummary: สร้าง HTML สำหรับพิมพ์เสร็จสิ้น, กำลังเรียก window.print()...");

        // สั่งพิมพ์ (เบราว์เซอร์จะใช้ @media print จาก CSS)
        window.print();

        // อาจจะเคลียร์ #print-area หลังพิมพ์เสร็จ (ถ้าต้องการ)
        // setTimeout(() => { printArea.innerHTML = ''; }, 1000);
    }

    /**
     * *** เพิ่ม: ฟังก์ชันเล็กๆ สำหรับ Escape HTML ป้องกัน XSS เบื้องต้น ***
     * @param {string} unsafe - ข้อความที่อาจมี HTML
     * @returns {string} ข้อความที่ผ่านการ escape
     */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }


    // --- Initialization Function ---

    /**
     * ฟังก์ชันหลัก เริ่มต้นแอป
     */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V8) ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }

        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...';
        loadingErrorDiv.style.display = 'block';
        loadingErrorDiv.style.backgroundColor = '#fffbeb'; loadingErrorDiv.style.color = '#b45309'; loadingErrorDiv.style.borderColor = '#fef3c7';

        let fetchSuccess = false;
        try {
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`);
            const jsonData = await response.json();
            if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`);
            masterItemList = jsonData;
            fetchSuccess = true;
            console.log(`โหลดรายการของ ${masterItemList.length} รายการ สำเร็จ`);
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`;
            loadingErrorDiv.style.backgroundColor = '#f0fdf4'; loadingErrorDiv.style.color = '#15803d'; loadingErrorDiv.style.borderColor = '#dcfce7';
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000);
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList); // สร้าง datalist ของ
        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ลองเช็คไฟล์ items.json หรือเปิดผ่าน Live Server ดูนะ`;
            loadingErrorDiv.style.backgroundColor = '#fee2e2'; loadingErrorDiv.style.color = '#991b1b'; loadingErrorDiv.style.borderColor = '#fecaca';
            loadingErrorDiv.style.display = 'block';
            shops = initialShopsData; // ใช้ข้อมูลเริ่มต้นถ้าโหลดไม่ได้
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน");
        } finally {
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS); // สร้าง datalist หน่วยนับเสมอ
            // ถ้า fetch สำเร็จ แต่ shops ยังว่าง (อาจจะโหลดจาก localStorage ทีหลัง)
            if (fetchSuccess && shops.length === 0) {
                 // อาจจะโหลดข้อมูลร้านจาก localStorage ตรงนี้
                 // หรือถ้าไม่มี ก็ใช้ initial data หรือปล่อยว่าง
                 console.log("โหลดรายการของสำเร็จ แต่ยังไม่มีข้อมูลร้านค้า (อาจจะโหลดทีหลัง หรือใช้ค่าเริ่มต้น)");
                 // shops = initialShopsData; // ถ้าอยากให้มีร้านเริ่มต้นเสมอ
            }
            renderShops(); // แสดงผลร้านค้า
            console.log("--- initializeApp เสร็จสิ้น ---");
        }
    }

    // --- ตั้งค่า Event Listeners หลัก ---
    addShopButton?.addEventListener('click', addShop);
    overallSummaryButton?.addEventListener('click', () => showSummary());
    modalCloseButton?.addEventListener('click', closeModal);
    copySummaryButton?.addEventListener('click', copySummaryToClipboard);
    printSummaryButton?.addEventListener('click', printSummary); // *** เพิ่ม: Listener ปุ่ม Print ***
    closeModalActionButton?.addEventListener('click', closeModal);

    // ปิด Modal ถ้าคลิกนอกพื้นที่
    window.addEventListener('click', (event) => { if (event.target == summaryModal) closeModal(); });

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
