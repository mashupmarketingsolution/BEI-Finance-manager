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
