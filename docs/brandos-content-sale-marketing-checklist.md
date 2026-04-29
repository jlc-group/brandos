# BrandOS Content, Sale และ Marketing Checklist

เอกสารนี้สรุปสิ่งที่ควรต่อยอดใน BrandOS จากการดูแนวทางของ Wecontent และ WeBoostX2 เพื่อให้ระบบเป็นศูนย์กลาง content operations ที่เชื่อม sale และ marketing ได้ครบวงจร

เอกสาร parity จากระบบเก่าที่ user ใช้งานจริง: [`legacy-content-parity-audit.md`](./legacy-content-parity-audit.md)

## เป้าหมายระบบ

- รวม content library, social performance, ads performance และ product context ไว้ใน workflow เดียว
- ทำให้ทีมเห็นว่า content ชิ้นใดขายของได้ดี, ชิ้นใดเหมาะเอาไปยิง ads, และชิ้นใดควรทำซ้ำหรือปรับ angle
- ลดงาน manual ด้วย sync/import, score, recommendation, scheduled job และรายงานที่ทีมใช้ตัดสินใจได้จริง

## Now

- [x] ปรับ BrandOS เป็น bright theme ที่อ่านง่ายสำหรับการใช้งานทุกวัน
- [x] ยกหน้า Content Library เป็น content operations dashboard พร้อม filter, summary, metrics และ pagination
- [x] ทำ Social Sync สำหรับ TikTok/Facebook และเก็บประวัติ sync run
- [x] แก้ content-to-SKU จาก single SKU เป็น multi-SKU/product mapping ให้เทียบเท่าระบบเก่า
- [x] เพิ่ม saved views เช่น Last 100, Best PFM, Not Proper, Should Run Ads, No Product Mapping
- [ ] เพิ่ม field/source label ให้แยกว่า content มาจาก API sync, legacy import, manual import หรือ AI generated
- [x] เพิ่ม quick filters เช่น high engagement, ads candidate และ no product mapping
- [ ] เพิ่ม content detail drawer เพื่อดู raw data, caption เต็ม, metrics trend และ linked SKU/ad

## Content Operations

- [ ] สร้าง workflow สถานะ content: idea, scripted, produced, published, boosted, archived
- [ ] เพิ่ม owner/assignee, reviewer, due date และ approval note แบบ Wecontent
- [ ] เพิ่ม prompt library และ content brief template สำหรับ hook, script, caption, CTA และ product angle
- [ ] เพิ่ม content versioning สำหรับเทียบ caption/hook หลายเวอร์ชัน
- [ ] เพิ่ม SOP/RACI ของทีม content: creator, editor, reviewer, media buyer, sales owner
- [ ] เพิ่ม calendar view ที่เชื่อม planned content กับ published content จริง

## Sales Content

- [ ] ผูก content กับ SKU, product benefit, pain point, target segment และ sales objection
- [x] รองรับหนึ่ง content ผูกหลาย SKU พร้อม product set/chip ที่กด filter ต่อได้
- [x] เพิ่ม SKU/Product Group สำหรับชุดสินค้าที่มักถูกขายร่วมกัน
- [ ] เพิ่ม field funnel stage: awareness, consideration, conversion, retention
- [ ] เพิ่ม CTA mapping เช่น inbox, Line OA, Shopee, Lazada, live, website
- [ ] เก็บ sales signal ต่อ content เช่น click, add to cart, order, revenue หรือ lead count เมื่อเชื่อม data source ได้
- [ ] ทำ sales-ready score เพื่อหา content ที่เหมาะใช้กับ seller, live commerce และ landing page
- [ ] ทำ library ของ winning claims/hooks ที่ทีม sale เอาไปใช้ซ้ำได้

## Marketing และ Ads

- [ ] เชื่อม content-to-ad linkage: content history id, ad id, campaign id, ad group id
- [ ] เพิ่ม targeting allocation ต่อ content พร้อม percent รวม 100% และ link ไป ACE/ABX
- [ ] เพิ่ม boost priority ต่อ content เช่น factor, duration, start date, reason
- [ ] เพิ่ม score แยก organic score, paid score, PFM score, Facebook score และ sales score
- [ ] เพิ่ม ads candidate recommendation จาก organic metrics เช่น high engagement rate, high completion, high share
- [ ] เพิ่ม budget action recommendation: scale, monitor, test variation, pause, change targeting
- [ ] เพิ่ม targeting template และ audience notes จาก WeBoostX2 เช่น ACE/ABX หรือ segment ที่ใช้ซ้ำ
- [ ] เพิ่ม creative fatigue detection เมื่อ content/ads เริ่ม performance ตก

## Data Model และ Integrations

- [ ] ทำ data contract กลางสำหรับ platform content: platform, account, external id, media url, thumbnail, caption, published date, metrics, raw payload
- [ ] ทำ data contract กลางสำหรับ ads: spend, impressions, clicks, conversion, revenue, ROAS, CTR, CPA, video views
- [ ] เพิ่ม account health: token expiry, last synced at, last error, permission readiness
- [ ] เพิ่ม scheduled sync และ backfill window ต่อ platform/account
- [ ] เพิ่ม data quality checks: duplicate external id, missing thumbnail, missing published date, missing SKU, metric anomaly
- [ ] เตรียม source adapters สำหรับ TikTok, Facebook, Shopee/Lazada, Line OA, website analytics และ CRM

## Automation

- [ ] ตั้ง scheduled jobs สำหรับ sync content, sync ads, refresh scores และ generate weekly report
- [ ] เพิ่ม rule engine เบื้องต้น เช่น ถ้า views สูงแต่ CTR ต่ำ ให้แนะนำปรับ CTA หรือ landing
- [ ] เพิ่ม auto-tagging จาก caption/hook เป็น product, pain point, content angle และ funnel stage
- [ ] เพิ่ม AI summary ต่อ content เพื่อสรุป why it worked และ next experiment
- [ ] เพิ่ม notification เมื่อ token sync fail หรือ content ใหม่เข้าเงื่อนไข ads candidate

## Reporting

- [ ] ทำ reporting cockpit รายวัน/สัปดาห์: top content, top SKU, top platform, spend/revenue, actions needed
- [ ] เพิ่ม cohort view ตาม publish week และ platform
- [ ] เพิ่ม comparison organic vs paid ต่อ content
- [ ] เพิ่ม leaderboard ของ hook, content type, SKU และ creator
- [ ] เพิ่ม export CSV/Google Sheets สำหรับทีม sale และ media buyer

## Governance

- [ ] เพิ่ม role permissions สำหรับ admin, content, marketing, sales และ viewer
- [ ] เพิ่ม audit log สำหรับ delete/import/sync/manual edit
- [ ] เพิ่ม policy สำหรับ raw token/env key ไม่ให้แสดงบน UI
- [ ] เพิ่ม retention policy สำหรับ raw payload และ data ที่ sync จาก platform
- [ ] เพิ่ม checklist ก่อน deploy/migration สำหรับ schema changes และ production sync jobs

## Prioritization

- Now: ทำให้ content library ใช้งานจริงเร็ว, filter ดี, เห็น sync health และหา content ชนะง่าย
- Next: ผูก SKU/product, สร้าง scoring, เชื่อม content กับ ads และเพิ่ม workflow สถานะงาน
- Later: automation เต็มรูปแบบ, budget optimization, team operations, reporting cockpit และ sales attribution
