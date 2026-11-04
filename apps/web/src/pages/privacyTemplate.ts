/**
 * The privacy notice a community starts from, in Danish, the language of the
 * first community. It describes what this app actually stores and sends - keep
 * it in step with the code - and marks with [UDFYLD: ...] the parts only the
 * community can know: who is responsible, where it is hosted, how to reach them.
 *
 * Admins copy it into the settings and fill it in; until then the privacy page
 * shows it as it is.
 */
export const FILL_IN_MARKER = '[UDFYLD';

export function privacyTemplate(communityName: string): string {
  return `**Dataansvarlig:** [UDFYLD: navn på foreningen eller personen bag kortet, adresse og e-mail]

Her står, hvilke oplysninger ${communityName} gemmer om dig, hvorfor, og hvad du selv kan gøre.

## Når du bare kigger på kortet

- Vi bruger ingen cookies til statistik eller reklame, og vi sporer dig ikke.
- Din browser husker nogle få valg på din egen enhed: lyst eller mørkt udseende, sprog, baggrundskort, og om du har set velkomsten. De bliver ikke sendt til os.
- Kortbaggrunden hentes fra Esri, OpenStreetMap, OpenTopoMap eller CyclOSM, alt efter hvilket kort du vælger. De ser din IP-adresse, når kortet hentes.
- Trykker du på "Navigér", åbnes Google Maps, og så gælder Googles privatlivspolitik.
- Trykker du på "Vis min placering", bruges din position kun i din egen browser til at vise dig på kortet. Den bliver ikke sendt til os.
- Serveren skriver en teknisk log med blandt andet IP-adresse, så vi kan opdage fejl og misbrug. Loggen gemmes i [UDFYLD: fx 30 dage].

## Når du har en konto

- Vi gemmer din e-mail, dit viste navn, din adgangskode (kun som en krypteret hash, som ingen kan læse), din rolle, og om du har slået totrinsbekræftelse til.
- Dit profilbillede, hvis du selv lægger et op.
- Vi sender kun e-mails, du selv beder om: bekræftelse af din e-mail og nulstilling af din adgangskode. De sendes via [UDFYLD: e-mail-udbyder, fx Brevo i Frankrig].
- En login-cookie, så du forbliver logget ind. Den er nødvendig for at kunne logge ind, bruges ikke til andet og udløber efter 30 dage.
- Det, du tilføjer eller foreslår på kortet - navn, beskrivelse, placering og billeder - er offentligt, sammen med dit viste navn. Din e-mail kan kun administratorerne se.

## Hvorfor

Vi bruger oplysningerne til at drive kortet: så du kan logge ind, så det kan ses, hvem der har tilføjet hvad, og så moderatorer kan godkende bidrag. Grundlaget er, at du selv har oprettet kontoen og bedt om tjenesten (databeskyttelsesforordningen art. 6, stk. 1, litra b), og vores legitime interesse i at holde kortet fri for misbrug (litra f).

## Hvem kan se dem

Kun kortets administratorer. Oplysningerne ligger hos [UDFYLD: hostingudbyder og land, fx i EU] og bliver hverken solgt eller delt med andre. Vi tager en sikkerhedskopi hver nat og gemmer den i [UDFYLD: fx 14 dage]; sletter vi din konto, forsvinder den også fra sikkerhedskopierne inden for den tid.

## Dine rettigheder

Du kan få indsigt i dine oplysninger, få dem rettet og få dem slettet. Navn, adgangskode og profilbillede kan du selv ændre under Din konto. Du kan selv slette din konto under Din konto → Slet din konto, og vælge, om de steder, du har tilføjet, skal slettes med eller blive på kortet uden dit navn. Har du spørgsmål om dine oplysninger, så skriv til [UDFYLD: e-mail].

Du kan klage til Datatilsynet: https://www.datatilsynet.dk

Opdateret: [UDFYLD: dato]
`;
}
