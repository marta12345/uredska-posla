# @ Uredska posla

Web aplikacija za upravljanje uredskim zadacima. Bez ovisnosti, bez build koraka — samo otvori `index.html` u pregledniku.

## Značajke

- ➕ Kreiranje zadataka (naslov, opis, dodijeljena osoba, prioritet, rok)
- 🔄 Statusi: **Za napraviti** → **U tijeku** → **Gotovo**
- 🚩 Prioriteti: niski / srednji / visoki
- ⏰ Isticanje zadataka kojima je rok istekao
- 🔍 Pretraga i filtriranje po statusu
- 📊 Statistika (ukupno / po statusu)
- 💾 Podaci se spremaju lokalno u pregledniku (`localStorage`)
- **@** ikona na tabu preglednika i oznaka uz naziv aplikacije

## Pokretanje

Otvori `index.html` u bilo kojem modernom pregledniku. Nije potreban server ni instalacija.

## Struktura

| Datoteka | Opis |
|----------|------|
| `index.html` | Struktura stranice i `@` favicon |
| `styles.css` | Stilovi |
| `app.js` | Logika (zadaci, filtriranje, spremanje) |
