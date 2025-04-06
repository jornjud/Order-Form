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
    const LOCAL_STORAGE_KEY = 'maoOrderFormShopsV1'; // Key for localStorage

    // --- State Variables ---
    let masterItemList = [];
    let shops = []; // Stateหลัก เก็บข้อมูลร้านค้าและรายการ
    let activeShopId = null; // ID ของแท็บที่กำลังเปิดอยู่
    let summaryModalShopId = null; // ID ของร้านที่กำลังดูใน Modal สรุป

    // ร้านค้าเริ่มต้น (ใช้เมื่อไม่มีข้อมูลใน localStorage)
    const initialShopsData = [
         { id: `shop-init-${Date.now()+1}`, name: 'น้าไฝ', items: [] },
         { id: `shop-init-${Date.now()+2}`, name: 'น้าไพ', items: [] },
         { id: `shop-init-${Date.now()+3}`, name: 'น้ารุ่ง', items: [] },
    ];

    // --- Save/Load Functions ---
    /** บันทึกข้อมูล shops array ลง localStorage */
    function saveShopsToLocalStorage() {
        try {
            const jsonString = JSON.stringify(shops);
            localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
            console.log(`ข้อมูลร้านค้าถูกบันทึกลง localStorage (${new Date().toLocaleTimeString()})`);
        } catch (error) {
            console.error("เกิดข้อผิดพลาดตอนบันทึกข้อมูลลง localStorage:", error);
        }
    }
    /** โหลดข้อมูล shops array จาก localStorage */
    function loadShopsFromLocalStorage() {
        const savedDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedDataString) {
            console.log("พบข้อมูลใน localStorage, กำลังโหลด...");
            try {
                const parsedData = JSON.parse(savedDataString);
                if (Array.isArray(parsedData)) {
                    // Basic validation: Check if structure looks like shop data
                    if (parsedData.every(shop => shop && typeof shop.id === 'string' && typeof shop.name === 'string' && Array.isArray(shop.items))) {
                        shops = parsedData;
                        console.log(`ข้อมูลร้านค้า ${shops.length} ร้าน ถูกโหลดจาก localStorage สำเร็จ`);
                        return true; // Success
                    } else {
                        console.warn("ข้อมูลใน localStorage มีโครงสร้างไม่ถูกต้อง, จะใช้ค่าเริ่มต้นแทน");
                        localStorage.removeItem(LOCAL_STORAGE_KEY); // Remove invalid data
                        return false; // Invalid structure
                    }
                } else {
                     console.warn("ข้อมูลใน localStorage ไม่ใช่ Array, จะใช้ค่าเริ่มต้นแทน");
                     localStorage.removeItem(LOCAL_STORAGE_KEY); // Remove invalid data
                     return false; // Not an array
                }
            } catch (error) {
                console.error("เกิด Error ตอนแปลงข้อมูลจาก localStorage:", error);
                localStorage.removeItem(LOCAL_STORAGE_KEY); // Remove corrupted data
                return false; // Parsing error
            }
        } else {
            console.log("ไม่พบข้อมูลใน localStorage");
            return false; // No data found
        }
    }

    // --- Rendering Functions ---

    /** วาดแถบแท็บร้านค้าใหม่ทั้งหมด */
    function renderTabs() {
        console.log("renderTabs called. ActiveShopId:", activeShopId);
        if (!shopTabsContainer || !addTabButton) { console.error("renderTabs: Missing elements"); return; }

        // Remember focus to restore it later (improves usability)
        const previouslyFocusedElement = document.activeElement;

        // Clear existing tabs except for the add button and input container
        Array.from(shopTabsContainer.children).forEach(child => {
            if (child !== addTabButton && child !== newShopInputContainer) {
                shopTabsContainer.removeChild(child);
            }
        });

        // Create and append tab buttons for each shop
        shops.forEach(shop => {
            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button';
            tabButton.dataset.shopId = shop.id;

            const tabNameSpan = document.createElement('span');
            tabNameSpan.className = 'tab-name';
            tabNameSpan.textContent = shop.name;

            const deleteTabBtn = document.createElement('button');
            deleteTabBtn.className = 'delete-tab-btn';
            deleteTabBtn.innerHTML = '&times;'; // Use HTML entity for 'X'
            deleteTabBtn.title = `ลบร้าน ${shop.name}`;
            deleteTabBtn.dataset.shopId = shop.id; // Important for deletion logic

            tabButton.appendChild(tabNameSpan);
            tabButton.appendChild(deleteTabBtn);

            if (shop.id === activeShopId) {
                tabButton.classList.add('active');
            }

            // Insert before the add button
            shopTabsContainer.insertBefore(tabButton, addTabButton);
        });

         // Try to restore focus
         if (document.body.contains(previouslyFocusedElement)) {
             try { previouslyFocusedElement.focus({ preventScroll: true }); } catch (e) {/* ignore potential errors */ }
         } else if (activeShopId) {
             // If previous focus is lost, focus the active tab
             const activeTabButton = shopTabsContainer.querySelector(`.tab-button[data-shop-id="${activeShopId}"]`);
             activeTabButton?.focus({ preventScroll: true });
         }

        updateOverallSummaryButtonVisibility(); // Show/hide summary button
    }

    /** วาดเนื้อหาของแท็บที่ถูกเลือก */
    function renderTabContent() {
        console.log("renderTabContent called. ActiveShopId:", activeShopId);
        if (!tabContentArea) { console.error("renderTabContent: Missing tabContentArea"); return; }

        tabContentArea.innerHTML = ''; // Clear previous content
        const activeShop = shops.find(shop => shop.id === activeShopId);

        if (activeShop) {
            console.log("Rendering content for shop:", activeShop.name);
            // --- Header ---
            const headerDiv = document.createElement('div');
            headerDiv.className = 'shop-header';
            const shopNameDisplay = document.createElement('span');
            shopNameDisplay.className = 'shop-name-display';
            shopNameDisplay.textContent = activeShop.name;
            // (Add rename button here if needed in the future)
            headerDiv.appendChild(shopNameDisplay);
            tabContentArea.appendChild(headerDiv);

            // --- Item Entry Area ---
            const entryArea = createItemEntryArea(activeShop.id);
            tabContentArea.appendChild(entryArea);

            // --- Item List Area ---
            const itemListArea = document.createElement('div');
            itemListArea.className = 'item-list-area';
            itemListArea.id = `item-list-${activeShop.id}`; // Useful ID
            const ul = document.createElement('ul');
            if (activeShop.items.length > 0) {
                activeShop.items.forEach((item, index) => {
                    ul.appendChild(createShopItemRow(activeShop.id, item, index));
                });
            } else {
                ul.innerHTML = '<li class="item-list-placeholder">ยังไม่มีรายการในร้านนี้...</li>';
            }
            itemListArea.appendChild(ul);
            tabContentArea.appendChild(itemListArea);

            // --- Action Buttons ---
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'shop-actions';

            const clearBtn = document.createElement('button');
            clearBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> ล้างรายการร้านนี้`;
            clearBtn.className = 'action-button clear-items-btn';
            clearBtn.type = "button";
            clearBtn.dataset.shopId = activeShop.id; // Link button to shop

            const summarizeBtn = document.createElement('button');
            summarizeBtn.textContent = '📋 สรุปรายการร้านนี้';
            summarizeBtn.className = 'action-button summarize-btn';
            summarizeBtn.type = "button";
            summarizeBtn.addEventListener('click', () => showSummary(activeShopId)); // Use closure for shopId

            buttonsDiv.appendChild(clearBtn);
            buttonsDiv.appendChild(summarizeBtn);
            tabContentArea.appendChild(buttonsDiv);

            if(noShopPlaceholder) noShopPlaceholder.style.display = 'none'; // Hide placeholder
        } else {
            // No active shop selected (e.g., after deleting the last shop)
            console.log("No active shop, showing placeholder.");
             if(noShopPlaceholder) noShopPlaceholder.style.display = 'block'; // Show placeholder
        }
    }

    /** สร้างแถวสำหรับแสดงรายการสินค้าใน List Area */
    function createShopItemRow(shopId, itemData, index) {
        const li = document.createElement('li');
        li.className = 'shop-item-row';
        li.dataset.shopId = shopId;
        li.dataset.itemIndex = index; // Store index for editing/deleting

        // --- Display Mode Elements ---
        const displayDiv = document.createElement('div');
        displayDiv.className = 'item-display-mode';

        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'item-quantity';
        quantitySpan.textContent = itemData.quantity;

        const unitSpan = document.createElement('span');
        unitSpan.className = 'item-unit';
        unitSpan.textContent = itemData.unit || '?'; // Handle missing unit

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = itemData.item;

        const actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.className = 'item-actions-display';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-item-inline-btn';
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"/></svg>`;
        editBtn.title = `แก้ไข ${itemData.item}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-item-inline-btn';
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        deleteBtn.title = `ลบ ${itemData.item}`;

        actionButtonsDiv.appendChild(editBtn);
        actionButtonsDiv.appendChild(deleteBtn);

        displayDiv.appendChild(quantitySpan);
        displayDiv.appendChild(unitSpan);
        displayDiv.appendChild(nameSpan);
        displayDiv.appendChild(actionButtonsDiv);

        // --- Edit Mode Elements (Initially Hidden) ---
        const editDiv = document.createElement('div');
        editDiv.className = 'item-edit-mode hidden'; // Start hidden

        const editQuantityInput = document.createElement('input');
        editQuantityInput.type = 'number';
        editQuantityInput.className = 'edit-quantity-inline';
        editQuantityInput.value = itemData.quantity;
        editQuantityInput.min = "0";
        editQuantityInput.step = "any";

        const editUnitInput = document.createElement('input');
        editUnitInput.type = 'text';
        editUnitInput.className = 'edit-unit-inline';
        editUnitInput.value = itemData.unit || '';
        editUnitInput.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); // Link to datalist

        const editNameSpan = document.createElement('span'); // Name is not editable inline here
        editNameSpan.className = 'item-name-edit-display';
        editNameSpan.textContent = itemData.item;

        const editActionButtonsDiv = document.createElement('div');
        editActionButtonsDiv.className = 'item-actions-edit';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-edit-inline-btn';
        saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>`;
        saveBtn.title = 'บันทึกการแก้ไข';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-edit-inline-btn';
        cancelBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        cancelBtn.title = 'ยกเลิกการแก้ไข';

        editActionButtonsDiv.appendChild(saveBtn);
        editActionButtonsDiv.appendChild(cancelBtn);

        editDiv.appendChild(editQuantityInput);
        editDiv.appendChild(editUnitInput);
        editDiv.appendChild(editNameSpan);
        editDiv.appendChild(editActionButtonsDiv);

        // Append both modes to the list item
        li.appendChild(displayDiv);
        li.appendChild(editDiv);

        return li;
    }

    // --- UI Creation Functions ---
    function createOrUpdateDatalist(listId, optionsArray) {
        let datalist = document.getElementById(listId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            // It's generally better to append to a known container if possible,
            // but appending to body should work.
            document.body.appendChild(datalist);
            // Re-fetch after appending just in case
            datalist = document.getElementById(listId);
            if (!datalist) { // Check again
                console.error(`!!! ไม่สามารถสร้าง/หา datalist ID: ${listId} ได้!`);
                return; // Stop if datalist creation failed
            }
        }

        datalist.innerHTML = ''; // Clear existing options
        if (!Array.isArray(optionsArray)) {
             console.error(`ข้อมูลสำหรับ datalist ID: ${listId} ไม่ใช่ Array!`);
             return; // Exit if data is not an array
        }
         // Sort options alphabetically according to Thai locale
        const sortedOptions = [...optionsArray].sort((a, b) => a.localeCompare(b, 'th'));

        sortedOptions.forEach(optionValue => {
             // Ensure it's a non-empty string before adding
            if (typeof optionValue === 'string' && optionValue.trim() !== '') {
                try {
                    const option = document.createElement('option');
                    option.value = optionValue;
                    datalist.appendChild(option);
                } catch (e) {
                    // Log error if adding an option fails (e.g., invalid character)
                    console.error(`เกิด Error ตอนเพิ่ม option "${optionValue}" ใน datalist ID: ${listId}`, e);
                }
            }
        });
    }
    function createUnitInputEntry(selectedUnit = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'หน่วย';
        input.className = 'entry-unit';
        input.value = selectedUnit;
        input.setAttribute('list', GLOBAL_UNITS_DATALIST_ID); // Link to units datalist
        return input;
    }
    function createItemInputEntry(selectedItem = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ใส่รายการ กด + เพื่อเพิ่ม...';
        input.className = 'entry-item';
        input.value = selectedItem;
        input.setAttribute('list', GLOBAL_ITEMS_DATALIST_ID); // Link to items datalist
        return input;
    }
    function createItemEntryArea(shopId) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'item-entry-area';
        entryDiv.dataset.shopId = shopId; // Link entry area to shop

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.placeholder = 'จำนวน';
        quantityInput.min = "0"; // Allow non-integer quantities
        quantityInput.step = "any";
        quantityInput.className = 'entry-quantity';

        const unitInput = createUnitInputEntry(); // Create unit input
        const itemInput = createItemInputEntry(); // Create item input

        const addBtn = document.createElement('button');
        addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        addBtn.className = 'action-button entry-add-btn';
        addBtn.title = "เพิ่มรายการนี้";
        addBtn.type = "button"; // Ensure it doesn't submit a form if wrapped

        const statusDiv = document.createElement('div');
        statusDiv.className = 'entry-status'; // For showing add success/error

        entryDiv.appendChild(quantityInput);
        entryDiv.appendChild(unitInput);
        entryDiv.appendChild(itemInput);
        entryDiv.appendChild(addBtn);
        entryDiv.appendChild(statusDiv); // Add status div to the layout
        return entryDiv;
    }

    // --- Event Handlers ---

    /** จัดการการคลิกแท็บร้านค้า */
    function handleTabClick(event) {
        // Prevent tab selection if the click was on the delete button area
        if (event.target.closest('.delete-tab-btn')) {
            // Stop propagation might be too aggressive, let's just return
             // event.stopPropagation(); // Avoid stopping propagation unless necessary
            return;
        }
        const clickedTab = event.target.closest('.tab-button');
        if (!clickedTab || clickedTab.classList.contains('active')) {
            return; // Clicked outside a tab or on the already active tab
        }
        const newActiveShopId = clickedTab.dataset.shopId;
        console.log("Tab selected:", newActiveShopId);
        if (newActiveShopId) {
            activeShopId = newActiveShopId;
            renderTabs(); // Re-render tabs to update active state
            renderTabContent(); // Render content for the new active tab
        }
    }
    /** จัดการการคลิกปุ่ม + เพื่อเพิ่มร้านใหม่ */
    function handleAddTabClick() {
        console.log("Add tab button clicked");
        if (newShopInputContainer && addTabButton && newShopNameInput) {
            newShopInputContainer.classList.remove('hidden');
            addTabButton.classList.add('hidden');
            newShopNameInput.value = '';
            newShopNameInput.focus();
            console.log("Showing new shop input");
        } else {
            console.error("handleAddTabClick: Missing required elements (input container, add button, or input field)");
        }
    }
    /** จัดการการยกเลิกเพิ่มร้านใหม่ */
    function handleCancelNewShop() {
        console.log("Cancel new shop");
        if (newShopInputContainer && addTabButton) {
            newShopInputContainer.classList.add('hidden');
            addTabButton.classList.remove('hidden');
            newShopNameInput.value = ''; // Clear input
        } else {
            console.error("handleCancelNewShop: Missing required elements (input container or add button)");
        }
    }
    /** จัดการการบันทึกร้านค้าใหม่ */
    function handleSaveNewShop() {
        console.log("Save new shop clicked");
        if (!newShopNameInput) { console.error("handleSaveNewShop: Missing newShopNameInput"); return; }

        const newName = newShopNameInput.value.trim();
        if (!newName) {
            alert("เพื่อน! ยังไม่ได้ใส่ชื่อร้านเลยนะ");
            newShopNameInput.focus();
            return;
        }
        // Check for duplicate shop name (case-insensitive)
        if (shops.some(shop => shop.name.toLowerCase() === newName.toLowerCase())) {
            alert(`เพื่อน! มีร้านชื่อ "${newName}" อยู่แล้วนะ`);
            newShopNameInput.focus();
            newShopNameInput.select();
            return;
        }

        const newShopId = `shop-${Date.now()}`; // Simple unique ID
        const newShopData = { id: newShopId, name: newName, items: [] };
        shops.push(newShopData); // Add to state
        activeShopId = newShopId; // Make the new shop active
        console.log("New shop added:", newShopData);

        renderTabs(); // Update UI
        renderTabContent(); // Show new shop content
        handleCancelNewShop(); // Hide input area
        saveShopsToLocalStorage(); // Persist changes
    }
     /** จัดการการกดปุ่มลบร้าน (X บนแท็บ) */
    function handleDeleteShopClick(event) {
        const deleteButton = event.target.closest('.delete-tab-btn');
        if (!deleteButton) return; // Click wasn't on a delete button

        const shopIdToDelete = deleteButton.dataset.shopId;
        const shopToDelete = shops.find(s => s.id === shopIdToDelete);
        console.log("Delete tab button clicked for:", shopIdToDelete, shopToDelete?.name);

        if (!shopToDelete) {
             console.error("Could not find shop to delete with ID:", shopIdToDelete);
             return; // Should not happen if UI is correct
        }

        // Confirmation dialog
        if (confirm(`⚠️ ยืนยันจะลบร้าน "${shopToDelete.name}" จริงดิ? ข้อมูลของในร้านนี้จะหายหมดนะ!`)) {
            const indexToDelete = shops.findIndex(s => s.id === shopIdToDelete);
            if (indexToDelete > -1) {
                shops.splice(indexToDelete, 1); // Remove shop from state
                console.log("Shop removed from state.");

                // Determine the next active tab
                if (activeShopId === shopIdToDelete) { // If deleting the active tab
                    if (shops.length === 0) {
                        activeShopId = null; // No shops left
                    } else if (indexToDelete >= shops.length) {
                        // If the deleted item was the last one, activate the new last one
                        activeShopId = shops[shops.length - 1].id;
                    } else {
                        // Otherwise, activate the one at the same index (which is the next one)
                        activeShopId = shops[indexToDelete].id;
                    }
                    console.log("New activeShopId:", activeShopId);
                }

                renderTabs(); // Update UI
                renderTabContent();
                saveShopsToLocalStorage(); // Persist changes
            } else {
                 console.error("Shop index not found after confirm! State might be inconsistent.");
            }
        } else {
             console.log("User cancelled shop deletion.");
        }
    }
    /** จัดการการกดปุ่ม "เพิ่มรายการ" (+) และแสดงผลในลิสต์ทันที */
    function handleAddItemClick(event) {
        const addButton = event.target.closest('.entry-add-btn');
        if (!addButton) return; // Click wasn't on an add button

        const entryArea = addButton.closest('.item-entry-area');
        if (!entryArea) { console.error("Could not find parent entry area for add button"); return; }

        const shopId = entryArea.dataset.shopId;
        const quantityInput = entryArea.querySelector('.entry-quantity');
        const unitInput = entryArea.querySelector('.entry-unit');
        const itemInput = entryArea.querySelector('.entry-item');

        if (!shopId || !quantityInput || !unitInput || !itemInput) {
            console.error("Missing input elements in entry area for shop:", shopId);
            return;
        }

        const quantity = quantityInput.value.trim();
        const unit = unitInput.value.trim();
        const itemName = itemInput.value.trim();
        const itemNameLower = itemName.toLowerCase(); // For case-insensitive check

        console.log(`Add item attempt: Qty=${quantity}, Unit=${unit}, Item=${itemName}, Shop=${shopId}`);

        // --- Input Validation ---
        if (!itemName) {
            showEntryStatus(entryArea, '⚠️ ยังไม่ได้ใส่ชื่อรายการเลยเพื่อน!', true);
            itemInput.focus();
            return;
        }
        if (!quantity) {
             showEntryStatus(entryArea, '⚠️ ลืมใส่จำนวนรึเปล่า?', true);
             quantityInput.focus();
             return;
        }
        // Potentially add validation for quantity (e.g., must be > 0)
        // if (parseFloat(quantity) <= 0) { ... }

        const shop = shops.find(s => s.id === shopId);
        if (!shop) {
            console.error("Could not find shop in state with ID:", shopId);
            showEntryStatus(entryArea, '❌ เกิดข้อผิดพลาด: ไม่เจอร้านค้านี้', true);
            return;
        }

        // --- Check for Duplicates (case-insensitive) ---
        const isDuplicate = shop.items.some(item => item.item.toLowerCase() === itemNameLower);
        if (isDuplicate) {
            console.log("Duplicate item found:", itemName);
            showEntryStatus(entryArea, `⚠️ "${itemName}" มีในร้านนี้แล้ว!`, true);
            itemInput.focus();
            itemInput.select();
            return;
        }

        // --- Add Item to State ---
        const newItem = { quantity: quantity, unit: unit || '?', item: itemName }; // Use '?' if unit is empty
        shop.items.push(newItem);
        const newItemIndex = shop.items.length - 1; // Get index for potential row creation
        console.log("Item added to state:", shop.items);

        // --- Update UI ---
        const listAreaUl = tabContentArea.querySelector(`#item-list-${shopId} ul`);
        if (listAreaUl) {
            const placeholder = listAreaUl.querySelector('.item-list-placeholder');
            placeholder?.remove(); // Remove placeholder if it exists

            const newItemRow = createShopItemRow(shopId, newItem, newItemIndex);
            listAreaUl.appendChild(newItemRow);
            // Scroll to the bottom of the list area to show the new item
            listAreaUl.parentElement.scrollTop = listAreaUl.parentElement.scrollHeight;
        } else {
            console.error("Could not find list area UL for shop:", shopId);
            // Fallback: re-render the whole content if list isn't found (less efficient)
            renderTabContent();
        }

        showEntryStatus(entryArea, `✅ เพิ่ม "${itemName}" แล้ว!`, false); // Success message
        // Clear inputs and focus item input for next entry
        quantityInput.value = '';
        unitInput.value = '';
        itemInput.value = '';
        itemInput.focus();

        saveShopsToLocalStorage(); // Persist changes
    }
     /** จัดการการกดปุ่มลบรายการ (ถังขยะ) ใน List Area */
    function handleDeleteItemInline(event) {
        const deleteButton = event.target.closest('.delete-item-inline-btn');
        if (!deleteButton) return;

        const itemRow = deleteButton.closest('.shop-item-row');
        if (!itemRow) return;

        const shopId = itemRow.dataset.shopId;
        const itemIndex = parseInt(itemRow.dataset.itemIndex, 10); // Get index from data attribute

        if (shopId === undefined || isNaN(itemIndex)) {
            console.error("Could not get shopId or itemIndex for inline delete");
            return;
        }

        const shop = shops.find(s => s.id === shopId);
        if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) {
            console.error("Could not find shop or item in state for inline delete:", shopId, itemIndex);
            return; // Prevent errors if state is inconsistent
        }

        const itemToDelete = shop.items[itemIndex];
        // Confirmation dialog
        if (confirm(`⚠️ ยืนยันลบรายการ "${itemToDelete.item}" (${itemToDelete.quantity} ${itemToDelete.unit}) จริงดิ?`)) {
            shop.items.splice(itemIndex, 1); // Remove item from state array
            console.log("Item deleted inline from state.");

             // --- Update UI ---
             // Easiest way is to re-render the content area, which will update indices correctly
             renderTabContent();

             // Show status message in the entry area
             const entryArea = tabContentArea.querySelector(`.item-entry-area[data-shop-id="${shopId}"]`);
             if (entryArea) {
                 showEntryStatus(entryArea, `🗑️ ลบรายการ "${itemToDelete.item}" แล้ว`, false);
             }

            saveShopsToLocalStorage(); // Persist changes
        }
    }
    /** แสดงสถานะการเพิ่ม/ซ้ำ ใน Entry Area */
    function showEntryStatus(entryAreaElement, message, isError = false) {
        const statusDiv = entryAreaElement?.querySelector('.entry-status');
        if (!statusDiv) return; // Exit if status div not found

        statusDiv.textContent = message;
        statusDiv.className = `entry-status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block';

        // Hide status message after a delay
        setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.textContent = '';
            statusDiv.className = 'entry-status'; // Reset class
        }, 2500); // Hide after 2.5 seconds
    }
    /** จัดการการกดปุ่มแก้ไข (ดินสอ) ใน List Area */
    function handleEditItemInline(event) {
        const editButton = event.target.closest('.edit-item-inline-btn');
        if (!editButton) return;

        const itemRow = editButton.closest('.shop-item-row');
        if (!itemRow) return;

        // Find display and edit modes within this row
        const displayMode = itemRow.querySelector('.item-display-mode');
        const editMode = itemRow.querySelector('.item-edit-mode');

        if (displayMode && editMode) {
            // --- Pre-fill edit inputs with current data ---
            const shopId = itemRow.dataset.shopId;
            const itemIndex = parseInt(itemRow.dataset.itemIndex, 10);
            const shop = shops.find(s => s.id === shopId);
            if (shop && shop.items[itemIndex]) {
                const currentItem = shop.items[itemIndex];
                const editQuantityInput = editMode.querySelector('.edit-quantity-inline');
                const editUnitInput = editMode.querySelector('.edit-unit-inline');
                if(editQuantityInput) editQuantityInput.value = currentItem.quantity;
                if(editUnitInput) editUnitInput.value = currentItem.unit || '';
            }
            // --- Switch visibility ---
            displayMode.classList.add('hidden');
            editMode.classList.remove('hidden');

            // Focus the quantity input for quick editing
            const quantityInput = editMode.querySelector('.edit-quantity-inline');
            quantityInput?.focus();
            quantityInput?.select(); // Select text for easy replacement
        } else {
            console.error("Could not find display/edit mode divs in item row");
        }
    }
    /** จัดการการกดปุ่มบันทึก (เครื่องหมายถูก) ในโหมดแก้ไข Inline */
    function handleSaveEditInline(event) {
        const saveButton = event.target.closest('.save-edit-inline-btn');
        if (!saveButton) return;

        const itemRow = saveButton.closest('.shop-item-row');
        const editMode = saveButton.closest('.item-edit-mode');
        const displayMode = itemRow?.querySelector('.item-display-mode');

        if (!itemRow || !editMode || !displayMode) return; // Ensure all parts exist

        const shopId = itemRow.dataset.shopId;
        const itemIndex = parseInt(itemRow.dataset.itemIndex, 10);
        const editQuantityInput = editMode.querySelector('.edit-quantity-inline');
        const editUnitInput = editMode.querySelector('.edit-unit-inline');

        if (shopId === undefined || isNaN(itemIndex) || !editQuantityInput || !editUnitInput) {
            console.error("Cannot find elements or data for saving inline edit");
            return;
        }

        const newQuantity = editQuantityInput.value.trim();
        const newUnit = editUnitInput.value.trim() || '?'; // Default to '?' if empty

        // Basic validation for quantity
        if (!newQuantity || parseFloat(newQuantity) < 0) { // Allow 0, but not empty or negative
            alert("เพื่อน! จำนวนต้องไม่ว่าง และห้ามติดลบนะ");
            editQuantityInput.focus();
            return;
        }

        const shop = shops.find(s => s.id === shopId);
        if (!shop || !shop.items || itemIndex < 0 || itemIndex >= shop.items.length) {
            console.error("Cannot find item in state to save edit:", shopId, itemIndex);
            alert("เกิดข้อผิดพลาด: ไม่พบรายการที่จะแก้ไข");
            handleCancelEditInline(event); // Revert UI
            return;
        }

        // --- Update State ---
        shop.items[itemIndex].quantity = newQuantity;
        shop.items[itemIndex].unit = newUnit;
        console.log(`Item ${itemIndex} updated in shop ${shopId}:`, shop.items[itemIndex]);

        // --- Update Display Mode UI ---
        const quantitySpan = displayMode.querySelector('.item-quantity');
        const unitSpan = displayMode.querySelector('.item-unit');
        if (quantitySpan) quantitySpan.textContent = newQuantity;
        if (unitSpan) unitSpan.textContent = newUnit;

        // --- Switch Modes ---
        editMode.classList.add('hidden');
        displayMode.classList.remove('hidden');

        saveShopsToLocalStorage(); // Persist changes
    }
    /** จัดการการกดปุ่มยกเลิก (X) ในโหมดแก้ไข Inline */
    function handleCancelEditInline(event) {
        const cancelButton = event.target.closest('.cancel-edit-inline-btn');
        if (!cancelButton) return;

        const itemRow = cancelButton.closest('.shop-item-row');
        const editMode = cancelButton.closest('.item-edit-mode');
        const displayMode = itemRow?.querySelector('.item-display-mode');

        // Simply switch back to display mode without saving
        if (itemRow && editMode && displayMode) {
            editMode.classList.add('hidden');
            displayMode.classList.remove('hidden');
        }
    }

    /** จัดการการกดปุ่ม "ล้างรายการร้านนี้" (Delegated) */
    function handleClearShopItems(event) {
        const clearButton = event.target.closest('.clear-items-btn');
        if (!clearButton) return;

        const shopId = clearButton.dataset.shopId;
        const shop = shops.find(s => s.id === shopId);

        if (!shop) {
            console.error("Cannot find shop to clear items for ID:", shopId);
            return;
        }
        if (shop.items.length === 0) {
            alert(`ร้าน "${shop.name}" ไม่มีรายการให้ล้างอยู่แล้วเพื่อน`);
            return;
        }

        if (confirm(`**คำเตือน!** ยืนยันล้างรายการของทั้งหมดในร้าน "${shop.name}" จริงดิ?\nร้านค้าจะยังอยู่ แต่ของจะหายหมดนะ!`)) {
            shop.items = []; // Clear items in state
            console.log(`Cleared items for shop ${shopId}`);

            saveShopsToLocalStorage(); // Save the change
            renderTabContent(); // Re-render the current tab's content

            // Show status message
            const entryArea = tabContentArea.querySelector(`.item-entry-area[data-shop-id="${shopId}"]`);
            if (entryArea) {
                showEntryStatus(entryArea, `🧹 ล้างรายการร้าน "${shop.name}" เรียบร้อย!`, false);
            }
        }
    }

    // --- Core Logic Functions ---
    function updateOverallSummaryButtonVisibility() {
        // Show button only if there are shops
        const shopSectionsExist = shops.length > 0;
        if (overallSummaryContainer) {
            overallSummaryContainer.style.display = shopSectionsExist ? 'block' : 'none';
        }
    }
    /** ดึงข้อมูลจาก State Array ('shops') สำหรับสร้างสรุป */
    function getOrderData(shopId = null) {
        if (shopId) { // Get data for a single shop
            const shop = shops.find(s => s.id === shopId);
            if (shop) {
                // Return structure consistent with overall summary for reuse
                return [{ shopId: shop.id, shopName: shop.name, items: [...shop.items] }];
            } else {
                return []; // Return empty array if shop not found
            }
        } else { // Get data for all shops
            // Filter out empty shops unless they are newly created (basic check)
            return shops
                // .filter(shop => shop.items.length > 0 || shop.name !== 'ร้านค้าใหม่ (คลิกแก้ชื่อ)') // Optionally filter empty shops
                .map(shop => ({
                    shopId: shop.id,
                    shopName: shop.name,
                    // Create a copy of items array to prevent accidental modification
                    items: [...shop.items]
                }));
        }
    }
    function formatThaiTimestamp() {
        const now = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Bangkok' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };

        try {
             // Get Buddhist year
             const yearFormatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', timeZone: 'Asia/Bangkok' });
             const buddhistYear = yearFormatter.format(now);

             // Format date and replace Gregorian year with Buddhist year
             const formattedDate = now.toLocaleDateString('th-TH', dateOptions).replace(/\d{4}/, buddhistYear);
             const formattedTime = now.toLocaleTimeString('th-TH', timeOptions);

             return `สรุป ณ ${formattedDate} เวลา ${formattedTime} น.`;
        } catch (e) {
             console.error("เกิดข้อผิดพลาดในการจัดรูปแบบวันที่:", e);
             // Fallback to basic Thai locale string
             return `สรุป ณ ${now.toLocaleString('th-TH')}`;
        }
    }
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    /** แสดง Modal สรุป (Read-Only + 4 Columns + Footer) */
    function showSummary(shopId = null) {
        console.log("showSummary called for shopId:", shopId);
        if (!summaryModal || !summaryContent || !summaryTimestampElem || !modalActionsDiv) {
            console.error("showSummary: Missing required modal elements"); return;
        }
        summaryModalShopId = shopId; // Store which shop(s) are being summarized
        const overallTimestamp = formatThaiTimestamp();
        summaryTimestampElem.textContent = overallTimestamp; // Set timestamp in modal

        console.log("Calling getOrderData with:", summaryModalShopId);
        const data = getOrderData(summaryModalShopId); // Get data for specified shop or all shops
        console.log("Data received from getOrderData:", JSON.stringify(data).substring(0, 200) + '...'); // Log truncated data

        summaryContent.innerHTML = ''; // Clear previous summary content
        if (copyStatus) copyStatus.style.display = 'none'; // Hide copy status message

        if (data.length === 0) {
             summaryContent.innerHTML = '<p style="text-align: center; color: grey; margin-top: 1rem;">ไม่มีรายการสั่งซื้อว่ะเพื่อน</p>';
        } else {
            let modalHtml = '';
            data.forEach(shopData => {
                const currentShopId = shopData.shopId;
                if (!currentShopId) { console.error("Shop data missing ID in showSummary loop:", shopData); return; } // Skip if data is malformed

                const shopNameEscaped = escapeHtml(shopData.shopName);
                // Shop Header
                modalHtml += `<h3 style="font-size: 1.1rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.25rem; color: #1f2937; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb;">🛒 ${shopNameEscaped}</h3>`;
                 // Add individual timestamp only for overall summary
                 if (summaryModalShopId === null) { // If showing all shops
                     const timePart = overallTimestamp.split(' เวลา ')[1] || '';
                     const datePart = overallTimestamp.split(' เวลา ')[0].replace('สรุป ณ ','');
                     modalHtml += `<p class="shop-timestamp-print" style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; text-align: left;">(ข้อมูล ณ ${datePart} ${timePart})</p>`;
                 }

                // Table Header (4 columns)
                modalHtml += `<table class="summary-table" data-shop-id="${currentShopId}" style="width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; font-size: 0.9rem;"><thead><tr><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; width: 15%; font-weight: 600;">จำนวน</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">หน่วย</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 45%; font-weight: 600;">รายการ</th><th style="border: 1px solid #ddd; padding: 6px 8px; text-align: left; width: 20%; font-weight: 600;">ราคา/หมายเหตุ</th></tr></thead><tbody>`;

                // Table Body Rows
                if (shopData.items && shopData.items.length > 0) {
                    shopData.items.forEach((item, index) => {
                        // Add row with 4 columns (last one empty for now)
                        modalHtml += `<tr>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: top;">${escapeHtml(item.quantity)}</td>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;">${escapeHtml(item.unit)}</td>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; word-wrap: break-word;">${escapeHtml(item.item)}</td>
                                        <td style="border: 1px solid #ddd; padding: 6px 8px; vertical-align: top;"></td>
                                      </tr>`;
                    });
                } else {
                     // Show placeholder if no items
                     modalHtml += `<tr><td colspan="4" style="text-align: center; font-style: italic; color: grey; border: 1px solid #ddd; padding: 6px 8px;">(ไม่มีรายการ)</td></tr>`;
                }
                 // Table Footer (for total price - currently empty)
                 modalHtml += `</tbody><tfoot style="font-weight: bold; background-color: #f8f9fa;"><tr><td colspan="3" style="border: 1px solid #ddd; border-right: none; padding: 6px 10px 6px 8px; text-align: right;">รวมราคา:</td><td style="border: 1px solid #ddd; border-left: none; padding: 6px 8px; min-height: 1.5em;"></td></tr></tfoot>`;
                 modalHtml += `</table>`;
            });
            summaryContent.innerHTML = modalHtml;
        }
        console.log("Attempting to display modal...");
        summaryModal.style.display = 'block'; // Show the modal
        console.log("Modal display style set to 'block'.");
    }


    /** ปิด Modal */
    function closeModal() {
        if (summaryModal) summaryModal.style.display = 'none';
        summaryModalShopId = null; // Reset context
    }
    /** คัดลอกสรุป */
    function copySummaryToClipboard() {
         if (!summaryContent) return;
         let textToCopy = "";
         const currentTimestamp = formatThaiTimestamp();
         textToCopy += currentTimestamp + "\n\n"; // Add timestamp header

         const dataToCopy = getOrderData(summaryModalShopId); // Get relevant data

         if(dataToCopy.length === 0) {
             textToCopy += "(ไม่มีรายการสั่งซื้อ)";
         } else {
             dataToCopy.forEach((shopData, index) => {
                 // Use shop name without emoji prefix if needed
                 const shopNameOnly = shopData.shopName.replace(/🛒\s*/, '');
                 textToCopy += `--- ${shopNameOnly} ---\n`;
                 if (shopData.items.length > 0) {
                     shopData.items.forEach(item => {
                         textToCopy += `${item.quantity} ${item.unit} : ${item.item}\n`;
                     });
                 } else {
                     textToCopy += "(ไม่มีรายการ)\n";
                 }
                 // Add spacing between shops
                 if (index < dataToCopy.length - 1) {
                     textToCopy += "\n";
                 }
             });
         }

         // Use Clipboard API
         if (navigator.clipboard && navigator.clipboard.writeText) {
             navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                 // Success feedback
                 if (copyStatus) {
                     copyStatus.textContent = '✅ คัดลอกรายการแล้ว!';
                     copyStatus.style.color = '#059669'; // Green color for success
                     copyStatus.style.display = 'block';
                     setTimeout(() => {
                         copyStatus.style.display = 'none';
                     }, 2500); // Hide after 2.5 seconds
                 }
             }).catch(err => {
                 console.error('Clipboard copy failed:', err);
                 alert('อุ๊ปส์! ก๊อปไม่ได้ว่ะเพื่อน ลองใหม่ดิ๊');
             });
         } else {
              // Fallback for older browsers (less common now)
              // You could implement a textarea-based copy here if needed
              alert('เบราว์เซอร์นี้อาจจะไม่รองรับการคัดลอกอัตโนมัติ');
         }
    }

    // --- Initialization Function ---
    /** ฟังก์ชันหลัก เริ่มต้นแอป */
    async function initializeApp() {
        console.log("--- เริ่มต้น initializeApp ---");
        if (!loadingErrorDiv) { console.error("หา #loading-error-message ไม่เจอ!"); return; }

        // 1. Load shop data from localStorage or use initial data
        const loadedFromStorage = loadShopsFromLocalStorage();
        if (!loadedFromStorage) {
            // Use deep copy of initial data to avoid modification issues
            shops = JSON.parse(JSON.stringify(initialShopsData));
            console.warn("ใช้ข้อมูลร้านค้าเริ่มต้น");
            // Optionally save initial data to storage immediately
            // if (shops.length > 0) saveShopsToLocalStorage();
        }

        // 2. Fetch master item list
        loadingErrorDiv.textContent = '⏳ แป๊บนะเพื่อน กำลังโหลดลิสต์ของ...';
        loadingErrorDiv.style.display = 'block';
        try {
            // Fetch items.json, preventing caching
            const response = await fetch(ITEMS_JSON_PATH, { cache: 'no-cache' });
            if (!response.ok) {
                // Try to get more info from the response body on error
                let errorBody = ''; try { errorBody = await response.text(); } catch (e) {}
                throw new Error(`โหลด ${ITEMS_JSON_PATH} ไม่ได้ (${response.status}) ${errorBody}`);
            }
            const jsonData = await response.json();
            if (!Array.isArray(jsonData)) throw new Error(`ข้อมูลใน ${ITEMS_JSON_PATH} ไม่ใช่ Array`);

            masterItemList = jsonData; // Store fetched items
            loadingErrorDiv.textContent = `✅ เยี่ยม! โหลดลิสต์ของ ${masterItemList.length} รายการเรียบร้อย!`;
            setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 2000); // Shorter delay
            createOrUpdateDatalist(GLOBAL_ITEMS_DATALIST_ID, masterItemList); // Populate item datalist

        } catch (error) {
            console.error('!!! เกิดข้อผิดพลาดตอนโหลด items.json:', error);
            loadingErrorDiv.textContent = `❌ โทษทีเพื่อน โหลดลิสต์ของไม่ได้ (${error.message}) ไม่เป็นไร ยังใช้แอปได้`;
            // Don't hide the error message immediately
            // setTimeout(() => { loadingErrorDiv.style.display = 'none'; }, 5000);
        } finally {
            // 3. Populate base units datalist
            createOrUpdateDatalist(GLOBAL_UNITS_DATALIST_ID, BASE_UNITS);

            // 4. Set initial active tab
            if (shops.length > 0 && (!activeShopId || !shops.some(s => s.id === activeShopId))) {
                // If no active ID or invalid active ID, set to the first shop
                activeShopId = shops[0].id;
            } else if (shops.length === 0) {
                activeShopId = null; // No shops, no active tab
            }

            // 5. Initial Render
            renderTabs();
            renderTabContent();

            // 6. Setup Event Listeners
            setupEventListeners();
            console.log("--- initializeApp เสร็จสิ้น ---");
        }
    }

    /** ฟังก์ชันรวมการตั้งค่า Event Listeners หลัก */
    function setupEventListeners() {
        console.log("Setting up event listeners...");

        // Add Tab Button
        addTabButton?.addEventListener('click', handleAddTabClick);

        // New Shop Input Buttons
        cancelNewShopButton?.addEventListener('click', handleCancelNewShop);
        saveNewShopButton?.addEventListener('click', handleSaveNewShop);
        newShopNameInput?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { handleSaveNewShop(); } // Allow saving with Enter key
        });

        // Overall Summary Button
        if (overallSummaryButton) {
            overallSummaryButton.addEventListener('click', () => {
                console.log("Overall summary button clicked!");
                showSummary(); // Show summary for all shops
            });
            console.log("Listener added for overall summary button.");
        } else { console.error("Overall summary button not found!"); }

        // Modal Buttons
        modalCloseButton?.addEventListener('click', closeModal);
        copySummaryButton?.addEventListener('click', copySummaryToClipboard);
        closeModalActionButton?.addEventListener('click', closeModal);

        // Close modal if clicking outside the content
        window.addEventListener('click', (event) => {
            if (event.target == summaryModal) closeModal();
        });

        // --- Event Delegation for dynamic elements ---

        // Tab Container: Handles tab selection AND tab deletion
        if (shopTabsContainer) {
            shopTabsContainer.addEventListener('click', handleTabClick); // Handles selecting tabs
            shopTabsContainer.addEventListener('click', handleDeleteShopClick); // Handles deleting tabs
            console.log("Delegated listeners added for shopTabsContainer.");
        } else { console.error("shopTabsContainer not found for delegation!"); }


        // Tab Content Area: Handles item add, delete, edit, clear
        if (tabContentArea) {
             // Add item button
            tabContentArea.addEventListener('click', handleAddItemClick);
             // Add item with Enter key in item input
            tabContentArea.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && event.target.classList.contains('entry-item')) {
                    event.preventDefault(); // Prevent potential form submission
                    const entryArea = event.target.closest('.item-entry-area');
                    const addButton = entryArea?.querySelector('.entry-add-btn');
                    addButton?.click(); // Simulate click on the add button
                }
            });
            // Inline item actions (delete, edit, save, cancel)
            tabContentArea.addEventListener('click', handleDeleteItemInline);
            tabContentArea.addEventListener('click', handleEditItemInline);
            tabContentArea.addEventListener('click', handleSaveEditInline);
            tabContentArea.addEventListener('click', handleCancelEditInline);
            // Clear shop items button
            tabContentArea.addEventListener('click', handleClearShopItems);
            console.log("Delegated listeners added for tabContentArea.");
        } else { console.error("tabContentArea not found for delegation!"); }

         console.log("Event listeners setup complete.");
    }

    // --- เริ่มต้นการทำงาน ---
    initializeApp();

}); // ปิด DOMContentLoaded listener
