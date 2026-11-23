# CAE English – návod k použití

Osobní aplikace na přípravu na Cambridge C1 Advanced. Běží jen na tomto počítači, nic neodesílá na internet a nic nestojí.

> Všechna cvičení jsou **cvičný obsah vytvořený AI ve formátu zkoušky**, ne oficiální materiály Cambridge. Skóre je v hrubých bodech, bez převodu na Cambridge English Scale.

## Spuštění

**Nejjednodušší:** dvakrát klikněte na soubor `C:\claude ai workspace\firma-na-aplikace\projects\cae-english\spustit.cmd`. Otevře se černé okno a po chvíli prohlížeč s aplikací. Okno nechte otevřené; jeho zavřením aplikaci ukončíte.

**Z PowerShellu:** použijte `npm.cmd` (ne `npm` – to Windows na tomto PC blokuje kvůli zásadám spouštění skriptů):
```powershell
npm.cmd --prefix "C:\claude ai workspace\firma-na-aplikace\projects\cae-english" run dev
```
Pak otevřete **http://localhost:5173** (Chrome nebo Edge). Ukončení: `Ctrl+C`.

Pokud stránka nejde otevřít, aplikace neběží – spusťte ji znovu jedním z postupů výše.

## Co aplikace obsahuje

| Sekce | Obsah |
|---|---|
| Reading and Use of English | Part 1–8, 34 sad, 244 otázek |
| Listening | Part 1–4, 8 sad, 60 otázek (čte hlas prohlížeče) |
| Writing | 8 zadání (4 eseje, dopis, proposal, report, review) |
| Speaking | 5 sad, Part 1–4, nahrávání + odpočet |
| Mini mock | Part 1–4 + volitelně Listening Part 1, s časovým limitem |

Doporučený postup: **Domů → část zkoušky → sada → Zkontrolovat odpovědi → Zobrazit vysvětlení**. Po pár dnech se podívejte na **Slabá místa** (3 nejslabší typy otázek, od 10 odpovědí) a použijte **Opakování** (jen otázky, které jste měl naposledy špatně).

## Listening

- Každou nahrávku lze pustit **2×** jako u zkoušky (v Nastavení lze změnit na neomezeně).
- Text nahrávky se ukáže až po odeslání odpovědí.
- Na tomto PC jsou jen americké hlasy. Britský hlas přidáte ve Windows: **Nastavení → Čas a jazyk → Řeč → Přidat hlasy → English (United Kingdom)**, pak ho vyberte v Nastavení aplikace.
- Pokud se přehrávání zasekne, použijte **Zastavit** a **Přehrát** (spotřebuje se jedno přehrání).

## Writing a Speaking – zpětná vazba přes Claude

Aplikace sama AI nevolá. Místo toho připraví **prompt** pro váš Claude Pro chat:

1. Napište text (Writing) nebo nahrajte odpověď a **přepište, co jste řekl** (Speaking).
2. Klikněte **Zkopírovat prompt**. Pokud kopírování nejde, označte text v zobrazeném poli a stiskněte `Ctrl+C`.
3. Otevřete **claude.ai**, vložte prompt (`Ctrl+V`) a odešlete.
4. Odpověď Claude zkopírujte zpět do pole **Zpětná vazba** v aplikaci a uložte.

Zpětná vazba od Claude je **AI hodnocení cvičné úlohy, ne známka Cambridge**.

Speaking: při prvním nahrávání prohlížeč požádá o povolení mikrofonu – povolte ho. Nahrávky zůstávají jen ve vašem prohlížeči; tlačítkem **Stáhnout nahrávku** si je můžete uložit.

## Zálohování dat (důležité)

Pokrok je uložený jen v tomto prohlížeči. Vymazání dat prohlížeče ho smaže.

- **Nastavení → Stáhnout zálohu** uloží soubor `cae-english-zaloha-RRRR-MM-DD.json`. Dělejte to aspoň jednou týdně (aplikace vám to po 7 dnech připomene).
- **Nastavení → Obnovit ze zálohy**: vyberte soubor, zkontrolujte náhled a potvrďte.
- Nahrávky ze Speakingu v záloze **nejsou**.

## Na co si dát pozor

- **Mini mock** neopouštějte uprostřed – rozpracované odpovědi se neuloží.
- Když najdete chybu v klíči, použijte u otázky **Nahlásit chybu** nebo **Myslím, že je to správně** (uzná odpověď).
- Na telefonu přes domácí Wi-Fi nefunguje mikrofon ani automatické kopírování (prohlížeč to bez HTTPS nedovolí). Ostatní funguje, data z telefonu jsou ale oddělená od PC (přenos přes zálohu).
