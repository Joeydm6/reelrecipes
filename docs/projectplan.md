Fase 1: Basis opzetten (Framework & Infra)

In deze fase wordt de fundering gelegd voor de webapp. We initiëren een nieuw project (bijv. Next.js op Vercel) en integreren Tailwind CSS voor styling. Ook voegen we shadcn/ui componenten toe voor een moderne UI-stijl. We richten een Supabase-project in (gratis tier) voor authenticatie en database-opslag – de free tier is ruim voldoende voor een hobbyproject (o.a. ~500 MB database, 1 GB storage). Belangrijk is om Supabase Auth (email/password) in te schakelen en de basistabellen aan te maken (bijv. een recipes tabel met velden voor titel, ingrediënten, stappen, etc., en relaties voor gebruiker, ingrediëntenlijst enz.). Tot slot configureren we de lokale AI-omgeving: installeer OpenAI’s Whisper voor transcriptie en LM Studio voor het lokaal draaien van een taalmodel. In deze fase zorgen we dat LM Studio in server mode draait met een geschikt model (bijv. een lokaal GPT-3.5-achtige model) zodat we via een API verzoeken kunnen doen. Deliverables: een werkende Next.js/Tailwind projectbasis, Supabase verbonden, en lokale AI-tools operationeel.

Fase 2: Authenticatie & Database schema

Implementeer gebruikersauthenticatie met Supabase. Supabase Auth biedt out-of-the-box ondersteuning voor email-login en andere methoden, dus we maken een eenvoudige registratie/inlogpagina. We beveiligen de data per gebruiker (row-level security aanzetten zodat elke gebruiker alleen zijn eigen recepten ziet). Definieer het datamodel in Supabase: naast de recipes tabel kunnen we subtabellen of JSON-velden gebruiken voor ingrediënten en stappen. Mogelijk ontwerp:

recipes: id, user_id (relatie met gebruiker), titel, afbeelding/url, porties, totale_kooktijd, favoriet (bool), rating (int), timestamp etc.

ingredients: id, recipe_id, naam, hoeveelheid, eenheid.

steps: id, recipe_id, beschrijving, stap_nummer.

(optioneel) nutrition: kcal, eiwitten, vet, koolhydraten. We gebruiken Supabase Storage voor eventuele media (bv. geüploade audiobestanden of afbeeldingen). In deze fase configureren we ook realtime functionaliteit: Supabase Realtime wordt geactiveerd zodat front-end en lokale agent meldingen krijgen bij DB-wijzigingen. Deliverables: Auth flow werkend (nieuwe gebruikers kunnen inloggen) en database/tabellen klaar met juiste rechten.


Fase 3: Front-end UI – Recepten toevoegen en weergeven

Nu bouwen we de gebruikersinterface voor het toevoegen van recepten en het tonen van de receptenlijst. De gebruiker moet een Instagram-link kunnen invoeren in een formulier. Bij submissie halen we via Instagram’s oEmbed API een embed code of preview op – hiermee tonen we direct een preview (afb. en caption) in de UI, zodat de gebruiker ziet of het de juiste post is. Als de Instagram-post een video bevat of geen tekstuele receptcaption heeft, bieden we een optie om het video/audio-bestand te uploaden (dat slaan we in Supabase Storage). Zodra de gebruiker bevestigt, creëren we een nieuw receptrecord in Supabase (met status “pending” en de IG URL en evt. storage path van de media).

Aan de display-kant ontwikkelen we:

Receptenlijst pagina: Overzicht van alle opgeslagen recepten van de gebruiker in een nette grid/list, met sorteer- en filteropties (op rating, datum, favoriet, geschatte tijd, etc.).

Recept detail pagina: Toont alle details van het recept. Hier presenteren we de titel, eventueel een afbeelding (uit de IG-post embed), de lijst van ingrediënten (met checkboxen zodat de gebruiker ze kan afvinken tijdens het koken), de bereidingsstappen, tags, voedingswaarden (kcal, macro’s) en meta-info zoals porties, rating (1–10) en een favoriet-toggle. Alle recepten worden in een uniform, overzichtelijk format getoond, vergelijkbaar met Stashcook’s receptweergave. De UI gebruikt shadcn/ui components voor consistente styling en is responsive voor mobiele weergave. We voorzien ook een knop om het recept te bewerken voor het geval de AI parsing niet 100% klopt (de gebruiker kan dan velden corrigeren).


Verder implementeren we een donker/licht modus schakelaar voor betere UX in verschillende omstandigheden. Tailwind ondersteunt dit eenvoudig via een dark variant of met behulp van een library als next-themes. We zorgen ervoor dat de UI op mobiel devices goed werkt (responsive layout, touch-vriendelijke elementen). Deliverables: UI-pagina’s voor recept toevoegen, recept lijst en detailweergave zijn functioneel en stijlvol vormgegeven volgens de ontwerpprincipes (lichte/donkere modus, Tailwind styling, StashCook-achtige componenten).

Fase 4: Lokale verwerking (Whisper & LM Studio integratie)

Deze fase richt zich op de AI-functionaliteit: het verwerken van Instagram content naar een gestructureerd recept. We ontwikkelen een lokale agent (een script of kleine applicatie) die draait op de machine van de gebruiker waar Whisper en LM Studio beschikbaar zijn. Deze agent houdt Supabase in de gaten voor nieuwe of onbewerkte recepten (bijvoorbeeld via Supabase Realtime subscribtions of polling). Wanneer de gebruiker in fase 3 een nieuw recept toevoegt (IG link of upload), ziet de agent dat er een record met status “pending” is.

De verwerkingsstappen zijn:

1. Data ophalen: De agent haalt de benodigde data op. Bij een IG link: mogelijk via de Instagram Graph API de caption tekst ophalen (een alternatief is de embed HTML parsen, maar de officiële API geniet de voorkeur, hoewel deze een developer token vereist). Bij een geüploade video: de agent downloadt het bestand uit Supabase Storage.


2. Transcriptie (Whisper): Als er een video of audio is, voert de agent een transcriptie uit met Whisper. Whisper is een krachtig automatisch spraakherkenningsmodel dat zeer nauwkeurige resultaten levert en vrij gemakkelijk lokaal te gebruiken is. We voeren het audiobestand (of audio van de video) aan Whisper; dankzij training op 680k uur data is Whisper robuust tegen verschillende accenten en ruis, wat essentieel is omdat Instagram-video’s variërende kwaliteit kunnen hebben. Het resultaat is een ruwe tekst van het gesproken recept. (Indien de IG-post al een tekstcaption heeft, kunnen we Whisper overslaan.)


3. Parsing naar JSON (LM Studio): Vervolgens nemen we de verkregen ruwe recepttekst (hetzij direct uit caption, hetzij uit Whisper transcript) en sturen die naar het lokale LLM via LM Studio. LM Studio draait een taalmodel lokaal en biedt een OpenAI-compatible API, dus we kunnen eenvoudig een bestaande OpenAI API client gebruiken door de base URL naar http://localhost:1234/v1 te wijzen. We formuleren een prompt die het model instrueert om de recepttekst te analyseren en de output te geven in een vooraf gedefinieerd JSON-formaat met velden: titel, ingrediënten (lijst van objecten met naam/hoeveelheid), stappen (genummerde lijst), eventuele tags, voedingswaarden, porties, etc. Bijvoorbeeld: “Parse the following recipe text and output a JSON with keys: title, ingredients, steps, tags, nutrition. Only output valid JSON.” Het lokale model (bv. Llama 2 of een ander model geladen in LM Studio) genereert dan de gestructureerde data. LM Studio is gemaakt om lokaal AI-modellen te draaien, volledig privé en offline, wat past bij ons doel om geen externe AI API te gebruiken.


4. Validatie & Opslag: De agent ontvangt de JSON-output van het LLM. We valideren deze (controleer of het geldige JSON is en alle verwachte velden bevat; eventueel kleine post-processing zoals eenheden normaliseren). Vervolgens schrijven we de gestructureerde gegevens terug naar Supabase: we updaten het receptrecord (bv. vul velden in of zet een flag status = parsed) en slaan relaties op in de ingrediëntentabel en stappen-tabel indien gebruikt. Dankzij Supabase’s realtime mechanisme zal deze update direct naar de front-end gepusht worden, zodat de gebruiker kort na het toevoegen automatisch de uitgewerkte receptinformatie ziet verschijnen in de UI.



Tijdens deze fase implementeren we ook foutafhandeling en logging: als de AI de tekst niet kan parsen of Whisper faalt, moet de agent dit aangeven (bv. status = error met een foutmelding), zodat de gebruiker feedback krijgt en eventueel de taak opnieuw kan proberen of handmatig invoer kan doen. Deliverables: Werkende lokale agent die nieuwe recepten automatisch verwerkt – bewezen door een end-to-end test: gebruiker voert een IG link in, binnen enkele ogenblikken verschijnt het uitgewerkte recept in de webapp.

Fase 5: Boodschappenlijst en extra functionaliteit

Met de kernfunctionaliteit gereed, richten we ons op handige extra’s. Een belangrijke feature is de boodschappenlijst generator. In de UI voegen we de mogelijkheid toe om meerdere recepten te selecteren (bv. met checkboxen of een “voeg toe aan lijst” knop per recept). De gebruiker kan hiermee een gecombineerde boodschappenlijst maken. De front-end logica neemt alle ingrediënten van de gekozen recepten, groepeert ze (sommeert hoeveelheden per ingrediënt waar mogelijk) en presenteert ze in een overzicht. Dit overzicht is interactief: de gebruiker kan items afvinken terwijl hij boodschappen doet, vergelijkbaar met hoe Stashcook dit aanpakt. We slaan de boodschappenlijst desgewenst lokaal op of in Supabase (eventueel als aparte tabel shopping_list_items of als genereerbaar overzicht zonder persistente opslag).

Andere extra’s:

Exporteren: implementeer functionaliteit om een recept of een boodschappenlijst te exporteren als PDF of TXT. Dit kan bijvoorbeeld via een client-side PDF generator library of door een eenvoudige tekstdownload. Zo kan de gebruiker zijn recepten ook buiten de app bewaren of delen.

Sorteren/Filteren: breid de receptenlijst uit met sorteerknoppen (op datum toegevoegd, op beoordeling, op bereidingstijd als aanwezig) en filters (bijv. alleen favorieten, of zoeken op tag). Dit verhoogt het gebruiksgemak zodra de collectie recepten groter wordt.

Porties schalen: indien porties en hoeveelheden beschikbaar zijn, kan een gebruiker het aantal porties aanpassen waarna de hoeveelheden van ingrediënten proportioneel worden herberekend. Dit is optioneel maar een nuttige toevoeging (Stashcook heeft een soortgelijke functionaliteit).

Planning (optioneel): in navolging van Stashcook’s meal planner kunnen we eventueel een weekplanning toevoegen, waar de gebruiker recepten aan dagen koppelt. Vanwege de complexiteit is dit een stretch-goal en niet vereist volgens de huidige opdracht, maar de data-infrastructuur (Supabase) kan het wel aan.


In deze fase testen we de gehele applicatie grondig in scenario’s van begin tot eind. We verbeteren waar nodig de UX: bijvoorbeeld laden we een skeleton of spinner in de UI terwijl een recept verwerkt wordt, geven duidelijke meldingen bij fouten (zoals “Transcriptie mislukt, probeer opnieuw” als Whisper faalt), en zorgen dat alles soepel aanvoelt.

Fase 6: Polijsten en afronding

Nu brengen we alles samen en maken het project klaar voor AI-gegenereerde ontwikkeling (Trae integratie). We schrijven documentatie in Markdown (zoals dit plan en de to-do lijst) zodat Trae per taak aangestuurd kan worden. De UI krijgt een laatste stijlcontrole om consistent te zijn met de Stashcook-inspiratie (kleurenschema’s, component lay-out). We checken mobiele weergave en dark mode grondig. Performance-optimalisaties worden toegepast: caching van embed-previews, lazy loading van afbeeldingen, etc., om de app snel te houden.

Ten slotte zetten we de webapp live (bv. deploy op Vercel of op een VPS). Omdat de AI-component lokaal draait, communiceren we duidelijk aan de gebruiker (in README of UI) dat ze de lokale agent moeten starten voor volledige functionaliteit. We leveren een handleiding voor het runnen van de lokale script en vereisten (Python omgeving voor Whisper, LM Studio geïnstalleerd met gewenst model). Deliverables: Volledig werkende, gestylede webapp in de cloud, plus een lokaal draaiende AI-verwerker. Het project is daarmee gereed voor gebruik en verdere codegeneratie uit de to-do lijst.

Architectuuroverzicht

Deze webapplicatie bestaat uit een hybride architectuur met een cloud-gehoste front-end en back-end voor persistente data, gecombineerd met lokaal draaiende AI-componenten voor verwerking. Hieronder een overzicht van de componenten en hun interacties:

Frontend (Web UI) – Een Next.js webapp (gehost op Vercel of een VPS) die de gebruikersinterface levert. De front-end communiceert direct met Supabase (voor authenticatie en database acties) via de Supabase JS SDK. Wanneer de gebruiker een Instagram URL invoert, vraagt de front-end via Instagram’s oEmbed API een embed code op voor een preview. De UI stuurt vervolgens de receptinformatie (IG link, evt. caption of geüpload bestand) door door een record in de database te creëren. De UI is realtime verbonden met Supabase: zodra de receptgegevens in de database worden aangevuld door de AI (via de lokale agent), ontvangt de UI een update en toont de resultaten direct zonder herladen (dankzij Supabase Realtime die DB-wijzigingen pusht naar clients).

Backend & Data opslag (Supabase) – Supabase fungeert als onze cloud backend. Het biedt een PostgreSQL database met directe CRUD mogelijkheden via API en biedt tevens authenticatie en file storage. We gebruiken Supabase voor auth (beheer van users en inloggen) en bewaren recepten en gerelateerde data in de database. Iedere verandering in relevante tabellen kan Supabase via websockets doorgeven aan ingelogde clients, wat we benutten voor realtime sync. De keuze voor Supabase (op de gratis laag) is pragmatisch: we krijgen een complete backend zonder zelf servers te beheren, inclusief realtime functionaliteit en schaalbaarheid voor kleine projecten. Bovendien zorgen JWT-auth tokens en Row Level Security ervoor dat data per gebruiker afgeschermd blijft.

Instagram API – Voor het tonen van een preview en verkrijgen van de ruwe receptinformatie maken we gebruik van Instagram integraties. De oEmbed endpoint (onderdeel van de Instagram Graph API) levert een HTML snippet en basismeta voor een publiek Instagrambericht. Dit gebruiken we in de UI voor preview. Daarnaast kan voor het verkrijgen van de caption tekst of media-URL de Instagram Basic Display API of Graph API gebruikt worden. Dit vereist een Facebook Developer app en token. In onze architectuur kan dit op twee manieren gebeuren: (a) direct vanuit de browser (alleen oEmbed JSON/HTML, beperkt tot embed-doeleinden), of (b) via een serverless function/edge function (waar de API token veilig zit) die de data ophaalt. Simpliciteitshalve proberen we eerst de oEmbed route voor preview. Voor de caption: als oEmbed genoeg info geeft (soms bevat de oEmbed JSON de caption), gebruiken we die; anders zou de lokale agent eventueel via onbeveiligde methoden (zoals HTML-scraping of een Instagram downloader API) de tekst kunnen ophalen. Opmerking: Instagram’s officiële API’s vereisen toestemming en hebben beperkingen, dus dit onderdeel moet met zorg worden opgezet (eventueel volstaat het de gebruiker zelf de caption tekst te laten invoeren indien API te omslachtig is).

Instagram oEmbed setup

- Maak een Facebook Developer app aan en koppel Instagram Basic Display/Graph API rechten.
- Haal een User Access Token of App Token op met voldoende rechten voor oEmbed.
- Zet in `ui/.env.local` de volgende variabelen:
  - `INSTAGRAM_OEMBED_ACCESS_TOKEN="<JE-TOKEN>"`
  - Optioneel `INSTAGRAM_OEMBED_GRAPH_VERSION="v21.0"` (laat weg om default te gebruiken)
- Herstart de dev server zodat de omgeving wordt ingeladen.
- Test met een publieke Instagram URL via de importpagina. De preview toont caption/thumbnail wanneer beschikbaar.

LM Studio setup (lokale LLM)

- Installeer LM Studio op je machine en download een geschikt instructiemodel.
- Start LM Studio in Developer Mode (OpenAI-compatibele API actief).
- Zet in `ui/.env.local`:
  - `LM_STUDIO_BASE_URL="http://localhost:1234/v1"`
  - `LM_STUDIO_MODEL="<jouw-model-id>"` (zoals getoond in LM Studio UI/models endpoint)
- Herstart de dev server: `npm run dev` (poort verschijnt in de terminal).
- Healthcheck: open `http://localhost:3001/api/llm/health` in de browser. Status moet `up` zijn en het model moet beschikbaar zijn.
- Ga naar de importpagina en voer een publieke Instagram URL in. Bij een online LLM zie je een rijkere voorvertoning (ingrediënten/stappen). Als LLM offline is, gebruikt de app caption/meta als fallback.


Lokale AI Agent – Dit is een programma dat op de computer van de gebruiker draait, in staat om zowel Whisper als LM Studio aan te spreken. Het vormt de brug tussen de cloud en de lokale AI. De agent maakt een verbinding met Supabase (authenticeert bijvoorbeeld met een service role key of met de gebruikerssessie via Supabase API) en luistert naar nieuwe recepten. Dit kan door gebruik te maken van Supabase’s Realtime Postgres Changes feed of door periodiek de database te pollen naar recepten met status “pending”. Wanneer een nieuw receptverzoek wordt gedetecteerd, haalt de agent de benodigde gegevens op (IG URL, of downloadt het geüploade mediabestand uit Supabase Storage). Vervolgens roept de agent de twee hoofdtaken aan: Whisper voor transcriptie (indien nodig) en het LLM voor parsing. De lokale agent communiceert met:

Whisper – uitgevoerd via bijvoorbeeld een Python script dat de Whisper modellen (die open-source beschikbaar zijn) aanroept op het mediabestand. Whisper zet audio om in tekst (ASR). Dit gebeurt volledig lokaal, zonder internet, dankzij het open-source model van OpenAI dat zeer nauwkeurig en meertalig is.

LM Studio – een lokaal LLM server dat de prompt uitvoert om de tekst naar JSON te parsen. LM Studio is opgezet in ontwikkelaarsmodus met de OpenAI-compatible API aan, zodat onze agent eenvoudig een POST request kan doen naar localhost om een completion te krijgen. Omdat LM Studio lokaal draait, blijven eventuele gevoelige gegevens (zoals receptinhoud) volledig privé. We kunnen kiezen voor een model dat goed is in instructies en structureren van tekst (mogelijk een fine-tuned model specifiek voor taak, of een algemene model met ons eigen prompt instructies).


Terugkoppeling – Nadat de lokale agent de JSON-output heeft, gebruikt hij Supabase’s REST of client SDK om de betreffende receptentry te updaten. Bijvoorbeeld: vul kolommen voor ingrediënten (evt. als JSON), stappen, etc., of plaats deze in gekoppelde tabellen. De agent markeert ook een veld status = 'done'. Via Supabase Realtime wordt de front-end hiervan op de hoogte gesteld, en die haalt de nieuwe gegevens op en rendert ze in de UI. Dit alles gebeurt doorgaans binnen enkele seconden tot enkele minuten (afhankelijk van Whisper/LLM snelheid en de lengte van het recept). De gebruiker ziet dus nadat hij een link invoert vrijwel automatisch het uitgewerkte recept verschijnen.


Samengevat: de cloud zorgt voor een gebruiksvriendelijke interface en permanente opslag/sync, terwijl de rekenintensieve AI-taken verplaatst zijn naar de gebruiker’s lokale machine. Deze opdeling benut het beste van beide werelden: een lichte, toegankelijke webapp voor overal toegang, en zware AI-modellen die lokaal draaien zonder dure serverkosten of privacyrisico’s.

Technieken per component

Frontend & UI: We kiezen voor Next.js (React) voor de front-end, gehost op Vercel voor gemak bij continu deployen. Styling doen we met Tailwind CSS voor snelle, consistente vormgeving. Bovenop Tailwind gebruiken we shadcn/ui, een open-source collectie van mooie, toegankelijke componenten die naar wens aanpasbaar zijn. Dit geeft ons direct kant-en-klare UI-elementen (knoppen, formulieren, modals, etc.) in de stijl van Radix UI, wat overeenkomt met de moderne look van Stashcook. De UI is responsive (mobile-first design) en ondersteunt dark mode (via CSS classes of context provider). Voor state management in de UI volstaat vaak React’s eigen state of lightweight libraries; veel data komt direct van Supabase (via hooks of context die Supabase’s real-time data reflecteren).

Back-end & Database: Supabase vervult de rol van back-end. Het is een Backend-as-a-Service op basis van PostgreSQL. We gebruiken Supabase’s database voor het opslaan van recepten, en Supabase Auth voor gebruikersbeheer. Auth geeft ons eenvoudig login en JWT-gebaseerde beveiliging zonder eigen back-end code. De database is relationeel, dus we kunnen normale SQL gebruiken en eventueel Supabase’s row level security voor toegang per gebruiker. Supabase heeft bovendien ingebouwde Realtime functionaliteit die het mogelijk maakt om live te luisteren naar database wijzigingen vanuit de frontend – essentieel voor onze sync. Bestanden (zoals geüploade audioclips) bewaren we in Supabase Storage, toegankelijk via URL (met beveiliging indien nodig). Voor server-side logic biedt Supabase optioneel Edge Functions (serverless functions in Deno) of database triggers. In dit project kunnen we een edge function inzetten voor bijv. het aanroepen van Instagram’s API zodat geheimen niet in de client hoeven, of triggers om default values in te stellen.

AI Parsing (Local LM Studio): Voor het parsen van recepttekst naar structuur gebruiken we LM Studio, waarmee lokale taalmodellen gedraaid kunnen worden. LM Studio ondersteunt veel modellen (gpt-oss, Qwen, Llama-2, etc.) en heeft een ontwikkelaarsmodus waarbij een OpenAI-compatibele REST API beschikbaar komt. Dit betekent dat we in onze code de bestaande OpenAI libraries of HTTP calls kunnen hergebruiken door simpelweg de base URL te veranderen naar de lokale server. We draaien bijvoorbeeld een model van ~7-13 billion parameters dat instructies goed aan kan en Nederlandstalige recepten ook begrijpt. De prompt-engineering is belangrijk: we instrueren het model expliciet om uitsluitend JSON terug te geven. LM Studio’s voordelen zijn privacy en geen afhankelijkheid van internet – alles draait op de PC van de gebruiker. Omdat LM Studio voor snelle interactie zorgt (geen opstartkosten per request) kunnen we dit realtime gebruiken.

Spraak naar tekst (Whisper ASR): Voor audio- en videorecepten zetten we OpenAI Whisper in. Whisper is als open-source model beschikbaar en kan lokaal draaien (bijv. via Python’s whisper library). Het is getraind op een enorme dataset en daardoor zeer accuraat in transcriptie, zelfs bij achtergrondruis of verschillende talen. We integreren Whisper bijvoorbeeld via een Python script aangeroepen door de lokale agent. De audio wordt in segmenten van max. 30 seconden geprocessed (Whisper’s architectuur hanteert 30s chunks). Whisper detecteert zelf de taal en kan desgewenst ook direct naar Engels vertalen, maar in dit project willen we de originele taal behouden (Nederlandse recepten blijven Nederlands). Door Whisper lokaal te gebruiken vermijden we API-kosten en beperkingen. OpenAI benadrukt dat Whisper’s gebruiksgemak ontwikkelaars in staat stelt spraakfunctionaliteit breed toe te passen – hier zien we dat terug in het eenvoudig kunnen toevoegen van voice-to-text voor recepten.

Synchronisatie & Integratie: De verbinding tussen cloud en lokaal wordt primair door Supabase verzorgd. Supabase’s real-time features sturen database-wijzigingen naar alle ingelogde clients, wat we benutten zodat de front-end weet wanneer een recept is verwerkt. De lokale agent gebruikt de Supabase client (mogelijk de JavaScript SDK via Node, of de Python SDK) om ook wijzigingen te ontvangen of ten minste om periodiek te checken. Dit vervangt complexere integraties zoals direct device-to-cloud messaging – Supabase fungeert als tussenpersoon/buffer. Omdat de lokale agent met dezelfde database werkt, is geen expliciete aparte API nodig voor taakverdeling; het leest en schrijft gewoon in de database met de juiste permissions. Dit maakt het systeem relatief eenvoudig: de to-do synchronisatie bestaat uit “schrijf record – agent leest – agent schrijft update – UI leest”. Mocht direct real-time luisteren op de agent lastig zijn, kan een eenvoudige polling (bv. elke paar seconden kijken naar onbewerkte recepten) volstaan, aangezien er doorgaans niet honderden tegelijk verwerkt hoeven te worden.

Deploy & Ops: De front-end hosten we op Vercel (aangeraden voor Next.js voor snelle CI/CD). Vercel handleert automatisch de build en deploy. Eventuele serverless functies (bijv. Next.js API routes of Edge Functions) draaien ook in de cloud. De lokale agent wordt door de eindgebruiker zelf uitgevoerd; dit kan als een Node-script of Python-script beschikbaar worden gesteld in de repository. Documentatie is nodig om de gebruiker op weg te helpen hiermee (vereiste installatie van Python packages, starten van LM Studio server, etc.). Monitoring is minimaal – eventuele logs van de lokale agent kunnen in de console, en Supabase Studio kan gebruikt worden om de database te inspecteren. Omdat het project AI-geassisteerd gebouwd wordt, zullen tests en debug mogelijk ook deels door AI geschreven worden (Trae-taken kunnen testgeneratie omvatten).


Samengevat gebruiken we moderne webtechnologie (React/Next + Tailwind) voor de UI, een BaaS (Supabase) voor alle cloud behoeften, en krachtige open-source AI tools (Whisper, lokale LLM via LM Studio) om de kerntaak – recepten automatisch “stashen” van Instagram – te realiseren. Deze componenten communiceren via duidelijke interfaces (REST/SDK, JSON, bestanden) wat het project onderhoudbaar en uitbreidbaar maakt.

To-do lijst (Trae-ready taken per domein)

> Legenda: De volgende taken zijn gegroepeerd per onderdeel (UI, Backend, Parsing etc.). Elke taak is zo geformuleerd dat een AI-assistent (Trae) hiermee direct aan de slag kan om code te genereren. Optionele uitbreidingen zijn gemarkeerd als (optioneel).



UI (Front-end & Design)

[ ] Projectinitialisatie & styling – Initieer een Next.js project en configureer Tailwind CSS. Implementeer shadcn/ui voor UI componenten (bv. via npx shadcn-ui init). Zorg voor een basislayout en globale styling (include dark mode classes).

[ ] Navigatie & structuur – Bouw een responsieve navigatiebalk met links naar hoofdpagina’s: “Recepten Overzicht”, “Recept Toevoegen” en eventueel “Boodschappenlijst”. Voeg een dark-mode toggle toe (hint: gebruik data-theme of next-themes library voor eenvoudige toggling).

[ ] Pagina: Recept toevoegen – Implementeer een formulier waar de gebruiker een Instagram post URL kan invoeren. Bij submissie: valideer het URL-formaat. Toon direct een preview van de post (hint: gebruik Instagram oEmbed API om embed HTML op te halen en voeg instgrm.Embeds.process() toe om het te laden). Voorzie een indicator/spinner die aangeeft dat het recept verwerkt wordt na toevoegen.

[ ] (Optioneel) Upload veld – Voeg op de “Recept toevoegen” pagina een optionele file upload toe voor video/audio. Alleen tonen indien relevant (bv. checkbox “Eigen video toevoegen voor transcriptie”). Bij upload: gebruik een <input type="file"> en bewaar het bestand via Supabase Storage (hint: Supabase JS SDK storage.from(bucket).upload(filename, file)).

[ ] Recepten Overzicht pagina – Maak een pagina die alle recepten van de ingelogde gebruiker uit de database ophaalt en in een lijst of grid toont. Toon per recept de titel, eventueel een thumbnail (Instagram afbeelding), korte info (porties, bereidingstijd indien beschikbaar, rating-sterretjes). Implementeer sorteerfunctionaliteit (bv. dropdown of knoppen voor “Sorteer op datum / rating / favoriet”). Implementeer filters of een zoekveld om op receptnaam of tag te filteren.

[ ] Recept Detail pagina – Bouw de detailweergave voor een recept. Haal alle velden van het recept op (titel, afbeelding/embed, ingrediënten, stappen, tags, voedingsinformatie, etc.). Structureer de UI met duidelijke kopjes (“Ingrediënten”, “Bereiding”). Gebruik checkboxen voor ingrediëntenlijst zodat de gebruiker kan afvinken. Voor de bereidingsstappen, toon genummerde stappen (ordered list of cards). Zorg dat lange lijsten scrollbaar zijn binnen de pagina. Plaats een favoriet-knop (hart-icoon) die aan/uit te togglen is, en een invoer voor rating (bijv. sterrencomponent of een 1-10 slider). Als bewerken is toegestaan: maak velden klikbaar of voeg een “Bewerk” knop toe die velden bewerkbaar maakt.

[ ] Favoriet & rating toggles – Implementeer de interactie voor het favoriet maken (bij klikken op hartje update de UI meteen optimistisch en stuur update naar backend) en rating geven (bij wijzigen direct opslaan). Visuele feedback: bijvoorbeeld vulkleur voor favoriet icoon, en wellicht een toast melding “Opgeslagen!” bij succesvolle opslaan.

[ ] Boodschappenlijst UI – Ontwikkel een modal of aparte pagina voor de boodschappenlijst. Hier kan de gebruiker recepten selecteren uit zijn collectie (bijv. met checkboxen naast de recepten in de lijst, of een multi-select drop-down). Wanneer recepten gekozen zijn, genereer een gecombineerde lijst van ingrediënten: groepeer dezelfde ingrediënten en tel hoeveel er totaal nodig zijn (zelfde eenheid). Sorteer de lijst op categorie (optioneel: bijv. alle groenten bij elkaar). Toon elk ingrediënt met een checkbox voor afvinken. Voorzie knoppen om de lijst te exporteren (PDF/TXT) en om alles afgevinkt te markeren.

[ ] Export functionaliteit – Voeg een functie toe om zowel een enkel recept als de boodschappenlijst te exporteren. Voor PDF: gebruik een bibliotheek (bijv. jspdf of html2canvas) om de huidige weergave om te zetten naar PDF. Voor TXT: genereer een tekstweergave (bijv. ingrediënten + stappen als plain text) en trigger een download (maak een Blob van de tekst en gebruik <a download>). Plaats exportknoppen op de recept detail pagina (exporteer recept) en op de boodschappenlijst modal/pagina.

[ ] Responsive design check – Ga na dat alle bovenstaande UI-componenten goed werken op verschillende schermgroottes (mobiel, tablet, desktop). Voeg Tailwind utility classes waar nodig (sm:, md: breakpoints) om layout te verbeteren. Test ook de dark mode weergave voor contrast en pas kleuren aan via Tailwind config indien nodig.


Backend & API

[ ] Database schema opzetten – Definieer het database schema in Supabase. Maak tabellen: recipes, eventueel ingredients en steps (of sla ingrediënten en stappen als JSON in recipes op voor eenvoud). Zorg voor relaties als aparte kolommen (bijv. user_id in recipes met foreign key naar de auth.users tabel). Velden voor recipes kunnen omvatten: title (text), source_url (text, Instagram link), image_url (text, van embed), caption_text (text), ingredients_json (jsonb), steps_json (jsonb), tags (text[]), servings (int), calories (int), macros (jsonb met protein/fat/carb), rating (int), favorite (boolean), status (text: e.g. 'pending'/'done'/'error'), created_at (timestamp). Implementeer migraties of SQL scripts voor dit schema zodat Trae dit kan uitvoeren.

[ ] Supabase Row Level Security – Schakel RLS in op de recipes tabel zodat gebruikers alleen hun eigen recepten kunnen zien/bewerken. Schrijf een policy bijvoorbeeld: allow select/update/delete on recipes where user_id = auth.uid(). Test de policies via Supabase dashboard or with a dummy user.

[ ] Supabase Storage bucket – Maak een nieuwe Storage bucket (bv. named media) in Supabase voor het opslaan van geüploade bestanden (videos). Stel de rechten zo in dat alleen ingelogde gebruikers bij hun eigen bestanden kunnen (Supabase kan een policy instellen op object niveau of we gebruiken openbaar maar moeilijk te raden URLs). Noteer de bucketnaam en zorg dat frontend en de lokale agent deze consistent gebruiken.

[ ] Instagram oEmbed API integratie – Implementeer een server-side functie om Instagram oEmbed op te vragen. Omdat hiervoor een access token van Facebook dev nodig is als de oEmbed API niet publiek toegankelijk is, schrijf een kleine serverless function (bijv. Next.js API route /api/oembed) die een inkomende IG post URL neemt (via query param) en een fetch doet naar Instagram Graph oEmbed endpoint (bv. https://graph.facebook.com/v17.0/instagram_oembed?url={postUrl}&access_token={appId}|{clientToken}). Parse het JSON resultaat om relevante data te verkrijgen: HTML fragment voor embed (of direct de thumbnail URL en caption). Return deze data aan de frontend. Hint: gebruik fetch in Node context; sla gevoelige tokens als environment variable op Vercel. Als alternatief (indien oEmbed zonder token werkt voor public posts) kan dit direct client-side, in welk geval deze stap eenvoudiger is en geen backend code nodig heeft.

[ ] API: Recept aanmaken – Hoewel de frontend direct Supabase kan aanspreken, overweeg een beschermde API route voor complexere logica bij het aanmaken van een recept. Bijvoorbeeld een POST /api/addRecipe die een Instagram URL of file info ontvangt, en server-side:

1. Valideert de input,


2. Roept de Instagram embed API (of Graph API) aan voor caption/media info,


3. Maakt het recipe record in de database via Supabase admin API (met status pending). Zo kan wat logica van de client naar de server verhuizen. Zorg dat deze route alleen toegankelijk is voor geauthenticeerde gebruikers (controleer aanwezige Supabase JWT of sessie cookie).



[ ] Realtime Config – Configureer Supabase Realtime voor de benodigde tabellen. In Supabase instellingen, zet broadcast of DB change feed aan voor recipes (en eventuele subtabellen). Schrijf eventueel een small script of use Supabase CLI to enable the replication. Dit is nodig zodat de front-end en lokale agent via websockets updates kunnen ontvangen.

[ ] Edge Function: notificatie (optioneel) – (Optioneel) Schrijf een Supabase Edge Function die getriggerd wordt bij insert in recipes. Deze function kan bijv. een notificatie sturen of direct bepaalde velden invullen. In dit project is het niet strikt nodig omdat de lokale agent alle verwerking doet, maar dit kan gebruikt worden om b.v. een welkomstbericht te loggen of een fallback te voorzien als de agent niet draait (denk aan e-mail of message naar de gebruiker dat hun recept wacht op verwerking).

[ ] Bewaking en logging – Implementeer elementaire logging. Bijvoorbeeld: log in een aparte Supabase tabel logs of in een logging service wanneer de AI-verwerking start en eindigt, of bij fouten. Hoewel de eigenlijke logs vooral in de lokale console zullen zijn, is het handig om in de database bij te houden als een receptverwerking mislukt (met reden) zodat de frontend iets kan weergeven. Trae kan code genereren voor het schrijven van logrecords in Supabase via een simple insert.


Auth (Gebruikersauthenticatie)

[ ] Supabase Auth implementeren – Gebruik de Supabase JS SDK op de frontend om gebruikersregistratie en login te realiseren. Maak een eenvoudige registratiepagina (vraag om email en wachtwoord, eventueel wachtwoordbevestiging). Bij submit: roep supabase.auth.signUp({ email, password }) aan. Implementeer ook het inloggen via signIn. Gebruik de standaard email-verificatie van Supabase (tenzij magie link of OAuth gewenst, maar hou het eerst bij email/password).

[ ] Auth UI flows – Zorg voor state management rondom auth: na succesvol inloggen, navigeer gebruiker naar de receptenpagina. Toon in de navigatie de naam of email van de user en een logout-knop. Voeg een wachtwoord-vergeten optie als extra (Supabase kan magic links mailen).

[ ] Bescherming van routes – Implementeer route guarding in Next.js: zorg dat pagina’s zoals receptenlijst en details alleen toegankelijk zijn als supabase.auth.session() bestaat. Dit kan via middleware in Next 13, of simpelweg in de React component checken en redirecten naar login als geen user. Tevens, pas de Supabase RLS aan: met auth.uid() zoals eerder ingesteld, zijn data-opvragingen veilig afgeschermd. Test dit door te proberen data van een andere user te lezen (moet falen).

[ ] User context – Maak eventueel een React context or hook (bijv. useAuth()) om de huidige gebruiker en auth status gemakkelijk beschikbaar te maken door de app heen. Trae kan een component genereren die supabase.auth.onAuthStateChange afhandelt en de gebruiker info opslaat in context.

[ ] Logout functionaliteit – Koppel de logout knop aan supabase.auth.signOut() en zorg dat bij uitloggen alle client-side staat gereset wordt (bv. leegmaken receptenlijst, terug naar login pagina).

[ ] Optionele Auth extras – (Optioneel) Overweeg social logins (Supabase ondersteunt OAuth voor Google etc.) als uitbreiding. Dit vergt het activeren van de provider in Supabase en een knop toevoegen in de UI. Alleen als tijd het toelaat, aangezien de core vraag email/pw is.


Sync (Cloud <-> Local synchronisatie)

[ ] Supabase realtime subscriptie (front-end) – Implementeer in de React app een realtime listener op de recipes tabel. Gebruik supabase.channel('schema-db-changes')...on('postgres_changes', {event:'UPDATE', ...}, handler) of de older supabase.from('recipes').on('UPDATE', handler).subscribe(). In de handler: check als new.status == 'done' of vergelijk het recept ID met iets dat de gebruiker wellicht open heeft staan, om de UI te updaten. Hierdoor krijgt de gebruiker direct de nieuwe data te zien wanneer de lokale agent klaar is.

[ ] Lokale agent basis – Schrijf een script/app (mogelijk TypeScript via Node, of Python, kies wat beter in Trae past) dat verbinding maakt met Supabase. Bijvoorbeeld met Node: gebruik de Supabase JS client (met service_role key of user key) en luister op database veranderingen. Alternatief: voer een polling uit elke X seconden naar nieuwe recipes met status 'pending'. Kies eenvoudige benadering om mee te beginnen (polling is oke voor MVP). Zorg dat dit script configurabel is (bv. .env file voor Supabase URL en Key, pad naar LM Studio etc.).

[ ] Taakdetectie – Implementeer in de agent de logica om een nieuw te verwerken recept te detecteren. Bij gebruik van realtime: registreer een callback voor INSERT event op recipes en filter op new.status == 'pending'. Bij polling: query de recipes tabel voor alle records waar status = 'pending' die nog niet verwerkt zijn. Markeer direct een record als “in_progress” (update status) zodra je begint, om te voorkomen dat herhaalde triggers dezelfde taak dubbel oppakken (dit vereist een kleine update query).

[ ] Gegevens ophalen (IG content) – Binnen de agent, na detectie van een nieuwe taak, haal de benodigde data op. Dit kan inhouden:

IG caption tekst ophalen: Als de caption niet via frontend al beschikbaar is, gebruik een fetch. Optie 1: Via de opgeslagen IG URL de HTML opvragen (met iets van axios.get() op de IG pagina) en de <meta> tags of JSON LD eruit halen. Optie 2: Roep de Instagram Basic Display API aan (vereist short-lived user token, ingewikkeld). Optie 3: Vereenvoudigd – verwacht dat de embed HTML al in de record staat (via oEmbed) en parse daaruit de caption. Beslis wat haalbaar is en implementeer dat. Trae-hint: als scraping HTML, gebruik een DOM parser library om de caption te vinden.

Video/audio ophalen: Als recipe.source_url een video is of als er een upload is, download het bestand. Bij Supabase Storage: gebruik Supabase storage API of constructeer de public URL (afhankelijk van bucket public status) om het bestand te downloaden op de lokale schijf (bijv. fetch het, of Supabase client download functie). Sla het tijdelijk op bijvoorbeeld /tmp/recipe123.mp4 voor verwerking.


[ ] Whisper integratie (transcriptie) – Roep vanuit de agent het Whisper model aan op eventuele media. Als de agent in Node is, en er is geen direct Whisper binding, overweeg het openen van een subprocess naar een Python script (spawn('python whisper.py file.mp4')). Of als de agent in Python: importeer the whisper library en laad bijv. model = whisper.load_model("medium") éénmalig, dan result = model.transcribe("file.mp4"). Dit geeft een result["text"]. Implementeer eventuele splits: als video erg lang is, Whisper kan dit handelen maar kost tijd – wellicht voor reels (<1 min) is medium model voldoende snel (~ real-time). Let op foutafhandeling: als Whisper faalt of output leeg is, noteer error.

[ ] Prompt opstellen voor LLM – Formuleer de prompt voor het taalmodel zodat het de tekstuele inhoud goed omzet in JSON. Bijvoorbeeld, definieer een vast prompt template:

You are a recipe parser. Extract the recipe information from the following text and output a JSON with the structure:
{ "title": ..., "ingredients": [ { "name": ..., "quantity": ..., "unit": ... }, ... ], "steps": [...], "tags": [...], "servings": ..., "nutrition": { "calories": ..., "protein": ..., ... } }.
Only output valid JSON, no explanations.
Text: """{recept_tekst}"""

Zorg dat dit prompt meegestuurd wordt in de API-aanroep naar LM Studio. Overweeg dat het model NL tekst krijgt; als het model primair Engelstalig getraind is, kan het nog steeds de structuur extraheren maar misschien labelt het keys in Engels – we houden keys in het Engels voor data consistentie, dat is prima.

[ ] LM Studio API call – Implementeer de daadwerkelijke API-aanroep naar LM Studio. Gebruik bij voorkeur de OpenAI SDK met aangepast endpoint. In Node, bijvoorbeeld installeer openai package en stel openai.basePath = "http://localhost:1234/v1" (volgens LM Studio docs). Roep dan openai.createChatCompletion of createCompletion aan met ons prompt. In Python, vergelijkbaar met openai-python lib. Alternatief: doe een directe HTTP POST met fetch/axios naar http://localhost:1234/v1/chat/completions met payload {"model": "<modelNaam>", "messages": [ ... ]}. Gebruik het juiste model-id dat in LM Studio geladen is (via /v1/models op te vragen). Koppel een relatief korte timeout zodat we niet oneindig wachten.

[ ] Resultaat verwerken (JSON) – Ontvang de response van het model. Parset het JSON (indien het als string komt) naar een object/structuur. Verifieer of verplichte velden aanwezig zijn. Indien het model extra text eromheen gaf (zou niet moeten als prompt goed is, maar controlleer op e.g. ```js code fences of zo), strip dat weg en probeer opnieuw te parseren. In geval van parse-fouten, eventueel een tweede poging: het model instrueren met strengere prompt of een repair strategy (optioneel).

[ ] Database updaten – Gebruik Supabase’s client vanuit de agent om de recipes record bij te werken met de verkregen data. Bijv:

supabase.from('recipes').update({
   ingredients_json: parsed.ingredients,
   steps_json: parsed.steps,
   title: parsed.title || current_title,
   tags: parsed.tags,
   servings: parsed.servings,
   nutrition: parsed.nutrition,
   status: 'done'
}).eq('id', recipeId);

Als we aparte ingredients tabel gebruiken, voer bulk insert daar voor de ingredienten en idem voor steps. Zorg dat deze acties gebeuren binnen enkele seconden na elkaar. Hierna is de front-end eigenlijk klaar om te updaten via realtime.

[ ] Error handling & status – Voeg in de agent afhandeling toe voor foutscenario’s. Bijvoorbeeld: als de Instagram fetch mislukt of de caption leeg is, markeer recept status als 'error' en noteer eventueel een error_message veld. Als Whisper geen tekst oplevert, idem. Als LLM output niet parsebaar is, eventueel zet status 'error' met message “Kon recept niet parseren”. De front-end kan deze status zien en de gebruiker een melding tonen (“AI kon dit recept niet verwerken”). Documenteer voor de gebruiker dat ze eventueel zelf kunnen invullen of opnieuw proberen. Eventueel kun je in errorgeval de caption tekst toch opslaan zodat er iets is.

[ ] Test end-to-end – Simuleer het volledige proces met een echte Instagram link (van een publiek recept). Voer de agent uit lokaal, voeg via de UI de link toe, en observeer dat uiteindelijk het recept verschijnt. Los eventuele bugs op. Test zowel met alleen tekst (post met geschreven recept) als met video (post waar recept in gesproken vorm is). Optimaliseer waar nodig (bijv. ander model kiezen als JSON output slecht is, of prompt fine-tunen).


Whisper (Audio transcriptie)

[ ] Whisper installatie – Installeer OpenAI Whisper in de omgeving. In Python: pip install git+https://github.com/openai/whisper.git of gebruik openai/whisper package. In Node: eventueel gebruik maken van whisper.cpp bindings of via Python call omdat Whisper officieel geen Node lib heeft. Documenteer dat de gebruiker ffmpeg moet hebben als Whisper dat vereist voor audio decoding.

[ ] Transcribe functie – Schrijf een functie transcribeAudio(path) -> text die een audiobestand op pad path neemt en Whisper aanroept om tekst terug te geven. Als performance belangrijk is, kies een modelsize: base is snel maar minder accuraat, small/medium is trager maar nauwkeuriger. Voor recepten (waar vaktermen/ingrediënten voorkomen) is nauwkeurigheid belangrijk, dus kies medium model. Optimize: laad model één keer persisteer in memory als mogelijk (dus niet bij elke transcript laden).

[ ] Language/translation handling – Stel Whisper zodanig in dat het niet alles naar Engels vertaalt. Standaard geeft Whisper transcript in originele taal. We willen dat behouden (Nederlandse recepten blijven NL). Als sommige IG videos Engelstalig zijn is dat ook oké – onze parser kan Engelstalige input ook verwerken mits model ook die taal aan kan. (Eventueel in prompt vermelden “the recipe text may be Dutch or English”). Test Whisper op een korte Nederlandse spraak clip om zeker te zijn dat output NL blijft.

[ ] Segmentatie – Voor audio langer dan 30s, Whisper intern hanteert segmenten van 30s. Als een video langer is (bv. 2 min), Whisper verwerkt het in overlappende chunks. Zorg dat de functie de final concatenated text teruggeeft. Whisper library doet dit automatisch (voegt samen met wat tijdcodes). Gebruik result["text"] direct, dat is de volledige transcriptie.

[ ] Error afhandeling – Voeg try/except of equivalent toe rond de Whisper-aanroep. Als er een exception of als het resultaat onbruikbaar is (leeg of vrijwel leeg), geef dit terug aan de caller (agent) zodat die status kan zetten. Mogelijk scenario: audio is van slechte kwaliteit -> Whisper mist stukjes; we kunnen nog steeds teruggeven wat we hebben.

[ ] Test Whisper – Neem een voorbeeld video (MP4) of audiobestand (MP3/M4A) van een recept (bv. iemand die een recept voorleest) en voer de transcribeAudio functie uit. Controleer dat de output overeenkomt met de gesproken tekst. Meet ongeveer de verwerkingstijd zodat je een idee hebt (Medium model ~ 30 sec per 1 min audio on CPU). Als het erg traag is, overweeg gebruik van tiny model als placeholder tijdens ontwikkeling, of gebruik GPU als beschikbaar.


LM Studio (LLM parsing lokaal)

[ ] LM Studio setup – Installeer LM Studio op de gebruikersmachine en download een geschikt model. Aanbevolen om in documentatie te instrueren: bijvoorbeeld “Download het model DeepSeek 8B via LM Studio Hub”. Dit model moet geladen zijn in LM Studio’s UI. Schakel Developer Mode in en start de OpenAI-compatible server (in LM Studio UI is er een toggle voor API, of via CLI lmstudio server). Noteer de poort (standaard 1234).

[ ] Verbinding testen – Verifieer dat de agent verbinding kan maken met LM Studio API. Bijvoorbeeld, doe een test GET request naar http://localhost:1234/v1/models om te zien of het model geladen is. Dit kan geautomatiseerd in code: probeer tot het een geldig response geeft. Log de beschikbare model naam.

[ ] Prompt templates & presets – Overweeg het aanmaken van een preset in LM Studio voor deze specifieke taak (LM Studio laat toe om prompt templates op te slaan). Echter, om het generiek te houden, stuur gewoon de volledige prompt mee vanaf de agent. Zorg dat de prompt duidelijk en zo beknopt mogelijk is, en dat het voorbeeld JSON format in de prompt precies aansluit op wat we in de app verwachten.

[ ] API call implementatie – Zoals eerder beschreven bij “LM Studio API call”: schrijf de code om een HTTP request te doen. Gebruik het chat-completion endpoint als model is chat-geörienteerd (b.v. als het een instruct model is kan completion endpoint ook). Stuur parameters mee zoals temperature: 0 voor deterministische output, en eventueel max_tokens voldoende hoog zodat lange recepten passen. (Recepten zijn relatief kort, een paar honderd woorden caption, JSON output ook klein, dus < 1000 tokens context).

[ ] Iteratieve verbetering – Als het JSON dat terugkomt niet direct parsebaar of heeft kleine issues (bijv. nummer als string), bedenk een strategie: we kunnen ofwel die kleine issues opvangen in code (parse strings to int), of het prompt aanpassen: bv. “make sure to output numbers as numbers, not strings”. Trae kan helpen om op basis van wat resultaten binnenkomen, de prompt string verder te tunen. Maak desnoods een log van de oorspronkelijke text en model output om te debuggen en verbeteren.

[ ] Meertalig support – Check of het gekozen model om kan gaan met Nederlands. DeepSeek of andere modellen mogelijk wel, maar als de nauwkeurigheid tekortschiet, eventueel overschakelen naar een grotere model of Engels output. (In worst case zouden we de Whisper-transcript naar Engels laten vertalen door hetzelfde LLM en dan parsen, maar dit is omslachtig; beter een model nemen dat NL begrijpt). Instructeer Trae om als test een NL recepttekst aan het model te geven en te kijken of het zinnige JSON komt.

[ ] Performance – Lokale LLM’s kunnen traag zijn afhankelijk van modelgrootte en hardware. Een 7-13B model op CPU doet misschien ~10 tokens/sec. JSON output kan ~200-300 tokens zijn, dus < 30 sec. Dit is acceptabel. Als niet, documenteer dat een kleinere model gebruikt kan worden voor snelheid, met mogelijk trade-off in kwaliteit.

[ ] Fallback scenario (optioneel) – (Optioneel) Implementeer een fallback als de lokale LLM echt faalt of niet draait: bijvoorbeeld een knop in de UI “Gebruik cloud AI” die een OpenAI API (zoals GPT-4) aanroept voor parsing. Dit buiten scope van Trae wellicht tenzij de gebruiker een OpenAI key wil gebruiken. We houden het lokaal, maar leggen de basis dat deze uitbreiding mogelijk is door de architectuur (UI > Supabase > agent kan ook cloud calls doen indien geconfigureerd).