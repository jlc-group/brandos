# Legacy Content Operations Parity Audit

เอกสารนี้บันทึก feature และ action ของระบบเก่า `TiktokPFMWebApp` ที่ user ใช้งานจริง เพื่อใช้เป็น baseline ก่อนปรับ BrandOS รอบถัดไป เป้าหมายคือทำให้ระบบใหม่สวยขึ้นและดีขึ้น โดยไม่ทำให้ workflow ที่ทีมคุ้นเคยหายไป

## สรุปสำคัญ

BrandOS รอบล่าสุดยังไม่ parity กับระบบเก่าในจุดสำคัญที่สุด: **1 content ต้อง map ได้หลายสินค้า/SKU** แต่ BrandOS ตอนนี้มี `content_history.skuId` แบบ single SKU ทำให้ workflow จริงยังไม่ถูกต้อง ต้องแก้ data model เป็น multi-SKU ก่อนขยาย UX ต่อ

ระบบเก่าไม่ได้เป็นแค่ตาราง content แต่เป็น operations console ที่รวม content, product mapping, targeting allocation, ads linkage, boost priority, add content, auth code และ saved views ไว้ในหน้าเดียว

## Legacy Files ที่ใช้เป็นแหล่งอ้างอิง

- `D:\Backup\program_old\TiktokPFMWebApp\app\templates\tiktok_content_list_admin.html`
- `D:\Backup\program_old\TiktokPFMWebApp\static\js\tiktok_script.js`
- `D:\Backup\program_old\TiktokPFMWebApp\app\routes\content_routes.py`
- `D:\Backup\program_old\TiktokPFMWebApp\app\routes\tiktok_routes.py`
- `D:\Backup\program_old\TiktokPFMWebApp\app\routes\utils.py`
- `D:\Backup\program_old\TiktokPFMWebApp\app\routes\tiktok_ad_routes.py`
- `D:\Backup\program_old\TiktokPFMWebApp\app\routes\product_groups.py`
- `D:\Backup\program_old\TiktokPFMWebApp\app\routes\base_routes.py`
- `D:\Backup\program_old\TiktokPFMWebApp\app\models.py`

## Feature Inventory จากระบบเก่า

### 1. Saved Views / Preset Views

ระบบเก่ามีลิงก์ view ที่เป็น URL เฉพาะ ทำให้ทีมกลับมาดูชุดข้อมูลเดิมหรือแชร์กันได้

- `/tiktok/last100` ดู content ล่าสุด 100 รายการ
- `/tiktok/allcontents` ดู content ทั้งหมด
- `/tiktok/best_pfm_100_contents` ดู top PFM 100
- `/tiktok/best_content_each_products` ดู content ที่ดีที่สุดแยกตามสินค้า
- `/tiktok/influencers` ดู influencer contents
- `/tiktok/notproper` ดูรายการที่ต้องจัดการ เช่น status/type รอแก้ หรือยังไม่มี product
- `/tiktok/shouldrunads` ดู content ที่ควรเอาไปยิง ads
- `/tiktok/products?id=J1,K4` ดู content ที่ match product set เดียวกัน
- `/tiktok/channels?id=...` ดู content ตาม channel/account
- `/tiktok/content_types?content_type=...`
- `/tiktok/content_statuses?content_status=...`
- `/tiktok/contents?ids=...` ดู content เฉพาะ item ids ที่เพิ่งเพิ่ม

BrandOS ต้องมี saved view หรือ query URL ที่ bookmark/share ได้ ไม่ใช่ filter เฉพาะ state ในหน้าอย่างเดียว

### 2. ตาราง Content หลัก

ตารางเดิมเป็น DataTables และถูกออกแบบให้ทำงานกับข้อมูลจำนวนมาก

- Global search
- Sort ทุกคอลัมน์สำคัญ
- Page size 50 / 100 / 200 / All
- Horizontal scroll และ vertical scroll
- Date range filter แยก
- Checkbox select all / per row
- Thumbnail คลิกไป content ต้นทาง
- Caption แบบ truncate แต่ hover/title ดูเต็ม
- Hidden full caption column เพื่อช่วย search
- Metrics: duration, average watch, reach, views, likes, bookmarks, comments, shares, PFM
- Products, Targeting, Ads count, Total Media Cost, More Details, Edit/Boost actions

BrandOS ตอนนี้มี table ที่สวยกว่า แต่ยังไม่ครบด้าน operational density และยังไม่มี date range / hidden searchable full caption / bookmarks / duration / avg watch / PFM / TMC / ads count แบบเดิม

### 3. Multi-Product Mapping ต่อ Content

ระบบเก่าเก็บสินค้าใน `tiktok_posts.products_json` เป็น array เช่น `["J1", "K4"]` และมี `products` string สำหรับ display legacy

Action สำคัญ:

- Edit modal ใช้ Select2 multi-select เลือก product ได้หลายตัว
- Product list ถูก sort ก่อนบันทึก เพื่อให้ product set เทียบซ้ำได้
- Product cell แสดง product codes พร้อมลิงก์ต่อไปยัง view ที่เกี่ยวข้อง
- Product set เดียวกันใช้ค้นหา content และ product group แบบ exact match
- Bulk update products ก็เป็น multi-select

BrandOS ตอนนี้ใช้ `content_history.skuId` เดียว ซึ่งไม่พอ ต้องเพิ่ม multi-SKU relationship เช่น `content_history_skus` ก่อนถือว่า parity

### 4. Product Cell Actions

ในระบบเก่า product cell ไม่ใช่แค่ badge แต่เป็น navigation hub

- คลิก product set เพื่อไป `/tiktok/products?id=...`
- ไอคอน filter เพื่อไป product groups ที่ exact match
- ไอคอน eye เพื่อไป should-run-ads view ของ product set นั้น
- Influencer content ใช้ product link ไป `/tiktok/influencers?products=...`

BrandOS ควรทำ product chips ที่กดได้ เช่น filter by SKU set, open SKU profile, open winning content for SKU, open ads candidates for SKU

### 5. Product Master

ระบบเก่ามี product master แยก

- Product code เป็น business key
- Product name
- `status` active/inactive
- `allocate_status` ใช้บอกว่าเข้ากระบวนการ allocate งบหรือไม่
- คลิก cell เพื่อ toggle status / allocate_status ได้ทันที
- Add product modal

BrandOS มี `skus` แต่ยังไม่มี allocate flag และ quick toggle แบบ operational

### 6. Product Groups

ระบบเก่ามี product group เพื่อแทนชุดสินค้าที่ใช้ร่วมกัน

- สร้าง group จากหลาย product code
- Sort products ก่อนบันทึก
- Filter product group จาก product set ของ content
- Auto import product groups จาก distinct `products_json`
- นับ adgroups ที่ match group นั้น
- ดู adgroup details ของ group
- Edit/delete/update status

BrandOS ยังไม่มี product group / SKU set concept ซึ่งสำคัญถ้าหนึ่ง content ขายหลายสินค้า

### 7. Targeting Allocation ต่อ Content

ระบบเก่าผูก targeting หลายตัวต่อ content ผ่าน `targeting_details`

- Targeting item มี `id` และ `percent`
- Edit modal เพิ่ม targeting จาก Select2
- ปุ่ม Avg Allocate ช่วยแบ่งเปอร์เซ็นต์ให้รวม 100%
- Save validation: ถ้ามี targeting ต้องรวม 100%
- Targeting ที่มี ACE/ABX ad แล้วจะ lock ไม่ให้ remove
- `get_targeting_with_ace_abx_json` รวม ACE/ABX detail กลับมาแสดงใน modal

BrandOS ตอนนี้ยังไม่มี targeting allocation ต่อ content เลย

### 8. ACE / ABX Ads Linkage

ระบบเก่าผูก content กับ ads workflow โดยตรง

- Targeting cell แสดง targeting id + percent
- ถ้ามี ACE/ABX ad แล้วแสดง badge พร้อมลิงก์ไป TikTok Ads Manager
- ถ้ายังไม่มี แสดงปุ่ม Create ACE Ad / Create ABX Ad
- Create ABX มี duplicate targeting check ก่อนสร้าง
- ABX create ส่งต่อ `item_id`, `targeting_id`, `products`
- Update `abx_details`, `ace_details`, `abx_ad_count`, `ace_ad_count`
- Ads Details modal แสดง ads detail ตาม item id
- Update adgroup budget/status ได้จาก modal
- TMC ในตารางถูก update หลังโหลด ads detail

BrandOS มี performance data และ recommendations บางส่วน แต่ยังไม่มี content-to-ad operational workflow แบบนี้

### 9. Content Type / Status / Expire Date

ระบบเก่ามี workflow fields:

- `content_type`
- `content_status`
- `content_expire_date`
- More Details แสดง type/status เป็นลิงก์ filter
- Expire date ถูกแสดงใน channel detail เป็น EXP(+/-days)
- Saved view `notproper` หารายการที่ status/type ยังรอแก้ หรือ products ว่าง
- Saved view `shouldrunads` ใช้ `content_expire_date > NOW()`

BrandOS ตอนนี้มี `contentType` แต่ยังไม่มี content status/expire date ที่เทียบเท่าระบบเก่า

### 10. Bulk Update

ระบบเก่ามี Bulk Update All modal

- เลือก content หลายแถว
- แต่ละ field ต้อง tick enable ก่อนถึงจะแก้
- Bulk products เป็น multi-select
- Bulk targeting UI มีไว้ แต่ backend ปิดไม่ให้ update targeting ตลอด เพื่อป้องกันความเสี่ยง
- Bulk content type
- Bulk content status
- Bulk content expire date
- API คืน failed updates

BrandOS ตอนนี้มี bulk SKU แบบง่าย แต่ยังไม่ถูกต้องเพราะเป็น single SKU และยังไม่มี field enable/disable, status, type, expire date, failed report

### 11. Add Content

ระบบเก่ามี Add Content modal

- ใส่ item ids หลายบรรทัด
- เช็ค duplicate item ids
- ดึง item detail จาก TikTok
- Upsert videos
- ตั้งค่า default `content_status` / `content_type` ที่ยัง null
- หลังเพิ่ม redirect ไป `/tiktok/contents?ids=...` เพื่อดูรายการที่เพิ่งเพิ่ม
- แสดงรายการ failed และ existing ids ให้ user

BrandOS ยังไม่มี workflow add content จาก item ids แบบนี้ใน Content Library

### 12. Add Auth Code / Spark Ads

ระบบเก่ามี Add Auth Code modal

- เลือก advertiser
- ใส่ auth code หลายบรรทัด
- ส่ง apply spark ad ทีละ code
- แสดง success/failed count
- โหลด advertiser list จาก API

BrandOS ยังไม่มี action นี้ในหน้า content

### 13. Boost Content

ระบบเก่ามี boost ต่อ content เพื่อให้ content ได้ priority ใน budget/ops

- Set boost factor 1.2x / 1.5x / 2.0x / 2.5x / 3.0x
- เลือก duration 1 / 3 / 7 / 14 / 30 วัน
- เลือก start date
- เลือก reason เช่น High Performance, Special Campaign, Product Launch, Seasonal, Manual Priority, Other
- แสดง boost active/expired ใน More Details
- ปุ่ม manage boost ในแถว
- Clear/remove boost

BrandOS ยังไม่มี boost priority model

### 14. Role-Based Display

ระบบเก่าซ่อน/ลดข้อมูลบางอย่างตาม role เช่น user type `creator`

- ซ่อน ad cost
- แสดง targeting เป็น text แทน interactive links
- TMC เป็น N/A

BrandOS ต้องคิด role-based operations ถ้าจะให้ทีม content/sale/marketing ใช้ร่วมกัน

## Gap ของ BrandOS ปัจจุบัน

### Critical

- [x] เปลี่ยน content-to-SKU จาก single `skuId` เป็น multi-SKU mapping
- [x] เพิ่ม product/SKU set concept เพื่อแทน product groups
- [x] เพิ่ม content status และ expire date
- [ ] เพิ่ม targeting allocation พร้อม percent รวม 100%
- [ ] เพิ่ม content-to-ads linkage แบบ ACE/ABX หรืออย่างน้อย ad relation ที่ action ได้
- [ ] เพิ่ม saved views / query URLs ที่เทียบกับ legacy

### High

- [ ] เพิ่ม PFM / FB / organic / paid score ที่นิยามชัด
- [ ] เพิ่ม bulk update แบบ enable field ก่อนแก้
- [ ] เพิ่ม add content จาก item ids และ redirect ไป view ของ ids นั้น
- [ ] เพิ่ม ads detail drawer/modal พร้อม TMC และ linked ads
- [ ] เพิ่ม boost content priority
- [ ] เพิ่ม product master allocate flag

### Medium

- [ ] เพิ่ม date range filter
- [ ] เพิ่ม bookmark metric, duration, average watch
- [ ] เพิ่ม full caption searchable hidden field หรือ server-side equivalent
- [ ] เพิ่ม role-based display
- [ ] เพิ่ม auth code / spark ads workflow ถ้ายังใช้จริง

## Architecture รอบถัดไปที่ควรทำ

### Schema

- เพิ่ม `content_history_skus`
  - `id`
  - `contentHistoryId`
  - `skuId`
  - `skuCodeSnapshot`
  - `skuNameSnapshot`
  - `position`
  - unique `(contentHistoryId, skuId)`
- เพิ่ม `sku_groups`
  - `id`
  - `name`
  - `skuIds` หรือ junction `sku_group_items`
  - `isActive`
- เพิ่ม content workflow fields ใน `content_history`
  - `contentStatus`
  - `contentExpireDate`
  - `sourceLabel`
  - `boostFactor`
  - `boostStartDate`
  - `boostExpireDate`
  - `boostReason`
- เพิ่ม targeting table
  - `content_targeting_allocations`
  - `contentHistoryId`, `targetingId`, `percent`, `aceAdId`, `abxAdId`, metadata

### API

- `history.list` ต้อง return SKU chips array ไม่ใช่ single `skuId`
- `history.updateProducts` รับ array ของ SKU ids
- `history.bulkUpdate` รับ selected ids + enabled fields
- `history.savedViews` หรือ route query presets
- `history.addByItemIds`
- `history.boost`
- `history.targeting.updateAllocations`
- `history.adsDetails`

### UI

- ตารางหลักควรรักษา layout สวยของ BrandOS แต่เพิ่ม operational density
- Product mapping เป็น multi-select searchable ทั้งรายแถวและ drawer
- Product chips คลิกได้และเปิด filter/saved view ได้
- Bulk bar ต้องรองรับ products/type/status/expire/boost ทีละ field
- Drawer ต้องมี tabs: Overview, Products, Targeting, Ads, AI, Raw
- AI ควรช่วย suggest หลาย SKU, content status, funnel, ads candidate, targeting idea, next action

## หมายเหตุการแก้รอบล่าสุด

รอบล่าสุดที่เพิ่ม inline SKU mapping ใน BrandOS ยังเป็น single SKU และต้องถือว่าเป็น temporary improvement เท่านั้น ไม่ควรนับว่า parity กับระบบเก่า ต้องแก้ data model เป็น multi-SKU ก่อนใช้งานจริงจัง
