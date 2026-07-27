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

## Zapnutí / vypnutí

Klikni na ikonu extension v toolbaru → nahoře je přepínač "Auto-hide enabled".
Přepíná se okamžitě (live), bez nutnosti dát "Save":

- **Zapnuto** → soubory odpovídající vzorům se skryjí (klikne se na "Hide file contents").
- **Vypnuto** → dřív skryté soubory odpovídající vzorům se zase rozbalí (klikne se na
  "Show file contents").

Stav se ukládá přes `chrome.storage.sync`, takže se synchronizuje mezi zařízeními
přihlášenými ke stejnému Chrome účtu.

## Úprava vzorů

V témže popupu je textarea, kam můžeš zapsat vlastní vzory (jeden na řádek, `*`
funguje jako wildcard). Uloží se tlačítkem "Save".

## Jak to funguje

- `content.js` se injectuje na stránky odpovídající
  `https://gitlab.wallee.com/*/merge_requests/*`.
- Přes `MutationObserver` sleduje DOM (GitLab je Vue SPA a diffy dorenderovává
  postupně/lazy), takže i pozdě načtené soubory se zpracují.
- Pro každý `.file-header-content` přečte název souboru
  (`[data-testid="file-name-content"]`, atribut `title`) a porovná ho s
  glob vzory převedenými na regex.
- Podle aktuálního stavu přepínače (`enabled`) a toho, jestli je soubor zrovna
  rozbalený nebo skrytý, klikne na tlačítko "Hide file contents" / "Show file
  contents" — ale jen když se to liší od požadovaného stavu, takže se to
  nezacyklí a nekliká zbytečně.
- Přepínač i vzory se čtou přes `chrome.storage.onChanged`, takže se
  změna z popupu projeví na stránce okamžitě, bez reloadu.

## Poznámka

Pokud by GitLab časem změnil strukturu DOM (třídy, `data-testid` atributy,
`aria-label` tlačítek), bude potřeba upravit selektory v `content.js`.
