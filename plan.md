🎯 Formål

Cut’n’Go er en mobilapplikation til både iOS og Android, som gør det nemt for kunder at booke tider hos frisører, samt for personale og salon-ejere at administrere deres hverdag.

Appen skal digitalisere hele bookingprocessen og skabe et bedre overblik for både kunder og frisører. Den skal samtidig gøre det muligt at håndtere flere saloner, forskellige medarbejdere og forskellige behandlinger.

Systemet bygger videre på det oprindelige Cut’n’Go-koncept, men er nu udvidet til en moderne app-løsning med fokus på brugervenlighed, automatisering og realtidsdata.

👤 Målgrupper

Appen har tre primære brugergrupper:

1. Kunde

Personer der ønsker at booke en frisørtid.

2. Frisør / Personale

Medarbejdere der arbejder i salonen og håndterer kunder.

3. Admin / Salon Manager

Ejer eller leder der administrerer saloner, medarbejdere og data.

📱 Hvad appen går ud på

Appen skal gøre det muligt at:

finde en salon (automatisk via lokation)
vælge behandling
vælge frisør (eller lade systemet vælge)
se ledige tider i realtid
booke og aflyse tider
give personale overblik over deres arbejdsdag
give admin indsigt i drift og performance

Kort sagt:
👉 En komplet booking- og administrationsplatform for frisørsaloner

🧩 Funktionelle krav
🧑‍🦱 Kunde (booking flow)

Når en kunde bruger appen, skal de kunne:

Se nærmeste salon automatisk via GPS
Se alle saloner og deres ledige tider
Vælge en salon
Vælge en behandling (fx herreklip, fade, farvning)
Vælge:
en specifik frisør
eller “første ledige”
Se tilgængelige tider
Booke en tid
Få en bekræftelse
Aflyse en tid (op til 2 timer før)

Derudover:

Se “mine tider”
Blive guidet til salonen via kort (Google Maps / Apple Maps)
Slip for gentagen login (session gemmes)
💇‍♂️ Frisør / Personale

Personale skal kunne:

Logge ind på app (fx via iPad i salon)
Se:
næste kunde
dagens bookings
hvilken behandling kunden har valgt
Få et hurtigt overblik over deres arbejdsdag

Derudover:

Markere sig syg (skal godkendes af manager)
Se egne tider (“mine tider”)
(valgfrit) tage billede af resultatet af en behandling
🧑‍💼 Admin / Manager

Admin skal kunne:

Oprette og administrere medarbejdere
Sætte arbejdstider for medarbejdere
Definere åbningstider for saloner
Oprette og redigere behandlinger (services)
Tilføje nye saloner
Tilføje produkter (kun som data, ikke salg)
Se analytics:
antal bookinger
omsætning
mest populære behandlinger
udnyttelse af medarbejdere
⚙️ Systemets kernefunktioner
📅 Booking-system
Viser kun reelt ledige tider
Tager højde for:
medarbejderens arbejdstider
behandlingens varighed
buffer mellem kunder (fx 5 min)
eksisterende bookings
sygdom / fravær

👉 Ingen dobbeltbookinger må være muligt

🧠 Smart funktionalitet
Automatisk valg af nærmeste salon
Mulighed for “valgfri frisør”
Realtids-opdatering af ledige tider
Auto-aflysning ved sygdom (med forslag til ny frisør)
🤒 Sygdom og ombooking

Når en frisør melder sig syg:

Manager godkender sygdom
Systemet finder berørte bookinger
Kunder får tilbud om:
samme tid hos en anden frisør
eller nærmeste alternative tider
Hvis ingen alternativ findes → booking aflyses
📸 Billeder af behandlinger
Frisøren kan tage billede efter behandling
Bruges til reference næste gang kunden kommer
🔐 Login og brugeroplevelse
Kunden skal ikke logge ind hver gang
Login gemmes (session)
Brugernavn autofyldes
Mulighed for kun at logge ind én gang
🧱 Teknisk løsning (kort beskrivelse)

Systemet består af:

Frontend (App)
Kører på iOS og Android
UI til kunder, personale og admin
Backend (Convex)
Håndterer:
bookings
tider
medarbejdere
regler (fx overlap, aflysning)
Indeholder al forretningslogik
Auth (Better Auth)
Login og sessions
📊 Data der håndteres

Systemet arbejder med:

saloner
medarbejdere
arbejdstider
services (behandlinger)
bookings
kunder (lightweight)
sygdom/fravær
analytics
🚀 Hvad der skal udvikles
Minimum (MVP)
Booking flow (kunde)
Se tider
Opret booking
Aflys booking
Medarbejder-overblik
Admin: oprette medarbejdere og services
Realtids availability
Ekstra features
Sygdom + ombooking
Analytics dashboard
Billeder af behandlinger
Multi-salon overblik
🎓 Aflevering

Projektet afleveres som:

Et dokument (denne beskrivelse)
Link til GitHub repository
Live demonstration af appen
💡 Kort opsummering

Cut’n’Go appen er en moderne bookingplatform for frisørsaloner, hvor:

kunder nemt kan booke tider
frisører kan styre deres dag
admin kan få fuldt overblik

👉 Systemet skal være hurtigt, simpelt og uden fejl i bookinglogik.
