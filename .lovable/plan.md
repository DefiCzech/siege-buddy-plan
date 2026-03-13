

## Analýza problému

Funkce `extractRankNameFromText` hledá **první výskyt** jakéhokoliv názvu ranku v HTML stránky. Tracker stránka pravděpodobně zmiňuje "Gold" (např. v historii sezón, v jiném módu) dříve než "Copper II", takže regex vrátí "Gold". Mezitím obrázek ranku je správně Copper II, protože se extrahuje z jiného zdroje (URL ikony).

Na řádku 151 se rank name bere primárně z `imageRank.rankName`, ale ten se extrahuje z alt textu obrázku — pokud alt text neobsahuje rozpoznatelný rank (nebo obsahuje jiný), fallback jde na `extractRankNameFromText`, který vrátí první textový výskyt = "Gold".

## Řešení

**Extrahovat rank name z URL obrázku ranku** — URL typicky obsahuje název ranku (např. `ranks/s28/copper_2.png`). Tím se zajistí konzistence mezi ikonou a textem.

### Změny v `supabase/functions/fetch-rank/index.ts`:

1. **Přidat funkci `extractRankNameFromImageUrl`** — parsuje URL obrázku a extrahuje rank tier + division (např. `copper_2.png` → "Copper II").

2. **Upravit `parseTrackerProfile`** — po získání `rankImageUrl` se nejdříve pokusí odvodit rank name z URL obrázku. Teprve pokud to selže, použije alt text nebo textový fallback.

3. **Mapování čísel na římské** — `1` → `I`, `2` → `II`, atd. pro správný formát názvu.

Tím bude rank name vždy konzistentní s ikonou, protože oba pochází ze stejného zdroje (URL obrázku).

