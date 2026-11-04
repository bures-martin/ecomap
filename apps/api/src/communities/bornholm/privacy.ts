/**
 * The Bornholm map's privacy policy, in Danish. Like the About text it is
 * community content: the seed writes it only while the privacy text is still
 * empty, and an admin edits it under Indstillinger from then on.
 *
 * What it says about storage, logs and backups matches the app and the
 * production setup in deploy/ - keep them in step. The [UDFYLD: ...] parts
 * are what only the community knows; admins see a warning until they are gone.
 */
export const BORNHOLM_PRIVACY = `**Dataansvarlig:** [UDFYLD: navn på foreningen eller personen bag kortet, adresse og e-mail]

Her står, hvilke oplysninger kortet over det grønne Bornholm gemmer om dig, hvorfor, og hvad du selv kan gøre.

## Når du bare kigger på kortet

- Vi bruger ingen cookies til statistik eller reklame, og vi sporer dig ikke.
- Din browser husker nogle få valg på din egen enhed: lyst eller mørkt udseende, sprog, baggrundskort, og om du har set velkomsten. De bliver ikke sendt til os.
- Kortbaggrunden hentes fra Esri, OpenStreetMap, OpenTopoMap eller CyclOSM, alt efter hvilket kort du vælger. De ser din IP-adresse, når kortet hentes.
- Trykker du på "Navigér", åbnes Google Maps, og så gælder Googles privatlivspolitik.
- Trykker du på "Vis min placering", bruges din position kun i din egen browser til at vise dig på kortet. Den bliver ikke sendt til os.
- Serveren skriver en teknisk log med blandt andet IP-adresse, så vi kan opdage fejl og misbrug. Loggen bliver løbende overskrevet, når den fylder mere end 100 MB - på et kort af denne størrelse typisk efter nogle uger.

## Når du har en konto

- Vi gemmer din e-mail, dit viste navn, din adgangskode (kun som en krypteret hash, som ingen kan læse), din rolle, og om du har slået totrinsbekræftelse til.
- Dit profilbillede, hvis du selv lægger et op.
- En login-cookie, så du forbliver logget ind. Den er nødvendig for at kunne logge ind, bruges ikke til andet og udløber efter 30 dage.
- Det, du tilføjer eller foreslår på kortet - navn, beskrivelse, placering og billeder - er offentligt, sammen med dit viste navn. Din e-mail kan kun administratorerne se.

## Hvorfor

Vi bruger oplysningerne til at drive kortet: så du kan logge ind, så det kan ses, hvem der har tilføjet hvad, og så moderatorer kan godkende bidrag. Grundlaget er, at du selv har oprettet kontoen og bedt om tjenesten (databeskyttelsesforordningen art. 6, stk. 1, litra b), og vores legitime interesse i at holde kortet fri for misbrug (litra f).

## Hvor og hvor længe

Oplysningerne ligger på en server i EU hos [UDFYLD: hostingudbyder og land]. Vi tager en sikkerhedskopi af databasen hver nat og gemmer den i 14 dage. Oplysningerne bliver hverken solgt eller delt med andre, og kun kortets administratorer kan se dem.

Din konto og dine oplysninger gemmes, så længe du har kontoen. Sletter vi den, forsvinder den også fra sikkerhedskopierne inden for 14 dage.

## Dine rettigheder

Du kan få indsigt i dine oplysninger, få dem rettet og få dem slettet. Navn, adgangskode og profilbillede kan du selv ændre under Din konto. Vil du have din konto slettet, så skriv til [UDFYLD: e-mail]. Det, du har tilføjet til kortet, kan du selv slette, eller vi kan fjerne det sammen med kontoen.

Du kan klage til Datatilsynet: https://www.datatilsynet.dk

Opdateret: [UDFYLD: dato]
`;
