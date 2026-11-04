/**
 * Danish for the messages the server (and the shared validation rules) write
 * in English. The server explains what went wrong more precisely than an error
 * code can ("That code did not match - check your authenticator app"), so the
 * app shows those messages - and on the Danish site they must be Danish.
 *
 * Unknown messages are not shown in English: `translateServerMessage` returns
 * null and the caller falls back to a general Danish text. A test checks that
 * every message the server can send is listed here.
 */

const EXACT: Readonly<Record<string, string>> = {
  /* Sign-in and accounts */
  'Sign in to continue': 'Log ind for at fortsætte.',
  'That email and password do not match': 'E-mail og adgangskode passer ikke sammen.',
  'Enter your two-factor code': 'Skriv din kode til totrinsbekræftelse.',
  'That two-factor code is not valid': 'Koden til totrinsbekræftelse er ikke gyldig.',
  'That code did not match - check your authenticator app':
    'Koden passede ikke - tjek din godkendelsesapp.',
  'Start the two-factor setup first': 'Start opsætningen af totrinsbekræftelse først.',
  'Two-factor authentication is already on': 'Totrinsbekræftelse er allerede slået til.',
  'Turn on two-factor sign-in under Your account before using the admin pages':
    'Slå totrinsbekræftelse til under Din konto, før du bruger administrationen.',
  'Your current password is not correct': 'Din nuværende adgangskode er ikke rigtig.',
  'Your password is not correct': 'Adgangskoden er ikke rigtig.',
  'Your session has expired - please sign in again': 'Du er blevet logget ud - log ind igen.',
  'No session to refresh': 'Du er ikke logget ind.',
  'This account has been blocked. Contact the people who run this map.':
    'Kontoen er blokeret. Kontakt dem, der driver kortet.',
  'Confirm your e-mail first - click the link we sent you, or ask for a new one.':
    'Bekræft din e-mail først - klik på linket, vi sendte dig, eller bed om et nyt.',
  'That link has expired or has already been used - ask for a new one':
    'Linket er for gammelt eller allerede brugt - bed om et nyt.',
  'An account with that email already exists': 'Der findes allerede en konto med den e-mail.',
  'An account with that email already exists - sign in instead':
    'Der findes allerede en konto med den e-mail - log ind i stedet.',
  'This community is invite-only right now': 'Fællesskabet er kun for inviterede lige nu.',
  'That invitation was already used or withdrawn':
    'Invitationen er allerede brugt eller trukket tilbage.',
  'You cannot invite somebody with that role': 'Du kan ikke invitere nogen med den rolle.',
  'You can only block people with a lower role than yours':
    'Du kan kun blokere folk med en lavere rolle end din egen.',
  'You can only reset the password of people with a lower role than yours':
    'Du kan kun lave ny adgangskode til folk med en lavere rolle end din egen.',
  'You cannot remove your own superadmin role': 'Du kan ikke fjerne din egen superadmin-rolle.',
  'Another superadmin has to change their own role':
    'En anden superadmin skal selv ændre sin rolle.',
  'You are the only superadmin. Make someone else superadmin first, so the map is not left without one.':
    'Du er den eneste superadmin. Gør en anden til superadmin først, så kortet ikke står uden.',

  /* Places, photos and suggestions */
  'You can only edit contributions you added': 'Du kan kun redigere det, du selv har tilføjet.',
  'You can only delete contributions you added': 'Du kan kun slette det, du selv har tilføjet.',
  'You can only change photos of contributions you added':
    'Du kan kun ændre billeder på det, du selv har tilføjet.',
  'Sign in as a member to suggest a change': 'Log ind som medlem for at foreslå en ændring.',
  'This change needs a moderator’s approval - suggest it instead':
    'Ændringen skal godkendes af en moderator - foreslå den i stedet.',
  'That suggestion was decided already': 'Forslaget er allerede behandlet.',
  'That file is not a PNG, JPEG or WebP image': 'Filen er ikke et PNG-, JPEG- eller WebP-billede.',
  'Upload the photo as a PNG, JPEG or WebP image': 'Upload billedet som PNG, JPEG eller WebP.',
  'Upload the picture as a PNG, JPEG or WebP image': 'Upload billedet som PNG, JPEG eller WebP.',
  'That upload is too large': 'Filen er for stor.',
  'The area outline is not a valid shape': 'Områdets omrids er ikke en gyldig figur.',

  /* General */
  'You do not have permission to do that': 'Det har du ikke adgang til.',
  'Some fields need attention': 'Nogle felter skal rettes.',
  'The request body is not valid JSON': 'Forespørgslen kunne ikke læses.',
  'No such endpoint': 'Siden findes ikke.',
  'Too many attempts - please wait a moment': 'For mange forsøg - vent et øjeblik.',

  /* Validation rules (packages/shared) */
  'Include at least one letter': 'Brug mindst ét bogstav.',
  'Include at least one number or symbol': 'Brug mindst ét tal eller tegn.',
  'Enter your password': 'Skriv din adgangskode.',
  'Enter the six-digit code': 'Skriv den sekscifrede kode.',
  'Give it a short name': 'Giv det et kort navn.',
  'Use lowercase words separated by single hyphens':
    'Brug små bogstaver og ord adskilt af én bindestreg, fx lokal-mad.',
  'Use a hex colour such as #2f855a': 'Brug en farvekode som #2f855a.',
  'Use the format YYYY-MM-DD': 'Brug formatet ÅÅÅÅ-MM-DD.',
  'Use a camelCase key, e.g. openingHours': 'Brug en nøgle i camelCase, fx openingHours.',
  'A select field needs at least one option': 'Et valgfelt skal have mindst én mulighed.',
  'Change at least one thing': 'Ændr mindst én ting.',
  'Use opening hours such as "Mo-Fr 10:00-17:00; Sa 10:00-13:00"':
    'Skriv åbningstider som "Mo-Fr 10:00-17:00; Sa 10:00-13:00".',
  'A line needs at least two points': 'En rute skal have mindst to punkter.',
  'A polygon needs an outer ring': 'Et område skal have et ydre omrids.',
  'A ring needs at least four positions (the last repeats the first)':
    'Et omrids skal have mindst fire punkter (det sidste gentager det første).',
  'The first and last position must be equal': 'Første og sidste punkt skal være det samme.',
  'The first and last corner must be the same point':
    'Første og sidste hjørne skal være det samme punkt.',
  'An area needs at least three different corners':
    'Et område skal have mindst tre forskellige hjørner.',
  'The area outline crosses itself - move a corner so its edges do not cross':
    'Områdets omrids krydser sig selv - flyt et hjørne, så kanterne ikke krydser.',
  'South must not be north of north': 'Syd må ikke ligge nord for nord.',
  'Expected "west,south,east,north"': 'Forventede "vest,syd,øst,nord".',

  /* Zod's own defaults */
  'Invalid email address': 'Det er ikke en gyldig e-mailadresse.',
  'Invalid URL': 'Det er ikke en gyldig webadresse.',
};

type Pattern = readonly [RegExp, (...groups: string[]) => string];

const PATTERNS: readonly Pattern[] = [
  [/^Use at least (\d+) characters$/, (n) => `Brug mindst ${n} tegn.`],
  [/^(.+) is required$/, (field) => `${field} skal udfyldes.`],
  [/^Choose one of: (.+)$/, (options) => `Vælg en af: ${options}.`],
  [
    /^A layer with the address "(.+)" already exists$/,
    (slug) => `Der findes allerede et lag med adressen "${slug}".`,
  ],
  [
    /^Contributions have to be inside the (.+) area$/,
    (name) => `Bidrag skal ligge inden for ${name}s område.`,
  ],
  [
    /^A contribution can have up to (\d+) photos$/,
    (n) => `Et bidrag kan have op til ${n} billeder.`,
  ],
  [
    /^The "(.+)" layer accepts (.+) - not (.+)$/,
    (layer, allowed, kind) => `Laget "${layer}" tager imod ${allowed} - ikke ${kind}.`,
  ],
  [
    /^"(.+)" still holds (\d+) contribution\(s\)\. Re-send with \?confirm=true to delete them as well\.$/,
    (layer, n) => `"${layer}" har stadig ${n} bidrag. Bekræft for også at slette dem.`,
  ],
  [/^(That \w+) could not be found$/, () => 'Det blev ikke fundet - måske er det slettet.'],
  /* Zod defaults: "Too small: expected string to have >=2 characters" and friends */
  [
    /^Too small: expected string to have >=(\d+) characters?$/,
    (n) => `Skal være mindst ${n} tegn.`,
  ],
  [/^Too big: expected string to have <=(\d+) characters?$/, (n) => `Må højst være ${n} tegn.`],
  [/^Too small: expected array to have >=(\d+) items?$/, (n) => `Vælg mindst ${n}.`],
  [/^Too big: expected array to have <=(\d+) items?$/, (n) => `Højst ${n} ad gangen.`],
  [/^Too small: expected number to be >=?(-?[\d.]+)$/, (n) => `Skal være mindst ${n}.`],
  [/^Too big: expected number to be <=?(-?[\d.]+)$/, (n) => `Må højst være ${n}.`],
  [/^Invalid (input|option)/, () => 'Ugyldig værdi.'],
];

/** The Danish text for a server message, or null when it is not one we know. */
export function translateServerMessage(message: string): string | null {
  const exact = EXACT[message.trim()];
  if (exact) return exact;
  for (const [pattern, render] of PATTERNS) {
    const match = pattern.exec(message.trim());
    if (match) return render(...match.slice(1));
  }
  return null;
}

/** Every message listed, for the test that checks nothing the server says is missing. */
export const KNOWN_EXACT_MESSAGES: readonly string[] = Object.keys(EXACT);
