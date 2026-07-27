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

## Jak to funguje

- `content.js` se injectuje na stránky odpovídající
  `https://gitlab.wallee.com/*/merge_requests/*`.
- Přes `MutationObserver` sleduje DOM (GitLab je Vue SPA a diffy dorenderovává
  postupně/lazy), takže i pozdě načtené soubory se zpracují.
- Pro každý `.file-header-content` přečte název souboru
  (`[data-testid="file-name-content"]`, atribut `title`) a porovná ho s
  glob vzory převedenými na regex.
- Pokud sedí a soubor je aktuálně rozbalený (tlačítko má
  `aria-label="Hide file contents"`), klikne na něj.
- Každý header se označí `data-autohide-processed`, takže pokud si soubor
  ručně znovu rozbalíš, extension ho nebude znovu zavírat.

## Poznámka

Pokud by GitLab časem změnil strukturu DOM (třídy, `data-testid` atributy),
bude potřeba upravit selektory v `content.js`.
