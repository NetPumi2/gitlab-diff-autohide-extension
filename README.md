# GitLab Diff Auto-Hide

Chrome extension, která na stránce s diffy merge requestu (`.../merge_requests/<id>/diffs`)
automaticky sbalí ("Hide file contents") soubory, jejichž název odpovídá zadaným vzorům
(výchozí: `*.spec.ts`, `*.stories.tsx`, `*.snap`).

## Instalace (unpacked)

1. Otevři `chrome://extensions`
2. Zapni "Developer mode" (vpravo nahoře)
3. Klikni na "Load unpacked" a vyber tuto složku (`gitlab-diff-autohide`)
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

## Skrytí počtu změn

V záložce "Changes" na detailu merge requestu (`.../merge_requests/<id>`) se
celý badge (stejné velikosti a tvaru jako originál) přebarví na červeno a
číslo v něm se skryje (text je jen průhledný, ne odstraněný — takže to
přežije i to, že GitLab/Vue text badge při přepínání tabů znovu vykreslí).
Po najetí myší kamkoli na červený badge se přes nativní tooltip (`title`
atribut na celém badge, ne jen na čísle) zobrazí původní počet.

## Jak to funguje

- `content.js` se injectuje na stránky odpovídající
  `https://gitlab.wallee.com/*/merge_requests*` (diffy, detail MR i seznam MRek).
- Přes `MutationObserver` (včetně `characterData`) sleduje DOM (GitLab je Vue
  SPA a obsah dorenderovává postupně/lazy i přepisuje text uzlů při přepnutí
  tabu), takže se i pozdě načtené/přepsané prvky zpracují znovu.
- **Auto-hide:** pro každý `.file-header-content` přečte název souboru
  (`[data-testid="file-name-content"]`, atribut `title`) a porovná ho s
  glob vzory převedenými na regex. Pokud sedí a soubor je aktuálně rozbalený
  (tlačítko má `aria-label="Hide file contents"`), klikne na něj. Každý header
  se označí `data-autohide-processed`, takže pokud si soubor ručně znovu
  rozbalíš, extension ho nebude znovu zavírat.
- **Random MR:** na stránkách, kde `location.pathname` končí na `/merge_requests`
  nebo `/merge_requests/`, posbírá všechny `a[data-testid="issuable-title-link"]`
  odkazující na `/merge_requests/<číslo>` a jeden náhodně vybraný otevře.
- **Skrytí počtu změn:** pro každý `.js-changes-tab-count` najde rodičovský
  `.gl-badge`, přidá mu trvalou CSS třídu `gitlab-hidden-badge` (přebarví
  pozadí na červeno a skryje text přes `color: transparent`, takže badge má
  pořád stejnou velikost/tvar) a nastaví na badge `title` s aktuálním počtem.

## Poznámka

Pokud by GitLab časem změnil strukturu DOM (třídy, `data-testid` atributy),
bude potřeba upravit selektory v `content.js`.
