# GitLab Diff Auto-Hide

Chrome extension, která na stránce s diffy merge requestu (`.../merge_requests/<id>/diffs`)
automaticky sbalí ("Hide file contents") soubory, jejichž název odpovídá zadaným vzorům
(výchozí: `*.spec.ts`, `*.stories.tsx`, `*.snap`).

## Instalace (unpacked)

1. Otevři `chrome://extensions`
2. Zapni "Developer mode" (vpravo nahoře)
3. Klikni na "Load unpacked" a vyber tuto složku (`gitlab-diff-autohide-extension`)
4. Hotovo — otevři libovolné MR na `gitlab.wallee.com` a diffy odpovídající vzorům
   se samy sbalí.

## Úprava vzorů

Klikni na ikonu extension v toolbaru → objeví se textarea, kam můžeš zapsat
vlastní vzory (jeden na řádek, `*` funguje jako wildcard). Uloží se přes
`chrome.storage.sync`.

## Random MR tlačítko

Na stránce se seznamem merge requestů (`.../merge_requests` nebo `.../merge_requests/?<filtry>`,
ale NE na detailu jednoho MR) se vpravo dole objeví plovoucí tlačítko **🎲 Random MR**.
Kliknutím se z aktuálně vyrenderovaného seznamu (respektuje jakékoli filtry v URL)
náhodně vybere jeden MR a prohlížeč na něj naviguje.

## Jak to funguje

- `content.js` se injectuje na stránky odpovídající
  `https://gitlab.wallee.com/*/merge_requests*` (diffy, detail MR i seznam MRek).
- Přes `MutationObserver` sleduje DOM (GitLab je Vue SPA a obsah dorenderovává
  postupně/lazy), takže i pozdě načtené soubory/položky se zpracují a tlačítko
  se přidá/odebere i při SPA navigaci bez reloadu stránky.
- **Auto-hide:** pro každý `.file-header-content` přečte název souboru
  (`[data-testid="file-name-content"]`, atribut `title`) a porovná ho s
  glob vzory převedenými na regex. Pokud sedí a soubor je aktuálně rozbalený
  (tlačítko má `aria-label="Hide file contents"`), klikne na něj. Každý header
  se označí `data-autohide-processed`, takže pokud si soubor ručně znovu
  rozbalíš, extension ho nebude znovu zavírat.
- **Random MR:** na stránkách, kde `location.pathname` končí na `/merge_requests`
  nebo `/merge_requests/`, posbírá všechny `a[data-testid="issuable-title-link"]`
  odkazující na `/merge_requests/<číslo>` a jeden náhodně vybraný otevře.

## Poznámka

Pokud by GitLab časem změnil strukturu DOM (třídy, `data-testid` atributy),
bude potřeba upravit selektory v `content.js`.
