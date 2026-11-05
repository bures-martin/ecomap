import { randomInt } from 'node:crypto';
import { SHORT_CODE_ALPHABET, SHORT_CODE_LENGTH, type ShortLink } from '@ecomap/shared';
import type { Sql } from '../../db/client.js';

export async function findShortLinkByCode(db: Sql, code: string): Promise<ShortLink | null> {
  const [row] = await db<ShortLink[]>`select code, query from short_links where code = ${code}`;
  return row ?? null;
}

/**
 * The link for a view: the existing one if this view was shared before, else
 * a new random code. Random rather than counted, so codes say nothing about
 * how many links exist and cannot be walked through one by one.
 */
export async function findOrCreateShortLink(db: Sql, query: string): Promise<ShortLink> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [created] = await db<ShortLink[]>`
      insert into short_links (code, query) values (${randomCode()}, ${query})
      on conflict do nothing
      returning code, query
    `;
    if (created) return created;

    /* Either this view already has a link, or the code was taken - rare; try again. */
    const [existing] = await db<ShortLink[]>`
      select code, query from short_links where query = ${query}
    `;
    if (existing) return existing;
  }
  throw new Error('Could not find a free short link code');
}

function randomCode(): string {
  return Array.from(
    { length: SHORT_CODE_LENGTH },
    () => SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)],
  ).join('');
}
