# Tasks

Execute in order. Prefer scaffolding modules and wiring dependencies before UI polish.

**Status legend:** ✅ done · 🔄 in progress · ⏳ pending · ⏸ deferred (phase-gated)

## Foundation — Phase 0 ✅ FROZEN

01. ✅ Project structure — route groups `(website|admin|customer|team|auth)` + `modules/` skeletons
02. ✅ Design system — theme, tokens, icons, animations, cards (Royal Rajasthan) — **completed in Phase 1**
03. ✅ Supabase inventory — Travel Days reuse map + `MODULE_TABLE_OWNERSHIP.md`
04. ✅ Knowledge Engine stubs — domain folders + DTO contracts (no intelligence yet)
05. ✅ Search module stubs — package / destination / knowledge / global / suggestions

## Existing product modularization — Phase 1

06. ✅ Knowledge Engine foundation (**FROZEN**)
07. ✅ Quotation Workflow Engine (**FROZEN**)
08. ✅ Customer Relationship Platform (CRP) (**FROZEN**)
09. ✅ Universal Search Engine (**FROZEN**)
10. ✅ Universal API Gateway (**FROZEN**)
11. ✅ Travel Intelligence Engine (**FROZEN**)
12. ✅ Universal Renderer Engine (**FROZEN**)
13A. ✅ Chat Platform Management (**complete**)
13B. ✅ Travel Intelligence Integration ← **complete**

## Website — Phase 2

13. ⏳ `(website)` shell + design-system branding ← **next (awaiting approval)**
14. ⏳ Dynamic package pages (Knowledge)
15. ⏳ Dynamic destination pages (Knowledge)
16. ⏳ Remaining APIs migrated through Gateway

## Intelligence + Chat — Phase 4

17. ⏳ Wire external providers (HF / GitHub Models / OpenRouter) behind same interface
18. ⏳ Rich Renderer cards in widget (timeline / package cards polish)
19. ⏳ Channel adapters (WhatsApp) reusing `/api/chat` orchestration

## Itinerary & outputs — Phase 5

21. ⏳ Itinerary generator (via Intelligence)
22. ⏳ Shareable itinerary pages
23. ⏳ PDF binary generation (Renderer pdf adapter)
24. ⏳ Email / WhatsApp template polish (Renderer adapters)

## Expansion — Phase 6+

25. ⏳ CRM AI assists (via Intelligence + Renderer)
26. ⏳ Channel adapter: WhatsApp
27. ⏳ Analytics module
28. ⏳ Customer / Team portal AI surfaces
29. ⏳ Multi-state Knowledge expansion
