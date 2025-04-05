// Wrap everything in a DOMContentLoaded listener to ensure HTML is ready
document.addEventListener('DOMContentLoaded', () => {

    // --- ค่าคงที่และตัวแปร Global ---
    const units = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    // --- Element References --- (ดึง element มาเก็บไว้ในตัวแปร)
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

    // --- Datalist IDs ---
    const globalItemsDatalistId = 'global-items-list';
    const globalUnitsDatalistId = 'global-units-list';

    // --- Data Variables ---
    let masterItemList = []; // รายการของทั้งหมด (จาก JSON)
    let shops = [ // โครงสร้างร้านค้าเริ่มต้น (อาจจะโหลด/บันทึกจาก localStorage ในอนาคต)
        // ใส่ข้อมูลตัวอย่างเริ่มต้นไว้ เผื่อกรณีโหลด JSON ไม่ได้
        { id: 'shop-init-1', name: 'ร้านตัวอย่าง 1 (ถ้าโหลด JSON ไม่ได้)', items: [ { quantity: '1', unit: 'กก.', item: 'ตัวอย่าง 1' } ] },
        { id: 'shop-init-2', name: 'ร้านตัวอย่าง 2', items: [ { quantity: '2', unit: 'ชิ้น', item: 'ตัวอย่าง 2' } ] }
    ];

    // --- ฟังก์ชันสร้าง UI ---

    /**
     * สร้าง Global Datalist สำหรับรายการสินค้า
     * @param {string[]} items - Array ของชื่อสินค้า
     */
    function createGlobalDatalist(items) {
        let datalist = document.getElementById(globalItemsDatalistId);
        if (!datalist) {
            console.log("สร้าง <datalist> สำหรับรายการของ...");
            datalist = document.createElement('datalist');
            datalist.id = globalItemsDatalistId;
            document.body.appendChild(datalist);
        } else {
            console.log("เคลียร์ <datalist> รายการของเก่า...");
            datalist.innerHTML = ''; // เคลียร์ option เก่า
        }
        // เรียงตามตัวอักษรก่อนเพิ่ม
        const sortedItems = [...items].sort((a, b) => a.localeCompare(b, 'th'));
        console.log(`กำลังเพิ่ม ${sortedItems.length} รายการของลงใน datalist...`);
        sortedItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            datalist.appendChild(option);
        });
        console.log("สร้าง datalist รายการของเสร็จสิ้น!");
    }

    /**
     * สร้าง Global Datalist สำหรับหน่วยนับ
     */
    function createGlobalUnitDatalist() {
        let datalist = document.getElementById(globalUnitsDatalistId);
        if (!datalist) {
            console.log("สร้าง <datalist> สำหรับหน่วยนับ...");
            datalist = document.createElement('datalist');
            datalist.id = globalUnitsDatalistId;
            document.body.appendChild(datalist);
        } else {
            console.log("เคลียร์ <datalist> หน่วยนับเก่า...");
            datalist.innerHTML = ''; // เคลียร์ option เก่า
        }
        console.log(`กำลังเพิ่ม ${units.length} หน่วยนับลงใน datalist...`);
        units.forEach(unit => { // ใช้ array 'units' ที่กำหนดไว้ด้านบน
            const option = document.createElement('option');
            option.value = unit;
            datalist.appendChild(option);
        });
        console.log("สร้าง datalist หน่วยนับเสร็จสิ้น!");
    }

    /**
     * สร้าง Input สำหรับหน่วยนับ (ใช้ Datalist)
     * @param {string} selectedUnit - หน่วยนับที่เลือกไว้ (ถ้ามี)
     * @returns {HTMLInputElement} Element input สำหรับหน่วยนับ
     */
    function createUnitInput(selectedUnit = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'หน่วย';
        input.className = 'unit-input'; // ใช้ class จาก CSS
        input.value = selectedUnit;
        input.setAttribute('list', globalUnitsDatalistId); // *** สำคัญ: ลิงก์กับ Datalist หน่วยนับ ***
        return input;
    }

    /**
     * สร้าง Input สำหรับรายการสินค้า (ใช้ Global Datalist)
     * @param {string} selectedItem - รายการที่เลือกไว้ (ถ้ามี)
     * @returns {HTMLInputElement} Element input สำหรับรายการสินค้า
     */
    function createItemInput(selectedItem = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ค้นหา/เลือกรายการ...';
        input.className = 'item-input';
        input.value = selectedItem;
        input.setAttribute('list', globalItemsDatalistId); // *** สำคัญ: ลิงก์กับ Datalist รายการ ***
        return input;
    }

    /**
     * ตรวจสอบรายการซ้ำภายในร้านค้าเดียวกัน (เมื่อผู้ใช้ออกจากช่องรายการ)
     * @param {Event} event - Event object จาก onblur
     */
    function checkDuplicateItem(event) {
        const currentInput = event.target;
        const currentItemName = currentInput.value.trim().toLowerCase();
        const itemRow = currentInput.closest('.item-row');
        const itemsListDiv = currentInput.closest('.items-list');

        if (!currentItemName || !itemRow || !itemsListDiv) return;

        const allItemInputs = itemsListDiv.querySelectorAll('.item-input');
        let duplicateCount = 0; // นับจำนวนที่ซ้ำ (รวมตัวเองด้วย)

        allItemInputs.forEach(input => {
            if (input.value.trim().toLowerCase() === currentItemName) {
                duplicateCount++;
            }
        });

        // ลบ highlight เก่าก่อนเสมอ
        itemRow.style.backgroundColor = '';
        itemRow.style.outline = '';

        if (duplicateCount > 1) { // ถ้าเจอมากกว่า 1 แสดงว่าซ้ำกับรายการอื่น
            console.warn(`ตรวจเจอรายการซ้ำ: "${currentInput.value.trim()}"`);
            alert(`⚠️ เฮ้ยเพื่อน! รายการ "${currentInput.value.trim()}" มันมีอยู่แล้วในร้านนี้นะ เช็คดีๆ!`);
            itemRow.style.backgroundColor = '#fffbeb'; // Highlight สีเหลืองอ่อนๆ
            itemRow.style.outline = '2px solid #facc15'; // ขอบสีเหลือง
        }
    }


    /**
     * สร้างแถวรายการสินค้า (ใช้ Unit Input และเพิ่ม event listener ตรวจของซ้ำ)
     * @param {string} shopId - ID ของร้านค้า
     * @param {object} itemData - ข้อมูลรายการสินค้า { quantity, unit, item }
     * @returns {HTMLDivElement} Element div ของแถวรายการสินค้า
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

        const itemInput = createItemInput(itemData.item);
        // เพิ่ม Event Listener ตรวจของซ้ำตอน blur (เมื่อ focus ออกจากช่อง)
        itemInput.addEventListener('blur', checkDuplicateItem);

        const removeBtnContainer = document.createElement('div');
        removeBtnContainer.className = 'remove-btn-container';
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        removeBtn.className = 'remove-btn';
        removeBtn.title = "ลบรายการนี้";
        removeBtn.type = "button";
        removeBtn.onclick = () => div.remove();
        removeBtnContainer.appendChild(removeBtn);

        // --- ประกอบร่างตาม grid area ---
        div.appendChild(quantityInput);
        div.appendChild(unitInput);
        div.appendChild(itemInput);
        div.appendChild(removeBtnContainer);

        return div;
    }

    /**
     * สร้างส่วนของร้านค้า
     * @param {object} shop - ข้อมูลร้านค้า { id, name, items }
     * @returns {HTMLDivElement} Element div ของส่วนร้านค้า
     */
    function createShopSection(shop) {
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
        shopNameInput.addEventListener('change', (e) => { // ใช้ change แทน onchange
             const currentShop = shops.find(s => s.id === shop.id);
             if (currentShop) currentShop.name = e.target.value;
             console.log(`เปลี่ยนชื่อร้าน ${shop.id} เป็น: ${e.target.value}`);
             // อาจจะเพิ่มการบันทึกอัตโนมัติที่นี่
        });
         const deleteShopBtn = document.createElement('button');
         deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
         deleteShopBtn.className = 'delete-shop-btn';
         deleteShopBtn.title = "ลบร้านค้านี้";
         deleteShopBtn.type = "button";
         deleteShopBtn.addEventListener('click', () => { // ใช้ addEventListener
             if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopNameInput.value}" จริงดิ? ลบแล้วหายเลยนะเพื่อน!`)) {
                console.log(`กำลังลบร้าน: ${shop.id} (${shopNameInput.value})`);
                section.remove();
                shops = shops.filter(s => s.id !== shop.id);
                updateOverallSummaryButtonVisibility();
                console.log("ร้านถูกลบแล้ว");
                // อาจจะเพิ่มการบันทึกข้อมูลร้านค้าที่นี่
             }
         });
        headerDiv.appendChild(shopNameInput);
        headerDiv.appendChild(deleteShopBtn);
        section.appendChild(headerDiv);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'items-list';
        // สร้าง item row จากข้อมูลที่มีอยู่
        if (shop.items && Array.isArray(shop.items)) {
            shop.items.forEach(item => {
                itemsDiv.appendChild(createItemRow(shop.id, item));
            });
        }
        section.appendChild(itemsDiv);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'shop-actions';
        const addItemBtn = document.createElement('button');
        addItemBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg> เพิ่มรายการ`;
        addItemBtn.className = 'action-button add-item-btn';
        addItemBtn.type = "button";
        addItemBtn.addEventListener('click', () => { // ใช้ addEventListener
            console.log(`เพิ่มรายการใหม่ในร้าน: ${shop.id}`);
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
        summarizeBtn.addEventListener('click', () => showSummary(shop.id)); // ใช้ addEventListener
        buttonsDiv.appendChild(addItemBtn);
        buttonsDiv.appendChild(summarizeBtn);
        section.appendChild(buttonsDiv);

        return section;
    }


    // --- ฟังก์ชันการทำงานหลัก ---

    /**
     * แสดงฟอร์มทั้งหมด
     */
    function renderShops() {
        console.log("กำลังแสดงผลร้านค้า...");
        shopsContainer.innerHTML = ''; // เคลียร์ร้านค้าเก่า
        if (!shops || shops.length === 0) {
            console.log("ไม่มีข้อมูลร้านค้าที่จะแสดง");
            shopsContainer.innerHTML = '<p class="text-center text-gray-500 my-4">ยังไม่มีร้านค้า กดปุ่ม "เพิ่มร้านค้าใหม่" เลยเพื่อน!</p>';
        } else {
            console.log(`พบ ${shops.length} ร้านค้า กำลังสร้าง UI...`);
            shops.forEach(shop => {
                if (shop && shop.id) { // เช็คว่าข้อมูล shop ถูกต้อง
                     shopsContainer.appendChild(createShopSection(shop));
                } else {
                    console.warn("เจอข้อมูลร้านค้าไม่ถูกต้อง:", shop);
                }
            });
        }
        updateOverallSummaryButtonVisibility();
        console.log("แสดงผลร้านค้าเสร็จสิ้น");
    }

     /**
      * อัปเดตการแสดงผลปุ่มสรุปทั้งหมด (แบบ Fixed)
      */
     function updateOverallSummaryButtonVisibility() {
         const shopSections = shopsContainer.querySelectorAll('.shop-section');
         const shouldShow = shopSections.length > 0;
         console.log(`จำนวนร้านค้า: ${shopSections.length}, แสดงปุ่มสรุปทั้งหมด: ${shouldShow}`);
         overallSummaryContainer.style.display = shouldShow ? 'block' : 'none';
     }

    /**
     * เพิ่มร้านค้าใหม่
     */
    function addShop() {
        console.log("กำลังเพิ่มร้านค้าใหม่...");
        const newShopId = `shop-${Date.now()}`;
        const newShopData = {
            id: newShopId,
            name: 'ร้านค้าใหม่ (คลิกแก้ชื่อ)',
            items: []
        };
        shops.push(newShopData);
        const newShopSection = createShopSection(newShopData);
        shopsContainer.appendChild(newShopSection);
         newShopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
         setTimeout(() => {
             const nameInput = newShopSection.querySelector('.shop-name-input');
             if (nameInput) {
                 nameInput.focus();
                 nameInput.select();
             }
         }, 300);
        updateOverallSummaryButtonVisibility();
        console.log(`เพิ่มร้านค้าใหม่ ID: ${newShopId} เรียบร้อย`);
        // อาจจะเพิ่มการบันทึกข้อมูลร้านค้าที่นี่
    }

    /**
     * เก็บข้อมูลจากฟอร์มสำหรับสรุปรายการ
     * @param {string | null} shopId - ID ของร้านที่ต้องการสรุป (null คือสรุปทั้งหมด)
     * @returns {object[]} Array ของข้อมูลร้านค้าและรายการสินค้า
     */
    function getOrderData(shopId = null) {
        console.log(`กำลังดึงข้อมูลรายการสั่งซื้อสำหรับ shopId: ${shopId || 'ทั้งหมด'}`);
        const orderData = [];
        const shopSections = shopId
            ? [document.getElementById(shopId)]
            : shopsContainer.querySelectorAll('.shop-section');

        shopSections.forEach(section => {
            if (!section || !section.id) return; // ข้ามถ้า element ไม่ถูกต้อง

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

                    if (itemName && quantity) { // ต้องมีทั้งชื่อและจำนวน
                        items.push({
                            quantity: quantity,
                            unit: unit || '?', // ถ้าหน่วยว่าง ใส่ ?
                            item: itemName
                        });
                    }
                }
            });
            console.log(`ร้าน "${shopName}" มี ${items.length} รายการ`);

            // เงื่อนไขการเก็บข้อมูลร้าน (เหมือนเดิม)
            if (shopId !== null || items.length > 0 || (shopId === null && shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')) {
                 orderData.push({ shopName: shopName, items: items });
             }
        });
        console.log("ดึงข้อมูลรายการสั่งซื้อเสร็จสิ้น:", orderData);
        return orderData;
    }

    /**
     * แสดง Modal สรุปรายการ
     * @param {string | null} shopId - ID ของร้านที่ต้องการสรุป (null คือสรุปทั้งหมด)
     */
    function showSummary(shopId = null) {
        console.log(`กำลังแสดงสรุปสำหรับ shopId: ${shopId || 'ทั้งหมด'}`);
        const data = getOrderData(shopId);
        summaryContent.innerHTML = '';
        copyStatus.style.display = 'none';

        const dataToShow = shopId === null
            ? data.filter(shop => shop.items.length > 0 || shop.shopName !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')
            : data;

        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p class="text-center text-gray-500 py-4">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
             console.log("ไม่มีรายการที่จะแสดงในสรุป");
        } else {
            console.log(`กำลังสร้าง UI สรุปสำหรับ ${dataToShow.length} ร้านค้า`);
            dataToShow.forEach(shopData => {
                const shopDiv = document.createElement('div');
                const title = document.createElement('h3');
                title.textContent = `🛒 ${shopData.shopName}`;
                shopDiv.appendChild(title);
                if (shopData.items.length > 0) {
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
        console.log("แสดง Modal สรุปเรียบร้อย");
    }

    /**
     * ปิด Modal สรุปรายการ
     */
    function closeModal() {
        summaryModal.style.display = 'none';
        console.log("ปิด Modal สรุป");
    }

    /**
     * คัดลอกสรุปรายการไปยัง Clipboard
     */
    function copySummaryToClipboard() {
        console.log("กำลังเตรียมคัดลอกสรุป...");
        let textToCopy = "";
        const shopDivs = summaryContent.querySelectorAll(':scope > div');

         if(shopDivs.length === 0 && summaryContent.querySelector('p')) {
             textToCopy = summaryContent.querySelector('p').textContent;
             console.log("คัดลอกข้อความ 'ไม่มีรายการ'");
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
             console.log("ข้อความที่จะคัดลอก:", textToCopy.trim());
         }

        navigator.clipboard.writeText(textToCopy.trim())
            .then(() => {
                console.log("คัดลอกไปยัง Clipboard สำเร็จ!");
                copyStatus.style.display = 'block';
                setTimeout(() => { copyStatus.style.display = 'none'; }, 2500);
            })
            .catch(err => {
                console.error('ชิบ! คัดลอกไม่สำเร็จ:', err);
                alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊');
            });
    }

    // --- ฟังก์ชันโหลดข้อมูลและเริ่มต้น ---

    /**
     * ฟังก์ชันหลักในการโหลดข้อมูลรายการสินค้าจาก JSON และเริ่มการทำงาน
     */
    async function initializeApp() {
        console.log("เริ่มต้น initializeApp...");
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...';
        loadingErrorDiv.style.display = 'block';
        loadingErrorDiv.style.backgroundColor = '#fffbeb'; // Reset style
        loadingErrorDiv.style.color = '#b45309';
        loadingErrorDiv.style.borderColor = '#fef3c7';
        try {
            const jsonPath = 'items.json'; // ชื่อไฟล์ JSON
            console.log(`กำลัง fetch ข้อมูลจาก: ${jsonPath}`);
            const response = await fetch(jsonPath);
            console.log(`สถานะการตอบกลับจาก fetch: ${response.status}`);

            if (!response.ok) {
                throw new Error(`โหลดไฟล์ ${jsonPath} ไม่ได้ว่ะเพื่อน (${response.status})`);
            }

            // ลองอ่านเป็น text ก่อนเพื่อ debug
            // const text = await response.text();
            // console.log("เนื้อหาไฟล์ JSON (text):", text);
            // masterItemList = JSON.parse(text); // แล้วค่อย parse

            masterItemList = await response.json(); // แปลง JSON เป็น Array
            console.log(`โหลดข้อมูล JSON สำเร็จ, จำนวนรายการ: ${masterItemList.length}`);

            if (!Array.isArray(masterItemList)) {
                throw new Error('ข้อมูลใน items.json ไม่ใช่ Array ว่ะเพื่อน เช็คไฟล์ดิ๊');
            }

            // --- โหลดสำเร็จ ---
            loadingErrorDiv.textContent = `✅ โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`;
            loadingErrorDiv.style.backgroundColor = '#f0fdf4'; // สีเขียวอ่อน
            loadingErrorDiv.style.color = '#15803d'; // สีเขียวเข้ม
            loadingErrorDiv.style.borderColor = '#dcfce7'; // สีเขียว
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 2500); // ซ่อนหลังจากแสดงผลสำเร็จ

            createGlobalDatalist(masterItemList); // สร้าง datalist รายการของ
            createGlobalUnitDatalist(); // สร้าง datalist หน่วยนับ
            renderShops(); // แสดงผลร้านค้า

        } catch (error) {
            console.error('ชิบหายละ โหลด items.json ไม่ได้:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) เช็คไฟล์ items.json ด่วนๆ! (อาจจะต้องเปิดผ่าน Live Server ถ้าเปิดไฟล์ตรงๆ)`;
            loadingErrorDiv.style.backgroundColor = '#fee2e2'; // สีแดงอ่อน
            loadingErrorDiv.style.color = '#991b1b'; // สีแดงเข้ม
            loadingErrorDiv.style.borderColor = '#fecaca'; // สีแดง
            loadingErrorDiv.style.display = 'block'; // แสดงข้อความ error ค้างไว้

            // ถึงแม้จะโหลด list ไม่ได้ ก็ยังแสดงโครงสร้างร้านค้า และ datalist หน่วยนับ
            console.warn("ไม่สามารถโหลด masterItemList ได้ จะใช้ข้อมูลร้านค้าเริ่มต้นแทน");
            createGlobalUnitDatalist(); // สร้าง datalist หน่วยนับไว้ก่อน
            renderShops(); // แสดงร้านค้าตัวอย่าง
        }
    }

    // --- ตั้งค่า Event Listeners หลัก ---
    if (addShopButton) addShopButton.addEventListener('click', addShop);
    if (overallSummaryButton) overallSummaryButton.addEventListener('click', () => showSummary());
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    if (copySummaryButton) copySummaryButton.addEventListener('click', copySummaryToClipboard);
    if (closeModalActionButton) closeModalActionButton.addEventListener('click', closeModal);

    // ปิด Modal ถ้าคลิกนอกพื้นที่ Modal content
    window.addEventListener('click', (event) => {
        if (event.target == summaryModal) {
            closeModal();
        }
    });

    // --- เริ่มต้นการทำงาน ---
    initializeApp(); // เรียกฟังก์ชันหลัก

}); // ปิด DOMContentLoaded listener
