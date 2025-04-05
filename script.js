'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    const shopsContainer = document.getElementById('shops-container');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
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
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list'; // *** ID ของ datalist รายการ ***
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list'; // *** ID ของ datalist หน่วยนับ ***
    const ITEMS_JSON_PATH = 'items.json';

    // --- State Variables ---
    let masterItemList = [];
    let shops = [];
    const initialShopsData = [ // ข้อมูลเริ่มต้น (เผื่อโหลด JSON ไม่ได้)
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
        console.log(`กำลังสร้าง/อัปเดต datalist ID: ${listId} ด้วย ${optionsArray.length} options`);
        let datalist = document.getElementById(listId);

        // ถ้าไม่มี datalist เดิม, สร้างใหม่
        if (!datalist) {
            console.log(`สร้าง <datalist> ใหม่ ID: ${listId}`);
            datalist = document.createElement('datalist');
            datalist.id = listId;
            // ต้อง append เข้าไปใน body *ก่อน* ที่จะเพิ่ม option ได้ในบางกรณี
            document.body.appendChild(datalist);
            // ดึงมาอีกครั้งหลัง append เพื่อให้แน่ใจว่าได้ element ที่อยู่ใน DOM แล้ว
            datalist = document.getElementById(listId);
            if (!datalist) {
                 console.error(`!!! ชิบหายละ สร้าง datalist ID: ${listId} แล้วแต่หากลับมาไม่เจอ!`);
                 return; // ออกจากฟังก์ชันถ้าสร้างแล้วหาไม่เจอ
            }
        }

        // เคลียร์ options เก่าทิ้ง
        datalist.innerHTML = '';
        // console.log(`เคลียร์ options เก่าใน datalist ID: ${listId}`);

        // ตรวจสอบว่า optionsArray เป็น array จริงๆ
        if (!Array.isArray(optionsArray)) {
            console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`, optionsArray);
            return;
        }

        // เพิ่ม options ใหม่ (เรียงตามตัวอักษร)
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));
        let optionCount = 0;
        sortedOptions.forEach(optionValue => {
            // ตรวจสอบค่า option ก่อนเพิ่ม
            if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                try {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    // option.textContent = optionValue; // อาจจะไม่จำเป็นสำหรับ datalist
                    datalist.appendChild(option);
                    optionCount++;
                } catch (e) {
                    console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e);
                }
            } else {
                 console.warn(`ข้าม option ที่ไม่ใช่ string หรือเป็นค่าว่างใน datalist ID: ${listId}`, optionValue);
            }
        });
        console.log(`เพิ่ม options ใหม่ ${optionCount} รายการ ลงใน datalist ID: ${listId} สำเร็จ`);
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
        // *** ตรวจสอบให้แน่ใจว่าใส่ list attribute ถูกต้อง ***
        input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID);
        // console.log(`สร้าง Unit Input, ตั้ง list attribute เป็น: ${GLOBAL_UNITS_DATALIST_ID}`);
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
         // *** ตรวจสอบให้แน่ใจว่าใส่ list attribute ถูกต้อง ***
        input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID);
        // console.log(`สร้าง Item Input, ตั้ง list attribute เป็น: ${GLOBAL_ITEMS_DATALIST_ID}`);
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
        quantityInput.type = 'number';
        quantityInput.placeholder = 'จำนวน';
        quantityInput.value = itemData.quantity;
        quantityInput.min = "0";
        quantityInput.step = "any";
        quantityInput.className = 'quantity-input';

        const unitInput = createUnitInput(itemData.unit); // ใช้ Unit Input
        const itemInput = createItemInput(itemData.item); // ใช้ Item Input

        // เพิ่ม Event Listener ตรวจของซ้ำตอน blur
        itemInput.addEventListener('blur', handleItemInputBlur);

        const removeBtnContainer = document.createElement('div');
        removeBtnContainer.className = 'remove-btn-container';
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        removeBtn.className = 'remove-btn';
        removeBtn.title = "ลบรายการนี้";
        removeBtn.type = "button";
        removeBtn.addEventListener('click', () => div.remove());
        removeBtnContainer.appendChild(removeBtn);

        div.appendChild(quantityInput);
        div.appendChild(unitInput);
        div.appendChild(itemInput);
        div.appendChild(removeBtnContainer);

        return div;
    }

    /**
     * สร้างส่วน UI ของร้านค้า 1 ร้าน
     * @param {object} shop
     * @returns {HTMLDivElement | null}
     */
    function createShopSection(shop) {
        if (!shop || typeof shop !== 'object' || !shop.id || !shop.name) {
            console.error("ข้อมูลร้านค้าไม่ถูกต้อง:", shop);
            return null;
        }

        const section = document.createElement('div');
        section.id = shop.id;
        section.className = 'shop-section';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'shop-header';
        const shopNameInput = document.createElement('input');
        shopNameInput.type = 'text';
        shopNameInput.value = shop.name;
        shopNameInput.className = 'shop-name-input';
        shopNameInput.placeholder = "ใส่ชื่อร้านค้า...";
        shopNameInput.addEventListener('change', (e) => {
             const currentShop = shops.find(s => s.id === shop.id);
             if (currentShop) currentShop.name = e.target.value;
             // TODO: Save data
        });
         const deleteShopBtn = document.createElement('button');
         deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
         deleteShopBtn.className = 'delete-shop-btn';
         deleteShopBtn.title = "ลบร้านค้านี้";
         deleteShopBtn.type = "button";
         deleteShopBtn.addEventListener('click', () => {
             if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopNameInput.value}" จริงดิ?`)) {
                section.remove();
                shops = shops.filter(s => s.id !== shop.id);
                updateOverallSummaryButtonVisibility();
                // TODO: Save data
             }
         });
        headerDiv.appendChild(shopNameInput);
        headerDiv.appendChild(deleteShopBtn);
        section.appendChild(headerDiv);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'items-list';
        if (shop.items && Array.isArray(shop.items)) {
            shop.items.forEach(item => {
                if (item && typeof item === 'object') {
                     itemsDiv.appendChild(createItemRow(shop.id, item));
                }
            });
        }
        section.appendChild(itemsDiv);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'shop-actions';
        const addItemBtn = document.createElement('button');
        addItemBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg> เพิ่มรายการ`;
        addItemBtn.className = 'action-button add-item-btn';
        addItemBtn.type = "button";
        addItemBtn.addEventListener('click', () => {
            const newItemRow = createItemRow(shop.id);
            itemsDiv.appendChild(newItemRow);
             newItemRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
             setTimeout(() => {
                 const qtyInput = newItemRow.querySelector('.quantity-input');
                 if(qtyInput) qtyInput.focus();
             }, 300);
        });
        const summarizeBtn = document.createElement('button');
        summarizeBtn.textContent = '📋 สรุปรายการร้านนี้';
        summarizeBtn.className = 'action-button summarize-btn';
        summarizeBtn.type = "button";
        summarizeBtn.addEventListener('click', () => showSummary(shop.id));
        buttonsDiv.appendChild(addItemBtn);
        buttonsDiv.appendChild(summarizeBtn);
        section.appendChild(buttonsDiv);

        return section;
    }

    // --- Core Logic Functions ---

    /**
     * แสดงผลร้านค้าทั้งหมด
     */
    function renderShops() {
        console.log(">> renderShops: เริ่มแสดงผลร้านค้า...");
        if (!shopsContainer) return;
        shopsContainer.innerHTML = '';

        if (!shops || shops.length === 0) {
            shopsContainer.innerHTML = '<p style="text-align: center; color: grey; margin: 1rem 0;">ยังไม่มีร้านค้า กดปุ่ม "เพิ่มร้านค้าใหม่" เลยเพื่อน!</p>';
        } else {
            shops.forEach(shop => {
                const shopSection = createShopSection(shop);
                if (shopSection) {
                    shopsContainer.appendChild(shopSection);
                }
            });
        }
        updateOverallSummaryButtonVisibility();
        console.log(">> renderShops: แสดงผลร้านค้าเสร็จสิ้น");
    }

     /**
      * อัปเดตการแสดงผลปุ่มสรุปทั้งหมด
      */
     function updateOverallSummaryButtonVisibility() {
         const shopSectionsExist = shopsContainer && shopsContainer.querySelector('.shop-section') !== null;
         const shouldShow = shopSectionsExist;
         if (overallSummaryContainer) {
            overallSummaryContainer.style.display = shouldShow ? 'block' : 'none';
         }
     }

    /**
     * เพิ่มร้านค้าใหม่
     */
    function addShop() {
        console.log(">> addShop: กำลังเพิ่มร้านค้าใหม่...");
        const newShopId = `shop-${Date.now()}`;
        const newShopData = { id: newShopId, name: 'ร้านค้าใหม่ (คลิกแก้ชื่อ)', items: [] };
        shops.push(newShopData);

        const newShopSection = createShopSection(newShopData);
        if (newShopSection && shopsContainer) {
            const placeholder = shopsContainer.querySelector('p');
            if (placeholder && placeholder.textContent.includes("ยังไม่มีร้านค้า")) {
                placeholder.remove();
            }
            shopsContainer.appendChild(newShopSection);
             newShopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
             setTimeout(() => {
                 const nameInput = newShopSection.querySelector('.shop-name-input');
                 if (nameInput) { nameInput.focus(); nameInput.select(); }
             }, 300);
            updateOverallSummaryButtonVisibility();
            console.log(`>> addShop: เพิ่มร้านค้า ID: ${newShopId} เรียบร้อย`);
            // TODO: Save data
        } else {
            console.error(">> addShop: ไม่สามารถเพิ่มร้านค้าใหม่ลง UI ได้");
        }
    }

    /**
     * เก็บข้อมูลจากฟอร์ม
     * @param {string | null} shopId
     * @returns {object[]}
     */
    function getOrderData(shopId = null) {
        const orderData = [];
        const shopSections = shopId
            ? (shopsContainer ? [shopsContainer.querySelector(`#${shopId}`)] : [])
            : (shopsContainer ? shopsContainer.querySelectorAll('.shop-section') : []);

        shopSections.forEach(section => {
            if (!section || !section.id) return;
            const shopNameInput = section.querySelector('.shop-name-input');
            const shopName = shopNameInput ? shopNameInput.value.trim() : 'ร้านค้าไม่มีชื่อ';
            const items = [];
            section.querySelectorAll('.item-row').forEach(row => {
                const quantityInput = row.querySelector('.quantity-input');
                const unitInput = row.querySelector('.unit-input'); // อ่านจาก unit-input
                const itemInput = row.querySelector('.item-input');
                if (quantityInput && unitInput && itemInput) {
                    const quantity = quantityInput.value.trim();
                    const unit = unitInput.value.trim();
                    const itemName = itemInput.value.trim();
                    if (itemName && quantity) {
                        items.push({ quantity: quantity, unit: unit || '?', item: itemName });
                    }
                }
            });
            if (shopId !== null || items.length > 0 || (shopId === null && shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')) {
                 orderData.push({ shopName: shopName, items: items });
             }
        });
        return orderData;
    }

    /**
     * แสดง Modal สรุป
     * @param {string | null} shopId
     */
    function showSummary(shopId = null) {
        if (!summaryModal || !summaryContent) return;
        const data = getOrderData(shopId);
        summaryContent.innerHTML = '';
        if (copyStatus) copyStatus.style.display = 'none';

        const dataToShow = shopId === null
            ? data.filter(shop => shop.items.length > 0 || shop.shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')
            : data;

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
     * คัดลอกสรุป
     */
    function copySummaryToClipboard() {
        if (!summaryContent) return;
        let textToCopy = "";
        const shopDivs = summaryContent.querySelectorAll(':scope > div');

         if(shopDivs.length === 0 && summaryContent.querySelector('p')) {
             textToCopy = summaryContent.querySelector('p').textContent;
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
                .catch(err => {
                    console.error('Clipboard copy failed:', err);
                    alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊');
                });
        } else {
            alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ');
        }
    }

    // --- Initialization Function ---

    /**
     * ฟังก์ชันหลัก เริ่มต้นแอป
     */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp ---");
        if (!loadingErrorDiv) {
            console.error("หา #loading-error-message ไม่เจอ!");
            alert("เกิดข้อผิดพลาด: ไม่พบ element loading-error-message"); // แจ้งเตือนถ้า element สำคัญหาย
            return; // ออกถ้า element หลักหาย
        }

        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...';
        loadingErrorDiv.style.display = 'block';
        loadingErrorDiv.style.backgroundColor = '#fffbeb'; // Reset style
        loadingErrorDiv.style.color = '#b45309';
        loadingErrorDiv.style.borderColor = '#fef3c7';

        let fetchSuccess = false; // ตัวแปรเช็คว่า fetch สำเร็จไหม

        try {
            console.log(`กำลัง fetch: ${ITEMS_JSON_PATH}`);
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' }); // ลองไม่ใช้ cache
            console.log(`Fetch status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`);
            }

            const jsonData = await response.json();
            console.log(`Parse JSON สำเร็จ`);

            if (!Array.isArray(jsonData)) {
                throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`);
            }

            masterItemList = jsonData; // เก็บข้อมูล
            fetchSuccess = true; // ตั้งค่าว่า fetch สำเร็จ
            console.log(`โหลดรายการของ ${masterItemList.length} รายการ สำเร็จ`);

            // --- โหลดสำเร็จ ---
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`;
            loadingErrorDiv.style.backgroundColor = '#f0fdf4';
            loadingErrorDiv.style.color = '#15803d';
            loadingErrorDiv.style.borderColor = '#dcfce7';
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000); // ซ่อนช้าลงหน่อย

            // สร้าง datalist รายการของ
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);

        } catch (error) {
            // --- เกิดข้อผิดพลาด ---
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ลองเช็คไฟล์ items.json หรือเปิดผ่าน Live Server ดูนะ`;
            loadingErrorDiv.style.backgroundColor = '#fee2e2';
            loadingErrorDiv.style.color = '#991b1b';
            loadingErrorDiv.style.borderColor = '#fecaca';
            loadingErrorDiv.style.display = 'block'; // แสดงค้างไว้

            // ใช้ข้อมูลร้านค้าเริ่มต้นเมื่อโหลด JSON ไม่ได้
            shops = initialShopsData;
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน");

        } finally {
            // --- ทำงานส่วนนี้เสมอ ---
            console.log("สร้าง datalist หน่วยนับ...");
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS); // สร้าง datalist หน่วยนับเสมอ

            // ถ้า fetch ไม่สำเร็จ และ shops ยังว่างอยู่ ให้ใช้ initial data
            if (!fetchSuccess && shops.length === 0) {
                 shops = initialShopsData;
                 console.log("ใช้ข้อมูลร้านค้าเริ่มต้น (ใน finally)");
            } else if (fetchSuccess && shops.length === 0) {
                 // ถ้า fetch สำเร็จ แต่ยังไม่มีร้านค้า (อาจจะโหลดข้อมูลร้านจากที่อื่น)
                 // ตรงนี้อาจจะปล่อยให้ว่าง หรือใช้ initial data ก็ได้
                 console.log("โหลดรายการของสำเร็จ แต่ยังไม่มีข้อมูลร้านค้า");
                 // shops = initialShopsData; // หรือปล่อยว่างรอ user เพิ่มเอง
            }

            console.log("กำลังจะ renderShops...");
            renderShops(); // แสดงผลร้านค้า (อาจจะเป็นข้อมูลเริ่มต้น)
            console.log("--- initializeApp เสร็จสิ้น ---");
        }
    }

    // --- ตั้งค่า Event Listeners หลัก ---
    // ใช้ Optional Chaining (?) เพื่อป้องกัน error ถ้า element ไม่มีอยู่จริง
    addShopButton?.addEventListener('click', addShop);
    overallSummaryButton?.addEventListener('click', () => showSummary());
    modalCloseButton?.addEventListener('click', closeModal);
    copySummaryButton?.addEventListener('click', copySummaryToClipboard);
    closeModalActionButton?.addEventListener('click', closeModal);

    // ปิด Modal ถ้าคลิกนอกพื้นที่
    window.addEventListener('click', (event) => {
        if (event.target == summaryModal) {
            closeModal();
        }
    });

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
