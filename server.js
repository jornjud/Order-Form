// server.js - เซิร์ฟเวอร์ Node.js ง่ายๆ สำหรับฟอร์มสั่งของ
const express = require('express');
const fs = require('fs').promises; // ใช้ file system แบบ promises (async/await)
const path = require('path');

const app = express();
const port = 3000; // พอร์ตที่เซิร์ฟเวอร์จะรัน (เปลี่ยนได้ถ้าพอร์ตนี้ไม่ว่าง)
const ITEMS_FILE_PATH = path.join(__dirname, 'items.json'); // พาธไปยังไฟล์ items.json

// Middleware ช่วยให้ Express อ่าน JSON จาก request body ได้
app.use(express.json());
// Middleware สำหรับให้บริการไฟล์ static (html, css, js จากโฟลเดอร์ปัจจุบัน)
app.use(express.static(__dirname));

// --- API Endpoints ---

// GET /api/items - ดึงรายการสินค้าทั้งหมดจาก items.json
app.get('/api/items', async (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] GET /api/items - Request received`);
    try {
        const data = await fs.readFile(ITEMS_FILE_PATH, 'utf8');
        const items = JSON.parse(data);
        console.log(`[${new Date().toLocaleTimeString()}] GET /api/items - Sending ${items.length} items.`);
        res.json(items); // ส่งข้อมูลกลับไปเป็น JSON
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ERROR reading ${ITEMS_FILE_PATH}:`, error);
        // ถ้าหาไฟล์ไม่เจอ หรืออ่านไม่ได้ ส่ง array ว่างกลับไปแทน + โค้ด 500
        res.status(500).json([]);
    }
});

// POST /api/items - เพิ่มรายการสินค้าใหม่ลง items.json
app.post('/api/items', async (req, res) => {
    const newItem = req.body.newItem?.trim(); // ดึงชื่อรายการใหม่จาก request body
    console.log(`[<span class="math-inline">\{new Date\(\)\.toLocaleTimeString\(\)\}\] POST /api/items \- Received request to add\: "</span>{newItem}"`);

    if (!newItem) {
        console.log(`[${new Date().toLocaleTimeString()}] POST /api/items - Bad request: No newItem provided.`);
        return res.status(400).json({ success: false, message: 'ไม่มีชื่อรายการใหม่ส่งมาว่ะเพื่อน' });
    }

    try {
        let items = [];
        try {
            const data = await fs.readFile(ITEMS_FILE_PATH, 'utf8');
            items = JSON.parse(data);
            if (!Array.isArray(items)) {
                console.warn(`[${new Date().toLocaleTimeString()}] WARNING: ${ITEMS_FILE_PATH} did not contain a valid JSON array. Resetting.`);
                items = []; // ถ้าไฟล์ไม่ใช่ array ให้เริ่มใหม่
            }
        } catch (readError) {
            // ถ้าไฟล์ไม่มี หรืออ่านไม่ได้ (เช่น ไฟล์เปล่า) ให้เริ่มด้วย array ว่าง
            if (readError.code === 'ENOENT') {
                 console.log(`[${new Date().toLocaleTimeString()}] INFO: ${ITEMS_FILE_PATH} not found. Will create it.`);
            } else {
                console.warn(`[${new Date().toLocaleTimeString()}] WARNING: Error reading ${ITEMS_FILE_PATH} before write:`, readError.message);
            }
            items = [];
        }

        // เช็คว่ามีรายการนี้อยู่แล้วหรือยัง (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
        const itemExists = items.some(existingItem => existingItem.toLowerCase() === newItem.toLowerCase());

        if (itemExists) {
            console.log(`[<span class="math-inline">\{new Date\(\)\.toLocaleTimeString\(\)\}\] POST /api/items \- Item "</span>{newItem}" already exists.`);
            return res.status(200).json({ success: true, message: 'มีรายการนี้อยู่แล้วเพื่อน (ไม่ได้เพิ่มซ้ำ)', added: false });
        } else {
            // เพิ่มรายการใหม่ แล้วเรียงลำดับ
            items.push(newItem);
            items.sort((a, b) => a.localeCompare(b, 'th')); // เรียง ก-ฮ

            // เขียนข้อมูลใหม่ลงไฟล์ items.json
            await fs.writeFile(ITEMS_FILE_PATH, JSON.stringify(items, null, 2), 'utf8'); // ใส่ null, 2 ให้จัดรูปแบบสวยๆ
            console.log(`[<span class="math-inline">\{new Date\(\)\.toLocaleTimeString\(\)\}\] POST /api/items \- Successfully added "</span>{newItem}" and saved to ${ITEMS_FILE_PATH}. Total: ${items.length}`);
            return res.status(200).json({ success: true, message: `เพิ่ม "${newItem}" เรียบร้อย!`, added: true });
        }

    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] ERROR processing POST /api/items:`, error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดตอนเซฟรายการว่ะเพื่อน' });
    }
});

// --- หน้าเว็บหลัก ---
// ให้บริการไฟล์ index.html เมื่อเข้า root path
// Express.static จัดการเรื่องนี้ให้แล้ว ถ้ามี index.html ในโฟลเดอร์

// --- เริ่มเซิร์ฟเวอร์ ---
app.listen(port, () => {
    console.log(`\n🚀 เซิร์ฟเวอร์ฟอร์มสั่งของ พร้อมลุย!`);
    console.log(`   เปิดเบราว์เซอร์แล้วไปที่: http://localhost:${port}`);
    console.log(`   (กด CTRL + C เพื่อปิดเซิร์ฟเวอร์)`);
});