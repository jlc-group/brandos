# Jula Content Brain - TODO

## Database & Backend
- [x] Database Schema: brandRules, skus, contentMatrix, contentCalendar, contentHistory, performanceData, adRecommendations
- [x] Backend API: Brand Brain CRUD
- [x] Backend API: SKU + Content Matrix CRUD
- [x] Backend API: Content Calendar CRUD + AI generate
- [x] Backend API: Anti-Annoy analysis (AI)
- [x] Backend API: Performance Data import (CSV + manual)
- [x] Backend API: AI Content Generator (hook, caption, concept)
- [x] Backend API: Content History CRUD
- [x] Backend API: Ads Recommendation Engine (AI)
- [x] Backend API: Dashboard KPI aggregation

## Frontend Pages
- [x] Design System: color palette, typography, global CSS
- [x] DashboardLayout with sidebar navigation (10 sections)
- [x] Page: Dashboard (KPIs, Anti-Annoy Score, Performance Summary)
- [x] Page: Brand Brain (Brand Rules editor)
- [x] Page: SKU Content Map (SKU list + content matrix)
- [x] Page: Content Calendar (weekly/monthly view)
- [x] Page: Anti-Annoy Detector (analyze content mix)
- [x] Page: Performance Analysis (charts + insights)
- [x] Page: AI Content Generator (hook, caption, concept)
- [x] Page: Content History (log + search)
- [x] Page: Performance Data Import (CSV upload + manual)
- [x] Page: Ads Recommendation Engine

## Seed Data
- [x] Seed Brand Rules (Jula's Herb initial rules)
- [x] Seed SKU list from research

## Testing
- [x] Vitest: auth.logout test
- [x] Vitest: appRouter structure test (all 20 procedures)
- [x] Vitest: auth.me test

## BrandOS Migration (Local D:\Server)
- [ ] Migrate schema from MySQL to PostgreSQL
- [ ] Replace Manus OAuth with JLC SSO auth
- [ ] Update DATABASE_URL in .env.example to PostgreSQL
- [ ] Update drizzle config to use PostgreSQL adapter
- [ ] Add brands table for multi-brand support
- [ ] Add brandId to all tables (brandRules, skus, contentCalendar, etc.)
- [ ] Rename app title/branding to BrandOS
- [ ] Push to GitHub jlc-group/brandos

## Future Enhancements
- [ ] Sales data integration (for AI content/ads analysis)
- [ ] TikTok Ads API direct integration (auto daily sync)
- [ ] Content Approval Workflow
