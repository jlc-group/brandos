import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// ─── Brand Rules ──────────────────────────────────────────────────────────────
const brandRules = [
  // Tone of Voice
  { category: "tone", title: "ภาษาที่ใช้", description: "ใช้ภาษาไทยที่เป็นกันเอง อบอุ่น เหมือนเพื่อนคุย ไม่เป็นทางการมากเกินไป", value: null, isActive: true },
  { category: "tone", title: "บุคลิกแบรนด์", description: "เป็นผู้เชี่ยวชาญด้านสมุนไพรไทย ที่รู้จริง พูดตรง เชื่อถือได้ ไม่โอ้อวด", value: null, isActive: true },
  { category: "tone", title: "อารมณ์ของ Content", description: "สนุก เป็นธรรมชาติ ให้ความรู้สึกว่า 'เราเข้าใจปัญหาของคุณ' ไม่ใช่แค่ขายของ", value: null, isActive: true },

  // Forbidden
  { category: "forbidden", title: "ห้ามขายของมากเกินไป", description: "Content ประเภท 'ขาย' ต้องไม่เกิน 30% ของ content ทั้งหมดในสัปดาห์ ถ้าเกินจะดูเป็นช่องขายของ", value: "30", isActive: true },
  { category: "forbidden", title: "ห้ามใช้ภาษาเกินจริง", description: "ห้ามใช้คำว่า 'ดีที่สุด', 'เร็วที่สุด', 'ปาฏิหาริย์' โดยไม่มีหลักฐาน", value: null, isActive: true },
  { category: "forbidden", title: "ห้ามซ้ำ Hook เดิม", description: "Hook เดิมห้ามใช้ซ้ำภายใน 14 วัน เพื่อป้องกัน Banner Blindness", value: "14", isActive: true },
  { category: "forbidden", title: "ห้ามโฟกัสสินค้าเดิมนานเกินไป", description: "สินค้าเดิมห้ามปรากฏใน content เกิน 3 วันติดต่อกัน ต้องสลับสินค้า", value: "3", isActive: true },

  // Content Ratio
  { category: "content_ratio", title: "สัดส่วน Content ที่เหมาะสม", description: "Sale 25% | Education 25% | Entertainment 20% | Review 15% | Lifestyle 15%", value: JSON.stringify({ sale: 25, education: 25, entertainment: 20, review: 15, lifestyle: 15 }), isActive: true },

  // Key Messaging
  { category: "messaging", title: "Key Message หลัก", description: "Jula's Herb = สมุนไพรไทยที่ได้ผลจริง ทดสอบโดยคนไทย เพื่อคนไทย", value: null, isActive: true },
  { category: "messaging", title: "Pain Points ที่ต้องพูดถึง", description: "ผิวหมองคล้ำ, สิวเรื้อรัง, แดดไทยแรงมาก, กลิ่นตัว, ฟันเหลือง - เป็นปัญหาที่คนไทยเจอจริง", value: null, isActive: true },
  { category: "messaging", title: "Tagline หลัก", description: "สมุนไพรไทย ผลลัพธ์จริง ราคาเข้าถึงได้", value: null, isActive: true },

  // Hook Strategy
  { category: "hook", title: "รูปแบบ Hook ที่ใช้ได้", description: "1) ตั้งคำถาม: 'รู้ไหมว่า...' 2) Challenge: 'ลองทำ 7 วัน' 3) Shocking Fact: 'คนไทย 7 ใน 10 คน...' 4) Before/After: 'ก่อนใช้ vs หลังใช้'", value: null, isActive: true },
  { category: "hook", title: "ภาพปกที่ดึงดูด", description: "ใช้ใบหน้าจริง, Before/After ชัดเจน, ข้อความขนาดใหญ่อ่านง่าย, สีสดใสตัดกับพื้นหลัง", value: null, isActive: true },
];

// ─── SKU List ─────────────────────────────────────────────────────────────────
const skus = [
  // กันแดด
  { name: "จุฬาเฮิร์บ กันแดด SPF50+ PA++++", nameEn: "Jula Herb Sunscreen SPF50+", category: "sunscreen", description: "กันแดดสูตรสมุนไพรไทย ปกป้องแดดแรงแบบไทย", keyBenefit: "กันแดดสูง ไม่อุดตัน เหมาะกับสภาพอากาศไทย", targetAudience: "ผู้หญิงอายุ 18-35 ที่ออกแดดบ่อย", priceRange: "150-250", sortOrder: 1 },
  { name: "จุฬาเฮิร์บ กันแดดน้ำ Water Resistant", nameEn: "Jula Herb Water Resistant Sunscreen", category: "sunscreen", description: "กันแดดกันน้ำสำหรับกิจกรรมกลางแจ้ง", keyBenefit: "กันน้ำได้นาน เหมาะกีฬากลางแจ้ง", targetAudience: "คนชอบกิจกรรมกลางแจ้ง", priceRange: "180-280", sortOrder: 2 },

  // สิว
  { name: "จุฬาเฮิร์บ เซรั่มสิว Acne Serum", nameEn: "Jula Herb Acne Serum", category: "acne", description: "เซรั่มแก้สิวสูตรสมุนไพร ลดการอักเสบ", keyBenefit: "ลดสิวอักเสบ ลดรอยสิว เห็นผลใน 7 วัน", targetAudience: "วัยรุ่น-ผู้ใหญ่ที่มีปัญหาสิว", priceRange: "200-350", sortOrder: 3 },
  { name: "จุฬาเฮิร์บ โทนเนอร์สิว Acne Toner", nameEn: "Jula Herb Acne Toner", category: "acne", description: "โทนเนอร์ลดสิว ควบคุมความมัน", keyBenefit: "ลดสิว ควบคุมมัน รูขุมขนดูเล็กลง", targetAudience: "ผิวมัน ผิวผสม ที่มีปัญหาสิว", priceRange: "150-250", sortOrder: 4 },

  // ผิวใส
  { name: "จุฬาเฮิร์บ วิตามินซี เซรั่ม Vitamin C Serum", nameEn: "Jula Herb Vitamin C Serum", category: "brightening", description: "เซรั่มวิตามินซีเข้มข้น ผิวใสกระจ่าง", keyBenefit: "ผิวใสขึ้น ลดรอยหมองคล้ำ เห็นผลใน 2 สัปดาห์", targetAudience: "ผู้หญิงที่ต้องการผิวกระจ่างใส", priceRange: "250-450", sortOrder: 5 },
  { name: "จุฬาเฮิร์บ ครีมผิวใส Brightening Cream", nameEn: "Jula Herb Brightening Cream", category: "brightening", description: "ครีมบำรุงผิวสูตรผิวใส", keyBenefit: "ผิวชุ่มชื้น กระจ่างใส ลดรอยดำ", targetAudience: "ผู้หญิงทุกวัยที่ต้องการผิวใส", priceRange: "200-350", sortOrder: 6 },

  // ลดกลิ่นตัว
  { name: "จุฬาเฮิร์บ โรลออนสมุนไพร Herbal Deodorant Roll-on", nameEn: "Jula Herb Deodorant Roll-on", category: "underarm", description: "โรลออนสมุนไพรไทย ลดกลิ่นตัว ไม่มีแอลกอฮอล์", keyBenefit: "ลดกลิ่นตัว ไม่ระคายเคือง ปลอดภัยสำหรับผิวบอบบาง", targetAudience: "คนที่มีปัญหากลิ่นตัว ผิวแพ้ง่าย", priceRange: "80-150", sortOrder: 7 },
  { name: "จุฬาเฮิร์บ สเปรย์ระงับกลิ่นกาย Deodorant Spray", nameEn: "Jula Herb Deodorant Spray", category: "underarm", description: "สเปรย์ระงับกลิ่นกายสมุนไพร", keyBenefit: "ระงับกลิ่นได้นาน 24 ชม. หอมสมุนไพร", targetAudience: "คนทำงาน คนกีฬา", priceRange: "100-180", sortOrder: 8 },

  // ดูแลช่องปาก
  { name: "จุฬาเฮิร์บ ยาสีฟันสมุนไพร Herbal Toothpaste", nameEn: "Jula Herb Herbal Toothpaste", category: "oral_care", description: "ยาสีฟันสมุนไพรไทย ฟันขาว ลมหายใจหอม", keyBenefit: "ฟันขาวขึ้น ลมหายใจสดชื่น ลดคราบหินปูน", targetAudience: "ทุกเพศทุกวัย", priceRange: "60-120", sortOrder: 9 },
  { name: "จุฬาเฮิร์บ น้ำยาบ้วนปาก Mouthwash", nameEn: "Jula Herb Mouthwash", category: "oral_care", description: "น้ำยาบ้วนปากสมุนไพร ฆ่าเชื้อ ลดกลิ่นปาก", keyBenefit: "ลดกลิ่นปาก ฆ่าเชื้อแบคทีเรีย สูตรอ่อนโยน", targetAudience: "ทุกเพศทุกวัย", priceRange: "80-150", sortOrder: 10 },

  // เซรั่ม
  { name: "จุฬาเฮิร์บ เซรั่มหน้าเด็ก Baby Face Serum", nameEn: "Jula Herb Baby Face Serum", category: "serum", description: "เซรั่มบำรุงผิวหน้าสูตรเข้มข้น ผิวเด็กใน 30 วัน", keyBenefit: "ผิวเด็ก เรียบเนียน ลดริ้วรอย ผิวชุ่มชื้น", targetAudience: "ผู้หญิงอายุ 25+ ที่ต้องการผิวเด็ก", priceRange: "350-550", sortOrder: 11 },
  { name: "จุฬาเฮิร์บ เซรั่มเปปไทด์ Peptide Serum", nameEn: "Jula Herb Peptide Serum", category: "serum", description: "เซรั่มเปปไทด์ ลดริ้วรอย กระชับผิว", keyBenefit: "ลดริ้วรอย กระชับผิว ผิวดูอ่อนเยาว์", targetAudience: "ผู้หญิงอายุ 30+ ที่ต้องการต้านวัย", priceRange: "400-650", sortOrder: 12 },
];

// Insert Brand Rules
console.log("🌱 Seeding Brand Rules...");
for (const rule of brandRules) {
  await connection.execute(
    `INSERT IGNORE INTO brand_rules (category, title, description, value, is_active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [rule.category, rule.title, rule.description, rule.value, rule.isActive ? 1 : 0]
  );
}
console.log(`✅ Seeded ${brandRules.length} Brand Rules`);

// Insert SKUs
console.log("🌱 Seeding SKUs...");
for (const sku of skus) {
  await connection.execute(
    `INSERT IGNORE INTO skus (name, name_en, category, description, key_benefit, target_audience, price_range, sort_order, is_active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [sku.name, sku.nameEn, sku.category, sku.description, sku.keyBenefit, sku.targetAudience, sku.priceRange, sku.sortOrder]
  );
}
console.log(`✅ Seeded ${skus.length} SKUs`);

await connection.end();
console.log("🎉 Seed completed!");
