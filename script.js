'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element References ---
    // เก็บ Element ที่ใช้บ่อยๆ ไว้ในตัวแปร จะได้เรียกใช้ง่ายๆ
    const shopsContainer = document.getElementById('shops-container'); // Div หลักที่ใส่ร้านค้าทั้งหมด
    const summaryModal = document.getElementById('summaryModal'); // กล่อง Modal สรุป
    const summaryContent = document.getElementById('summaryContent'); // เนื้อหาใน Modal สรุป
    const summaryTimestampElem = document.getElementById('summary-timestamp'); // ที่แสดงวันที่เวลาใน Modal
    const copyStatus = document.getElementById('copy-status'); // ข้อความบอกว่า Copy สำเร็จ
    const overallSummaryContainer = document.getElementById('overall-summary-container'); // Div ที่ครอบปุ่มสรุปทั้งหมด (ลอยๆ)
    const loadingErrorDiv = document.getElementById('loading-error-message'); // Div แสดงข้อความตอนโหลด/ผิดพลาด
    const addShopButton = document.getElementById('add-shop-btn'); // ปุ่ม "เพิ่มร้านค้าใหม่" หลัก
    const overallSummaryButton = document.getElementById('overall-summary-btn'); // ปุ่ม "ดูสรุปรายการทั้งหมด" หลัก
    const modalCloseButton = document.getElementById('modal-close-btn'); // ปุ่ม X ปิด Modal
    const copySummaryButton = document.getElementById('copy-summary-btn'); // ปุ่ม "คัดลอก" ใน Modal
    const closeModalActionButton = document.getElementById('close-modal-action-btn'); // ปุ่ม "ปิด" ใน Modal

    // --- Constants ---
    // ค่าคงที่ต่างๆ ที่ใช้ในโค้ด
    // ลิสต์หน่วยนับพื้นฐาน (เรียงตามอักษรไทย)
    const BASE_UNITS = ["กก.", "กรัม", "ขีด", "กล่อง", "กำ", "กระป๋อง", "ขวด", "ขึ้นฉ่าย", "ชุด", "ชิ้น", "ช่อ", "ซอง", "ต้น", "ถุง", "แผ่น", "แผง", "แถว", "ผล", "ใบ", "ปี๊บ", "พวง", "แพ็ค", "ฟอง", "ม้วน", "มัด", "เมตร", "ลัง", "ลูก", "เส้น", "หน่วย", "อัน", "หัว", "หวี", "โหล"].sort((a, b) => a.localeCompare(b, 'th'));
    const GLOBAL_ITEMS_DATALIST_ID = 'global-items-list'; // ID ของ datalist สำหรับรายการสินค้า
    const GLOBAL_UNITS_DATALIST_ID = 'global-units-list'; // ID ของ datalist สำหรับหน่วยนับ
    const ITEMS_JSON_PATH = 'items.json'; // ตำแหน่งไฟล์รายการสินค้า

    // --- State Variables ---
    // ตัวแปรที่เก็บสถานะปัจจุบันของแอป
    let masterItemList = []; // Array เก็บรายการสินค้าทั้งหมดที่โหลดมาจาก items.json
    let shops = []; // V14: Array หลัก! เก็บข้อมูลร้านค้าทั้งหมด { id, name, items: [{ quantity, unit, item }, ...] }
                    // ข้อมูลรายการสินค้าจะถูกเก็บในนี้ ไม่ได้แสดงใน DOM โดยตรงแล้ว

    // ข้อมูลตัวอย่างเผื่อกรณีโหลด items.json ไม่ได้
    const initialShopsData = [
        { id: 'shop-init-1', name: 'ร้านตัวอย่าง 1 (ถ้าโหลด JSON ไม่ได้)', items: [ { quantity: '1', unit: 'กก.', item: 'ตัวอย่าง 1' } ] },
        { id: 'shop-init-2', name: 'ร้านตัวอย่าง 2', items: [ { quantity: '2', unit: 'ชิ้น', item: 'ตัวอย่าง 2' } ] }
    ];

    // --- UI Creation Functions ---
    // ฟังก์ชันสำหรับสร้างส่วนต่างๆ ของหน้าเว็บ

    /** สร้าง/อัปเดต Global Datalist สำหรับ gợi ý */
    function createOrUpdateDatalist(listId, optionsArray) {
        let datalist = document.getElementById(listId);
        // ถ้ายังไม่มี datalist นี้ในหน้าเว็บ ให้สร้างขึ้นมาใหม่
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist);
            // เช็คอีกทีว่าสร้างสำเร็จมั้ย
            datalist = document.getElementById(listId);
            if (!datalist) {
                console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`);
                return;
            }
        }
        // เคลียร์ option เก่าทิ้งก่อน
        datalist.innerHTML = '';
        // เช็คว่าข้อมูลที่ได้มาเป็น Array จริงๆ
        if (!Array.isArray(optionsArray)) {
             console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`);
             return;
        }
        // เรียงลำดับรายการตามตัวอักษรไทย
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));
        // วนลูปสร้าง <option> ใส่ใน datalist
        sortedOptions.forEach(optionValue => {
            // เช็คว่าเป็น string และไม่ว่างเปล่า
            if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                try {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    datalist.appendChild(option);
                } catch (e) {
                    // ดักจับ error เผื่อมีปัญหาตอนสร้าง option
                    console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e);
                }
            }
        });
    }

    /** สร้าง Input สำหรับหน่วยนับ (ใช้ใน Entry Area) */
    function createUnitInputEntry(selectedUnit = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'หน่วย';
        input.className = 'entry-unit'; // V14: Class เฉพาะสำหรับช่องกรอกหน่วย
        input.value = selectedUnit;
        input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); // เชื่อมกับ datalist หน่วย
        return input;
    }

    /** สร้าง Input สำหรับรายการสินค้า (ใช้ใน Entry Area) */
    function createItemInputEntry(selectedItem = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ใส่รายการ กด + เพื่อเพิ่ม...'; // V14: เปลี่ยน placeholder ให้สื่อความหมาย
        input.className = 'entry-item'; // V14: Class เฉพาะสำหรับช่องกรอกรายการ
        input.value = selectedItem;
        input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); // เชื่อมกับ datalist รายการ
        return input;
    }

    /** V14: สร้างส่วนกรอกข้อมูล (Item Entry Area) สำหรับแต่ละร้าน */
    function createItemEntryArea(shopId) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'item-entry-area'; // Class หลักของส่วนนี้
        entryDiv.dataset.shopId = shopId; // เก็บ shopId ไว้ใน data attribute เพื่ออ้างอิงทีหลัง

        // สร้างช่องกรอกจำนวน
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.placeholder = 'จำนวน';
        quantityInput.min = "0"; // อนุญาตเลข 0
        quantityInput.step = "any"; // อนุญาตทศนิยม
        quantityInput.className = 'entry-quantity'; // Class เฉพาะ

        // สร้างช่องกรอกหน่วย
        const unitInput = createUnitInputEntry(); // เรียกใช้ฟังก์ชันที่สร้างไว้

        // สร้างช่องกรอกชื่อรายการ
        const itemInput = createItemInputEntry(); // เรียกใช้ฟังก์ชันที่สร้างไว้

        // สร้างปุ่ม "+" สำหรับเพิ่มรายการ
        const addBtn = document.createElement('button');
        // ใช้ SVG รูปบวก
        addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        addBtn.className = 'action-button entry-add-btn'; // Class เฉพาะสำหรับปุ่มนี้
        addBtn.title = "เพิ่มรายการนี้";
        addBtn.type = "button"; // สำคัญ! ป้องกันการ submit ฟอร์มโดยไม่ตั้งใจ
        // Event listener ของปุ่มนี้จะถูกเพิ่มโดยใช้ Event Delegation ทีหลัง

        // สร้าง Div สำหรับแสดงสถานะ (เพิ่มแล้ว/ซ้ำ)
        const statusDiv = document.createElement('div');
        statusDiv.className = 'entry-status'; // Class สำหรับจัดสไตล์ข้อความสถานะ

        // ประกอบร่างส่วนกรอกข้อมูล
        entryDiv.appendChild(quantityInput);
        entryDiv.appendChild(unitInput);
        entryDiv.appendChild(itemInput);
        entryDiv.appendChild(addBtn);
        entryDiv.appendChild(statusDiv); // เพิ่ม div สถานะเข้าไปด้วย

        return entryDiv; // คืนค่า div ที่สร้างเสร็จแล้ว
    }


    /** V14: สร้างส่วน UI ของร้านค้า (แสดงแค่ Header, Entry Area, และปุ่มสรุป) */
    function createShopSection(shop) {
        // เช็คข้อมูล shop เบื้องต้น
        if (!shop || typeof shop !== 'object' || !shop.id || typeof shop.name !== 'string') {
            console.error("ข้อมูลร้านค้าไม่ถูกต้อง:", shop);
            return null; // ถ้าข้อมูลไม่ถูก ก็ไม่สร้าง section
        }

        // สร้าง div หลักของ section ร้านค้า
        const section = document.createElement('div');
        section.id = shop.id; // ใช้ id จากข้อมูล shop
        section.className = 'shop-section';

        // --- ส่วน Header (ชื่อร้าน + ปุ่มลบร้าน) ---
        const headerDiv = document.createElement('div');
        headerDiv.className = 'shop-header';

        // ช่องใส่ชื่อร้าน
        const shopNameInput = document.createElement('input');
        shopNameInput.type = 'text';
        shopNameInput.value = shop.name; // ใส่ชื่อร้านจากข้อมูล
        shopNameInput.className = 'shop-name-input';
        shopNameInput.placeholder = "ใส่ชื่อร้านค้า...";
        // เพิ่ม event listener เผื่อมีการแก้ไขชื่อร้าน จะได้อัปเดตใน state 'shops' ด้วย
        shopNameInput.addEventListener('change', (e) => {
            const currentShop = shops.find(s => s.id === shop.id);
            if (currentShop) {
                currentShop.name = e.target.value; // อัปเดตชื่อใน state
                // console.log(`Shop name updated for ${shop.id}: ${currentShop.name}`);
                // ถ้ามีการบันทึกข้อมูลลง localStorage ก็ต้องเรียกใช้ตรงนี้ด้วย
            }
        });

        // ปุ่มลบร้าน (X)
        const deleteShopBtn = document.createElement('button');
        deleteShopBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
        deleteShopBtn.className = 'delete-shop-btn';
        deleteShopBtn.title = "ลบร้านค้านี้";
        deleteShopBtn.type = "button";
        // เพิ่ม event listener ให้ปุ่มลบ
        deleteShopBtn.addEventListener('click', () => {
            // ถามยืนยันก่อนลบ ใช้ชื่อร้านปัจจุบันในช่อง input มาแสดง
            if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopNameInput.value}" จริงดิ?`)) {
                section.remove(); // ลบ section นี้ออกจากหน้าเว็บ
                // ลบร้านนี้ออกจาก state 'shops' ด้วย
                const shopIndex = shops.findIndex(s => s.id === shop.id);
                if (shopIndex > -1) { // เช็คว่าเจอ index จริงๆ
                    shops.splice(shopIndex, 1); // ลบออกจาก array
                }
                updateOverallSummaryButtonVisibility(); // อัปเดตปุ่มสรุปทั้งหมด
                // ถ้ามีการบันทึกข้อมูลลง localStorage ก็ต้องเรียกใช้ตรงนี้ด้วย
            }
        });

        // ประกอบร่าง Header
        headerDiv.appendChild(shopNameInput);
        headerDiv.appendChild(deleteShopBtn);
        section.appendChild(headerDiv);

        // --- V14: ส่วนกรอกรายการ (Item Entry Area) ---
        // ไม่มีการสร้างลิสต์รายการสินค้า (.items-list) ตรงนี้แล้ว
        // ให้สร้าง Entry Area แทน
        const entryArea = createItemEntryArea(shop.id);
        section.appendChild(entryArea); // เพิ่ม Entry Area เข้าไปใน section

        // --- ส่วนปุ่มดำเนินการท้าย Section (เหลือแค่ปุ่มสรุป) ---
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'shop-actions'; // ใช้ class เดิมเผื่อจัดสไตล์

        // V14: มีแค่ปุ่ม "สรุปรายการร้านนี้"
        const summarizeBtn = document.createElement('button');
        summarizeBtn.textContent = '📋 สรุปรายการร้านนี้';
        summarizeBtn.className = 'action-button summarize-btn'; // ใช้ class เดิม
        summarizeBtn.type = "button";
        summarizeBtn.addEventListener('click', () => showSummary(shop.id)); // กดแล้วเรียก showSummary โดยส่ง id ร้านไปด้วย

        // ประกอบร่างส่วนปุ่ม
        buttonsDiv.appendChild(summarizeBtn); // ใส่แค่ปุ่มสรุป
        section.appendChild(buttonsDiv);

        return section; // คืนค่า section ที่สร้างเสร็จ
    }

    // --- Core Logic Functions ---
    // ฟังก์ชันหลักในการทำงานของแอป

    /** แสดงผลร้านค้าทั้งหมด */
    function renderShops() {
        if (!shopsContainer) return; // ถ้าหา container ไม่เจอ ก็ไม่ต้องทำอะไร
        shopsContainer.innerHTML = ''; // เคลียร์ร้านค้าเก่าทิ้งก่อน
        // เช็คว่ามีร้านค้าใน state 'shops' หรือไม่
        if (!shops || shops.length === 0) {
            // ถ้าไม่มี ให้แสดงข้อความบอก
            shopsContainer.innerHTML = '<p style="text-align: center; color: grey; margin: 1rem 0;">ยังไม่มีร้านค้า กดปุ่ม "เพิ่มร้านค้าใหม่" เลยเพื่อน!</p>';
        } else {
            // ถ้ามี ให้วนลูปสร้าง section ของแต่ละร้านจากข้อมูลใน state 'shops'
            shops.forEach(shop => {
                const shopSection = createShopSection(shop); // เรียกใช้ฟังก์ชันสร้าง section
                if (shopSection) { // ถ้าสร้างสำเร็จ
                    shopsContainer.appendChild(shopSection); // ก็เพิ่มเข้าไปใน container
                }
            });
        }
        updateOverallSummaryButtonVisibility(); // อัปเดตการแสดงผลปุ่มสรุปทั้งหมด
    }

    /** อัปเดตการแสดงผลปุ่มสรุปทั้งหมด (ปุ่มลอย) */
    function updateOverallSummaryButtonVisibility() {
        // V14: เช็คว่ามีร้านค้าใน state 'shops' หรือไม่ (ง่ายกว่าเดิม)
        const shopSectionsExist = shops.length > 0;
        if (overallSummaryContainer) {
            // ถ้ามีร้านค้า ให้แสดงปุ่ม / ถ้าไม่มี ให้ซ่อน
            overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none';
        }
    }

    /** เพิ่มร้านค้าใหม่ */
    function addShop() {
        const newShopId = `shop-${Date.now()}`; // สร้าง ID ง่ายๆ จาก timestamp
        // V14: สร้างข้อมูลร้านใหม่ โดยมี items เป็น array ว่างๆ ใน state
        const newShopData = { id: newShopId, name: 'ร้านค้าใหม่ (คลิกแก้ชื่อ)', items: [] };
        shops.push(newShopData); // เพิ่มข้อมูลร้านใหม่เข้า state 'shops' ก่อน

        // เรียก renderShops() เพื่อวาดร้านค้าทั้งหมดใหม่ (รวมร้านใหม่ด้วย)
        // หรือจะสร้างเฉพาะ section ใหม่แล้ว append ก็ได้ แต่ render ใหม่ทั้งหมดจะง่ายกว่า
        renderShops();

        // เลื่อนจอไปที่ร้านใหม่ และ focus ที่ช่องใส่ชื่อ
        const newShopSection = document.getElementById(newShopId);
        if (newShopSection) {
            newShopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
             setTimeout(() => { // หน่วงเวลาเล็กน้อยเพื่อให้ scroll เสร็จก่อน
                 const nameInput = newShopSection.querySelector('.shop-name-input');
                 if (nameInput) {
                     nameInput.focus();
                     nameInput.select(); // เลือกข้อความในช่องให้เลย จะได้แก้ชื่อสะดวก
                 }
             }, 300);
        }
        updateOverallSummaryButtonVisibility(); // อัปเดตปุ่มสรุป
        // ถ้ามีการบันทึกข้อมูลลง localStorage ก็ต้องเรียกใช้ตรงนี้ด้วย
    }

    /** V14: ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป */
    function getOrderData(shopId = null) {
        if (shopId) {
            // --- กรณีต้องการข้อมูลร้านเดียว ---
            // หาข้อมูลร้านที่ตรงกับ shopId ใน state 'shops'
            const shop = shops.find(s => s.id === shopId);
            if (shop) {
                // ถ้าเจอ ให้คืนค่าข้อมูลร้านนั้นในรูปแบบ Array ที่มีสมาชิกเดียว
                // คืนค่าเป็น copy เพื่อป้องกันการแก้ไขข้อมูลต้นฉบับโดยไม่ตั้งใจ
                return [{ shopName: shop.name, items: [...shop.items] }];
            } else {
                return []; // ถ้าไม่เจอร้าน ก็คืน array ว่าง
            }
        } else {
            // --- กรณีต้องการข้อมูลทุกร้าน ---
            // ให้คืนค่าข้อมูลจาก state 'shops' ทั้งหมด
            // โดยกรองเอาร้านที่ชื่อยังเป็น default และไม่มีรายการของออกไปก่อน
             return shops
                .filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)')
                .map(shop => ({ // แปลงข้อมูลแต่ละร้านให้อยู่ในรูปแบบที่ต้องการ
                    shopName: shop.name,
                    items: [...shop.items] // คืนค่าเป็น copy ของ items array
                }));
        }
    }

    /** จัดรูปแบบวันที่เวลาไทย */
    function formatThaiTimestamp() {
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
        try {
            // ดึงปี พ.ศ.
            const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' });
            const buddhistYear = yearFormatter.format(now);
            // จัดรูปแบบวันที่ แล้วแทนที่ปี ค.ศ. ด้วย พ.ศ.
            const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear);
            // จัดรูปแบบเวลา
            const formattedTime = now.toLocaleTimeString('th-TH', timeOptions);
            return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`;
        } catch (e) {
            console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e);
            // ถ้าเกิด error ให้ใช้รูปแบบสำรอง
            return `สรุป ณ ${now.toLocaleString('th-TH')}`;
        }
    }

    /** Escape HTML special characters ป้องกัน XSS */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return ''; // ถ้าไม่ใช่ string ก็คืนค่าว่าง
        return unsafe.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
    }

    /** V14: แสดง Modal สรุป (ดึงข้อมูลจาก getOrderData ที่อ่าน State) */
    function showSummary(shopId = null) {
        // เช็คว่า element ที่จำเป็นอยู่ครบมั้ย
        if (!summaryModal || !summaryContent || !summaryTimestampElem) {
            console.error("หา Element ของ Modal ไม่เจอ!");
            return;
        }

        // สร้าง timestamp ปัจจุบันสำหรับหัว Modal
        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp; // แสดง timestamp หลัก

        // V14: getOrderData จะไปดึงข้อมูลจาก state 'shops' มาให้เอง
        const data = getOrderData(shopId);
        summaryContent.innerHTML = ''; // เคลียร์เนื้อหาสรุปเก่า
        if (copyStatus) copyStatus.style.display = 'none'; // ซ่อนสถานะการคัดลอก

        // V14: ไม่ต้องกรองข้อมูลซ้ำซ้อนตรงนี้แล้ว เพราะ getOrderData จัดการให้แล้ว
        const dataToShow = data;

        // ถ้าไม่มีข้อมูลจะแสดง (เช่น ไม่มีร้าน หรือร้านที่เลือกไม่มีของ)
        if (dataToShow.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            // ถ้ามีข้อมูล ให้สร้าง HTML สำหรับตารางสรุป
            let modalHtml = '';
            dataToShow.forEach(shopData => {
                const shopNameEscaped = escapeHtml(shopData.shopName);
                // สร้าง Header ของร้าน
                modalHtml += `<h3 style="font-size: 1.1rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.25rem; color: #1f2937; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb;">🛒 ${shopNameEscaped}</h3>`;

                // ถ้าเป็นการสรุปทั้งหมด ให้ใส่ timestamp ของแต่ละร้านด้วย
                if (shopId === null) {
                    const timePart = overallTimestamp.split(' เวลา ')[1] || '';
                    const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ','');
                    // เพิ่ม class 'shop-timestamp-print' สำหรับซ่อน/แสดงตอนพิมพ์ใน CSS
                    modalHtml += `<p class="shop-timestamp-print" style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; text-align: left;">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                }

                // สร้างตารางแสดงรายการสินค้า (ใช้ inline style เพื่อให้ติดไปตอน copy ง่าย)
                modalHtml += `
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 0.9rem;">
                        <thead style="background-color: #f8f9fa;">
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; width: 15%; font-weight: 600;">จำนวน</th>
                                <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">หน่วย</th>
                                <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 45%; font-weight: 600;">รายการ</th>
                                <th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">หมายเหตุ/ราคา</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                // วนลูปสร้างแถวรายการสินค้าจากข้อมูลใน shopData.items (ที่มาจาก state 'shops')
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach(item => {
                        modalHtml += `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: top;">${escapeHtml(item.quantity)}</td>
                                <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;">${escapeHtml(item.unit)}</td>
                                <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; word-wrap: break-word;">${escapeHtml(item.item)}</td>
                                <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;"></td>
                            </tr>
                        `;
                    });
                } else {
                    // ถ้าไม่มีรายการ ให้แสดงข้อความบอก
                     modalHtml += `<tr><td colspan="4" style="text-align: center; font-style: italic; color: grey; border: 1px solid #ddd; padding: 6px 8px;">(ไม่มีรายการ)</td></tr>`;
                }

                // สร้างส่วนท้ายตาราง (tfoot) สำหรับรวมราคา
                modalHtml += `
                        </tbody>
                        <tfoot style="font-weight: bold; background-color: #f8f9fa;">
                            <tr>
                                <td colspan="3" style="border: 1px solid #ddd; border-right: none; padding: 6px 10px 6px 8px; text-align: right;">รวมราคา:</td>
                                <td style="border: 1px solid #ddd; border-left: none; padding: 6px 8px; min-height: 1.5em;"></td>
                            </tr>
                        </tfoot>
                    </table>
                `;
            });
            // เอา HTML ที่สร้างเสร็จใส่ใน Modal
            summaryContent.innerHTML = modalHtml;
        }
        // แสดง Modal ขึ้นมา
        summaryModal.style.display = 'block';
    }


    /** ปิด Modal */
    function closeModal() {
        if (summaryModal) summaryModal.style.display = 'none';
    }

    /** คัดลอกสรุป (ดึงข้อมูลจาก getOrderData ที่อ่าน State) */
    function copySummaryToClipboard() {
        if (!summaryContent) return; // ถ้าไม่มี content ก็ไม่ต้องทำ
        let textToCopy = "";
        const currentTimestamp = formatThaiTimestamp(); // เอา timestamp ปัจจุบัน
        textToCopy += currentTimestamp + "\n\n"; // ใส่ timestamp ไว้บนสุด

        // V14: getOrderData() จะดึงข้อมูลจาก state และกรองร้านว่างให้แล้ว
        const dataToCopy = getOrderData(); // ดึงข้อมูลทุกร้าน

         if(dataToCopy.length === 0) {
             textToCopy += "(ไม่มีรายการสั่งซื้อ)";
         } else {
             // วนลูปสร้างข้อความสำหรับ copy
             dataToCopy.forEach((shopData, index) => {
                const shopNameOnly = shopData.shopName.replace(/🛒\s*/, ''); // เอารูปตะกร้าออก (ถ้ามี)
                textToCopy += `--- ${shopNameOnly} ---\n`; // คั่นชื่อร้าน
                if (shopData.items.length > 0) {
                    // วนลูปรายการของ
                    shopData.items.forEach(item => {
                        textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`; // รูปแบบ จำนวน หน่วย : ชื่อของ
                    });
                } else {
                    textToCopy += "(ไม่มีรายการ)\n"; // บอกว่าร้านนี้ไม่มีของ
                }
                // ใส่บรรทัดว่างคั่นระหว่างร้าน (ยกเว้นร้านสุดท้าย)
                if (index < dataToCopy.length - 1) {
                    textToCopy += "\n";
                }
            });
         }
         // ใช้ Clipboard API ในการคัดลอก (ทันสมัยกว่า)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy.trim()) // trim() เอา space หัว/ท้ายออก
                .then(() => {
                    // ถ้า copy สำเร็จ ให้แสดงข้อความบอกสถานะ
                    if (copyStatus) {
                        copyStatus.style.display = 'block';
                        setTimeout(() => { copyStatus.style.display = 'none'; }, 2500); // ซ่อนหลังจาก 2.5 วิ
                    }
                })
                .catch(err => {
                    // ถ้า error ให้แจ้งเตือน
                    console.error('Clipboard copy failed:', err);
                    alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊');
                });
        } else {
            // ถ้าเบราว์เซอร์ไม่รองรับ Clipboard API (เก่ามากๆ)
            alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ');
        }
    }

    /** V14: แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area ของแต่ละร้าน */
    function showEntryStatus(entryAreaElement, message, isError = false) {
        // หา div แสดงสถานะที่อยู่ใน entryAreaElement นั้นๆ
        const statusDiv = entryAreaElement.querySelector('.entry-status');
        if (!statusDiv) return; // ถ้าหาไม่เจอ ก็ไม่ต้องทำอะไร

        statusDiv.textContent = message; // ใส่ข้อความ
        // กำหนด class ตามประเภทข้อความ (success/error) เพื่อให้ CSS จัดสไตล์ถูก
        statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block'; // แสดง div ขึ้นมา

        // ตั้งเวลาให้ซ่อนข้อความหลังจากแสดงไปแล้วแป๊บนึง
        setTimeout(() => {
            statusDiv.style.display = 'none'; // ซ่อน div
            statusDiv.textContent = ''; // เคลียร์ข้อความ
            statusDiv.className = 'entry-status'; // เอาก class success/error ออก
        }, 2500); // แสดงนาน 2.5 วินาที (ปรับได้ตามชอบ)
    }


    /** V14: จัดการการกดปุ่ม "เพิ่มรายการ" (+) ใน Entry Area (ใช้ Event Delegation) */
    function handleAddItemClick(event) {
        // หาปุ่ม .entry-add-btn ที่ใกล้ที่สุดที่ถูกคลิก (เผื่อคลิกโดนไอคอนข้างใน)
        const addButton = event.target.closest('.entry-add-btn');
        // ถ้าไม่ได้คลิกปุ่มเพิ่ม ก็ไม่ต้องทำอะไร
        if (!addButton) return;

        // หา .item-entry-area ที่เป็นแม่ของปุ่มที่กด
        const entryArea = addButton.closest('.item-entry-area');
        if (!entryArea) return; // ถ้าหาไม่เจอ (ไม่น่าเกิด) ก็ออก

        // ดึง shopId จาก data attribute
        const shopId = entryArea.dataset.shopId;
        // หา input ต่างๆ ที่อยู่ใน entryArea เดียวกัน
        const quantityInput = entryArea.querySelector('.entry-quantity');
        const unitInput = entryArea.querySelector('.entry-unit');
        const itemInput = entryArea.querySelector('.entry-item');

        // เช็คว่าหา element เจอครบมั้ย
        if (!shopId || !quantityInput || !unitInput || !itemInput) {
            console.error("หา element ใน entry area ไม่เจอ ร้าน:", shopId);
            return;
        }

        // ดึงค่าจาก input แล้ว trim() เอา space หัว/ท้ายออก
        const quantity = quantityInput.value.trim();
        const unit = unitInput.value.trim();
        const itemName = itemInput.value.trim();
        const itemNameLower = itemName.toLowerCase(); // เตรียมไว้เช็คซ้ำ (ไม่สนตัวเล็ก/ใหญ่)

        // --- ตรวจสอบข้อมูลเบื้องต้น ---
        if (!itemName) { // ต้องใส่ชื่อรายการ
            showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true); // แสดง error
            itemInput.focus(); // ย้าย cursor ไปที่ช่องชื่อรายการ
            return; // หยุดทำงาน
        }
        if (!quantity) { // ต้องใส่จำนวน
            showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true); // แสดง error
            quantityInput.focus(); // ย้าย cursor ไปที่ช่องจำนวน
            return; // หยุดทำงาน
        }

        // --- หาข้อมูลร้านนี้ใน state 'shops' ---
        const shop = shops.find(s => s.id === shopId);
        if (!shop) { // ถ้าหาไม่เจอ (ไม่น่าเกิด แต่เช็คไว้ก่อน)
            console.error("ไม่เจอร้านใน state ID:", shopId);
            showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true);
            return;
        }

        // --- เช็คของซ้ำ ---
        // ใช้ .some() วนเช็คใน shop.items ของร้านนี้ ว่ามี item ไหนที่ชื่อ (แปลงเป็นตัวเล็ก) ตรงกับที่กรอกมามั้ย
        const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicate) { // ถ้าเจอว่าซ้ำ
            showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true); // แสดง error
            // ไม่ต้องเคลียร์ช่องกรอก ให้ user เห็นว่าพิมพ์อะไรซ้ำ
            itemInput.focus(); // ย้าย cursor ไปช่องชื่อรายการ
            itemInput.select(); // เลือกข้อความให้เลย เผื่อจะแก้
            return; // หยุดทำงาน ไม่เพิ่มของ
        }

        // --- ถ้าไม่ซ้ำ ก็เพิ่มของลง state 'shops' ---
        shop.items.push({ // เพิ่ม object ใหม่เข้าไปใน array items ของร้านนี้
            quantity: quantity,
            unit: unit || '?', // ถ้าไม่ได้ใส่หน่วย ให้ใส่ '?' แทน
            item: itemName
        });

        // --- แสดงผลว่าเพิ่มสำเร็จ + เคลียร์ช่องกรอก ---
        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false); // แสดง success
        // เคลียร์ช่องกรอกให้ว่าง
        quantityInput.value = '';
        unitInput.value = '';
        itemInput.value = '';
        itemInput.focus(); // ย้าย cursor ไปช่องชื่อรายการ เตรียมกรอกชิ้นต่อไป

        // ถ้ามีการบันทึกข้อมูลลง localStorage ก็ต้องเรียกใช้ตรงนี้ด้วย
        // console.log("Updated shop state:", shop); // ดูข้อมูลใน console (ถ้าต้องการ)
    }


    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp (V14) ---");
        // เช็คว่าหา div แสดง loading/error เจอมั้ย
        if (!loadingErrorDiv) {
            console.error("หา #loading-error-message ไม่เจอ!");
            return;
        }
        // แสดงข้อความว่ากำลังโหลด
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...';
        loadingErrorDiv.style.display = 'block';
        loadingErrorDiv.style.backgroundColor = '#fffbeb'; // สีเหลืองอ่อน
        loadingErrorDiv.style.color = '#b45309';
        loadingErrorDiv.style.borderColor = '#fef3c7';

        let fetchSuccess = false; // ตัวแปรเช็คว่าโหลดไฟล์สำเร็จมั้ย
        try {
            // ดึงข้อมูล items.json (ใช้ no-cache เพื่อให้ได้ไฟล์ล่าสุดเสมอ)
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' });
            // ถ้าโหลดไม่ได้ (เช่น 404) ให้โยน error
            if (!response.ok) throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status})`);
            // แปลงข้อมูล JSON เป็น JavaScript Array
            const jsonData = await response.json();
            // เช็คว่าข้อมูลที่ได้เป็น Array จริงๆ
            if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`);

            // ถ้าทุกอย่างผ่าน ก็เก็บข้อมูลไว้ใน masterItemList
            masterItemList = jsonData;
            fetchSuccess = true; // ตั้งค่าว่าโหลดสำเร็จ

            // แสดงข้อความว่าโหลดสำเร็จ
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`;
            loadingErrorDiv.style.backgroundColor = '#f0fdf4'; // สีเขียวอ่อน
            loadingErrorDiv.style.color = '#15803d';
            loadingErrorDiv.style.borderColor = '#dcfce7';
            // ซ่อนข้อความหลังจาก 3 วินาที
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 3000);

            // สร้าง datalist สำหรับรายการสินค้า
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList);

        } catch (error) { // ถ้าเกิดข้อผิดพลาดระหว่างโหลดหรือแปลง JSON
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error);
            // แสดงข้อความ error
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) เช็คไฟล์ items.json หรือเปิดผ่าน Live Server ดูนะ`;
            loadingErrorDiv.style.backgroundColor = '#fee2e2'; // สีแดงอ่อน
            loadingErrorDiv.style.color = '#991b1b';
            loadingErrorDiv.style.borderColor = '#fecaca';
            loadingErrorDiv.style.display = 'block'; // แสดงค้างไว้

            // V14: ถ้าโหลดไฟล์ไม่ได้ ให้ใช้ข้อมูลตัวอย่างแทน
            // ใช้ JSON.parse(JSON.stringify(...)) เพื่อเป็นการ deep copy ป้องกันการแก้ไข initialShopsData โดยตรง
            shops = JSON.parse(JSON.stringify(initialShopsData));
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้นแทน");
        } finally { // ส่วนนี้จะทำงานเสมอ ไม่ว่า try จะสำเร็จหรือเกิด error
            // สร้าง datalist สำหรับหน่วยนับเสมอ
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);

            // V14: เช็คเผื่อกรณี fetch ไม่สำเร็จ แต่ catch ไม่ทำงาน (ซึ่งไม่น่าเกิด)
            // ถ้า fetch ไม่สำเร็จ และ state 'shops' ยังว่างอยู่ ให้ใช้ข้อมูลตัวอย่าง
            if (!fetchSuccess && shops.length === 0) {
                 shops = JSON.parse(JSON.stringify(initialShopsData)); // Deep copy
            }

            // V14: เรียก renderShops() เพื่อแสดงผลร้านค้าจาก state 'shops'
            // ซึ่งอาจจะเป็นข้อมูลว่าง, ข้อมูลตัวอย่าง, หรือข้อมูลที่โหลดมา (ถ้ามีการโหลดข้อมูลร้านค้า)
            renderShops();
            console.log("--- initializeApp เสร็จสิ้น (V14) ---");
        }
    }

    // --- ตั้งค่า Event Listeners หลัก ---
    // ปุ่ม "เพิ่มร้านค้าใหม่"
    addShopButton?.addEventListener('click', addShop);
    // ปุ่ม "ดูสรุปรายการทั้งหมด"
    overallSummaryButton?.addEventListener('click', () => showSummary()); // เรียก showSummary แบบไม่ส่ง id
    // ปุ่ม X ปิด Modal
    modalCloseButton?.addEventListener('click', closeModal);
    // ปุ่ม "คัดลอก" ใน Modal
    copySummaryButton?.addEventListener('click', copySummaryToClipboard);
    // ปุ่ม "ปิด" ใน Modal
    closeModalActionButton?.addEventListener('click', closeModal);
    // คลิกนอก Modal แล้วปิด Modal
    window.addEventListener('click', (event) => {
        if (event.target == summaryModal) { // ถ้า element ที่คลิกคือตัว Modal เอง (พื้นหลังสีเทา)
            closeModal();
        }
    });

    // V14: ใช้ Event Delegation สำหรับปุ่ม "เพิ่มรายการ" (+) ที่อยู่ในแต่ละร้าน
    // ดักฟัง event 'click' ที่ container หลักของร้านค้า (#shops-container)
    // แล้วค่อยเช็คข้างในฟังก์ชัน handleAddItemClick ว่า element ที่ถูกคลิกคือปุ่ม .entry-add-btn หรือไม่
    shopsContainer?.addEventListener('click', handleAddItemClick);


    // --- เริ่มต้นการทำงาน ---
    // เรียกฟังก์ชัน initializeApp() เพื่อเริ่มโหลดข้อมูลและวาดหน้าจอ
    initializeApp();

}); // ปิด DOMContentLoaded listener
