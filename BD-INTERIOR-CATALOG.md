# Bangladesh interior master catalogue

Research date: 2026-10-15. Local additions: 25 material categories, 262 generic material names, 14 income and 32 expense categories. Existing rows are preserved, including inactive records. No supplier prices, purchase bills, stock, clients or transactions are created. Brand, size, colour and model are intentionally unfilled: select actual project specifications and supplier quotation before procurement. Default units are purchase-planning suggestions; verify conversion before mixing supplier units. This is a broad starter master, not an exhaustive list of Bangladesh SKUs or a safety/design approval.

## Evidence and limits

Source pages establish product families available/used through Bangladesh manufacturers and suppliers. Individual generic purchasing entries and accounting categories are our operational classification, not copied product SKUs or a claim every named supplier sells every entry. Performance, waterproof/fire/acoustic ratings are not certified by this catalogue. No retailer marketing claim is used as a technical guarantee. Older official documents below support family names, not current stock or prices.

| Source | Families reviewed |
|---|---|
| [Akij Board](https://akijboard.com/products/) | Particle board, MDF, plywood, melamine/veneer/HPL/acrylic/PET-G faces, fibre cement |
| [HATIL](https://www.hatil.com/office-furniture-price-in-bangladesh) | Solid timber, engineered-board furniture, PU finish |
| [Americano Global](https://americanoglobal.com/) | HPL, acrylic laminate, edge banding, furniture fittings; search-index evidence, direct fetch timed out |
| [Best Interior](https://bestinterior.bd/) | Decorative panels, fittings, floor and wall materials; search-index evidence, direct fetch timed out |
| [IndoorArts](https://www.indoorarts.com.bd/) | Compact boards, profiles, ceilings, SPC/LVT/parquet, acoustic and blind systems |
| [RAK Bangladesh](https://www.rakceramics.com/bangladesh/en-bd/) | Ceramic/porcelain tiles, slabs, sanitaryware |
| [RFL Pipe](https://www.rflpipe.com/) | Water/drainage plumbing pipe/fitting families |
| [Berger Bangladesh technical sheet](https://www.bergerbd.com/wp-content/uploads/2025/02/ECO-COAT-TDS.pdf) | Interior emulsion; wood-finish families also cross-checked against HATIL; accessory finishing entries are generic workflow suggestions |
| [Pidilite woodworking range](https://www.pidilite.com/categories/woodworking-adhesives) | Wood, laminate, PU and PVC/acrylic bonding; local presence supported by official Bangladesh announcement |
| [Superior Electric Bangladesh catalogue](https://superiorelectricbd.com/wp-content/uploads/2025/07/SEL_Catalogue_2025.pdf) | Switches, protection, distribution, containment, lighting |
| [Walton switches](https://waltonbd.com/crystal-series) | Switched power socket family |
| [Flora Glass World](https://floragw.com/) | Glass, aluminium, shower enclosure and mirror families |
| [Home Touch Bangladesh](https://hometouchbd.com/) | Curtain/blackout/thermal/jacquard and upholstery families |
| [Unique Tools & Engineering](https://utebd.com/public/sub-category/rockwool-insulation) | Rockwool insulation; acoustic slats/panels supported by interior suppliers |
| [PWD Bangladesh schedule](https://ss.pwd.gov.bd/document/sor/Final_SoR_2022%20_2nd_Revised.pdf) | Civil/installation and aluminium-glass work reference, not a current price list |
| [MA Thai & Interior](https://shop.jrcorporationbd.com/) | PVC and gypsum ceiling families |
| [Walton AC manual](https://waltonbd.com/user-manuals/air-conditioner/english-user-manual.pdf) | Split AC family and installation-related purchasing families |

## Accounting usage

Income labels describe service/receipt purposes, not revenue-recognition rules. Use existing Client Payment/advance workflow for actual collections. Expense labels classify labour, site costs and office overhead. Materials purchased through Purchases must not also be entered as manual expense just because a catalogue item exists. Supplier bill payments settle existing purchases and should not create material cost twice. Payroll uses the payroll workflow; do not post salary twice through a manual expense label.

## Reuse

Source data: server/catalog/bd-interior.js. Preview: from server directory, node import-bd-interior-catalog.js. Apply locally: node import-bd-interior-catalog.js --apply. Importer refuses remote databases, saves a private pre-import snapshot and writes master rows in one transaction. Repeated imports skip normalised existing names; conflicts on codes stop the import. The new BDI category/item codes are stable. Source family URL is recorded in each new material description. To import live later, review a production-only plan and back up there first; this task did not update live master data.

Verification: catalogue length/uniqueness/source/unit tests passed. Local apply inserted the above counts; immediate repeat preview returned zero additions and skipped 262 existing materials. No source database backup or private snapshot is included in Git.

## Board-family follow-up

2026-10-15: Added 32 requested generic/brand-specific board families; local material total now 294. Super Board and Partex official indexed catalogues plus Bangladesh retailer Particle Mela support family naming. Sources: https://superboard.com.bd/shop/page/4/?per_page=36 , https://superboard.com.bd/shop/page/14/ , https://partexstar.com/concern/partex-boards , https://partexstargroup.com/companies/partex-star-particle-board-mills-limited/products/particle-board/veneered-board/ , https://particlemela.com/product/ahmed-plywood-burma-teak/ , https://particlemela.com/shop/ . Super/Partex direct fetch timed out; their indexed evidence was used. Retail listing is not manufacturer certification or stock confirmation.

Includes Gorjon/Gurjan, Marine, Burma teak faced plywood, PVC foam and WPC generic entries, plus supported Super, Partex and Ahmed families. Names like Burma teak and Crown teak describe marketed faces/finishes and do not certify solid teak or geographic origin. No Cartesian combination of all brands, thicknesses and grades was invented. Ahmed HPL, melamine and uPVC categories were visible in retailer navigation. Generic PVC/WPC entries are user-requested family additions, not a claim PWD certifies those products. The importer now persists brand where provided. No existing generic board was overwritten or rebranded. Run twice verified zero further additions. Thickness, face/core, glue class, actual sheet area and units require purchase specification.

## Company-requested thickness variants

Added 18, 16, 12, 6 and 3 mm variants for 38 sheet-board families (190 new items); local material total 484. Each uses a separate stable material code and explicit thickness in name, size and specification so purchases and stock do not combine different thicknesses. Original unsized families are preserved; use a sized variant for new purchases when applicable. Sheet length/width remains unspecified. This expansion is based on the owner's stated common-use thicknesses, not online verification that every brand sells every combination. Availability and certification must be confirmed against supplier quotation. No prices, stock or transaction rows created. Local snapshot saved before insertion, tests passed, repeat preview reported zero additions. Live not updated.

## Separate material and brand

2026-10-15 owner clarification: item name is board family + thickness; brand is a separate field (Super, Ahmed, Star Partex, Akij, or a custom brand). Normalised 145 previously prefixed local board records without changing IDs, purchase/stock relations or unit. Added 24 missing requested brand/family variants including Super plain particle board and Akij families, bringing local master count to 508. No example 50-sheet purchase was posted. Purchase/estimate material options show brand alongside item name so different brand material IDs remain distinct. Brand input supports suggestions and custom text. Import identity now includes name + brand to preserve distinct stock items. Existing unsized records remain; choose explicit thickness for purchases. One sheet is not automatically converted to sqft; supplier unit must match before receipt.

Run normalise-board-brands.js --apply locally before rerunning catalogue import when upgrading from old prefixed names. The normaliser modifies only exact seeded-name matches and snapshots changed-field source rows privately. Live data not changed.
