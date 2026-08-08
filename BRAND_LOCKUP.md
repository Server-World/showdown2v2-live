# Supersonic Showdown League 2v2 brand lockup

The website brand lockup is now hard-coded into page headers and reinforced by `site-v2.js`.

## Current public logo

`/assets/branding/ssl-logo.svg`

This remains the current public Supersonic Showdown shield/car/flame/ball logo until Tony supplies and approves a final replacement.

## Text lockup

Line 1: Supersonic Showdown
Line 2: League 2v2

Accent rules:

- First S in Supersonic: orange
- First S in Showdown: orange
- L in League: orange
- Both 2 characters in 2v2: orange
- Lowercase v in 2v2: blue

## HTML snippet

```html
<a class="brand brand-lockup" href="/" aria-label="Supersonic Showdown League 2v2 home">
  <img class="brand-logo" src="/assets/branding/ssl-logo.svg" alt="Supersonic Showdown logo" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
  <span class="brand-fallback">SS</span>
  <span class="brand-copy">
    <b><span class="orange">S</span>UPERSONIC <span class="orange">S</span>HOWDOWN</b>
    <strong><span class="orange">L</span>EAGUE <span class="orange">2</span><span class="blue">v</span><span class="orange">2</span></strong>
  </span>
</a>
```

## Rule

Do not use the old plain two-line `SUPERSONIC / SHOWDOWN` markup for new pages.
