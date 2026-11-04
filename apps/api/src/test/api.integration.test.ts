import { areaFromBBox, areaFromCorners } from '@ecomap/shared';
import { generateTotpCode } from '../auth/totp.js';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { Sql } from '../db/client.js';
import { setUserTotpSecret, enableUserTotp } from '../modules/users/repository.js';
import {
  hasTestDatabase,
  resetTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
} from './database.js';
import { TEST_PASSWORD, createTestLayer, createTestUser, refreshCookieFrom } from './fixtures.js';

/**
 * End-to-end tests over the real HTTP stack and a real PostGIS database.
 *
 * They skip themselves when `TEST_DATABASE_URL` is unset, so a clone without
 * Docker still gets a green `npm test` from the unit suites.
 */
describe.skipIf(!hasTestDatabase)('EcoMap API', () => {
  let db: Sql;
  let app: Express;

  beforeAll(async () => {
    db = await setupTestDatabase();
    app = createApp(db);
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  beforeEach(async () => {
    await resetTestDatabase(db);
  });

  describe('GET /api/health', () => {
    it('reports ok and reaches the database', async () => {
      const response = await request(app).get('/api/health').expect(200);
      expect(response.body).toMatchObject({ status: 'ok' });
    });
  });

  describe('registration and login', () => {
    const credentials = {
      email: 'bo@example.test',
      displayName: 'Bo Nielsen',
      password: 'a-long-enough-passw0rd',
    };

    it('registers, returns a session and sets an httpOnly refresh cookie', async () => {
      const response = await request(app).post('/api/auth/register').send(credentials).expect(201);

      expect(response.body.user).toMatchObject({
        email: credentials.email,
        displayName: credentials.displayName,
        role: 'contributor',
        totpEnabled: false,
      });
      expect(response.body.accessToken).toEqual(expect.any(String));

      const cookie = refreshCookieFrom(response);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/auth');
    });

    it('never returns the password hash', async () => {
      const response = await request(app).post('/api/auth/register').send(credentials).expect(201);
      expect(JSON.stringify(response.body)).not.toContain('scrypt$');
    });

    it('rejects a weak password with field-level issues', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...credentials, password: 'short' })
        .expect(422);

      expect(response.body.error.code).toBe('validation_failed');
      expect(response.body.error.issues).toContainEqual(
        expect.objectContaining({ path: 'password' }),
      );
    });

    it('refuses a duplicate email', async () => {
      await request(app).post('/api/auth/register').send(credentials).expect(201);
      const response = await request(app).post('/api/auth/register').send(credentials).expect(409);
      expect(response.body.error.code).toBe('conflict');
    });

    it('signs in with the right password', async () => {
      await request(app).post('/api/auth/register').send(credentials).expect(201);
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);

      expect(response.body.user.email).toBe(credentials.email);
    });

    it('gives the same answer for a wrong password and an unknown account', async () => {
      await request(app).post('/api/auth/register').send(credentials).expect(201);

      const wrongPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'not-the-password-1' })
        .expect(401);
      const unknownAccount = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.test', password: 'not-the-password-1' })
        .expect(401);

      expect(wrongPassword.body.error.code).toBe('invalid_credentials');
      expect(unknownAccount.body.error).toEqual(wrongPassword.body.error);
    });

    it('blocks registration when the community is invite-only', async () => {
      await db`update community_settings set allow_public_registration = false where id = true`;
      const response = await request(app).post('/api/auth/register').send(credentials).expect(403);
      expect(response.body.error.code).toBe('forbidden');
    });
  });

  describe('two-factor authentication', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    async function createUserWithTotp() {
      const user = await createTestUser(db, 'contributor');
      await setUserTotpSecret(db, user.id, secret);
      await enableUserTotp(db, user.id);
      return user;
    }

    it('asks for a code when two-factor is on', async () => {
      const user = await createUserWithTotp();
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(401);

      expect(response.body.error.code).toBe('totp_required');
    });

    it('signs in with a valid code', async () => {
      const user = await createUserWithTotp();
      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD, totpCode: generateTotpCode(secret) })
        .expect(200);
    });

    it('rejects a wrong code', async () => {
      const user = await createUserWithTotp();
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: TEST_PASSWORD, totpCode: '000000' })
        .expect(401);

      expect(response.body.error.code).toBe('invalid_credentials');
    });
  });

  describe('session lifecycle', () => {
    it('refreshes with the cookie and rotates the token', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({ email: 'rot@example.test', displayName: 'Rotator', password: TEST_PASSWORD })
        .expect(201);

      const first = await agent.post('/api/auth/refresh').expect(200);
      expect(first.body.accessToken).toEqual(expect.any(String));

      /* The rotated cookie replaced the old one, so a second refresh still works. */
      await agent.post('/api/auth/refresh').expect(200);
    });

    it('refuses to reuse a refresh token after rotation', async () => {
      const registration = await request(app)
        .post('/api/auth/register')
        .send({ email: 'reuse@example.test', displayName: 'Reuser', password: TEST_PASSWORD })
        .expect(201);

      const originalCookie = refreshCookieFrom(registration);
      expect(originalCookie).toBeDefined();

      await request(app).post('/api/auth/refresh').set('Cookie', originalCookie!).expect(200);
      const replay = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', originalCookie!)
        .expect(401);

      expect(replay.body.error.code).toBe('unauthorized');
    });

    it('rejects a refresh with no cookie at all', async () => {
      await request(app).post('/api/auth/refresh').expect(401);
    });

    it('ends the session on logout', async () => {
      const registration = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bye@example.test', displayName: 'Leaver', password: TEST_PASSWORD })
        .expect(201);
      const cookie = refreshCookieFrom(registration)!;

      await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);
      await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('rejects a forged access token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.real.token')
        .expect(401);
    });
  });

  describe('layers', () => {
    it('lists published layers for anonymous visitors', async () => {
      await createTestLayer(db, { slug: 'visible', name: 'Visible' });
      await createTestLayer(db, { slug: 'hidden', name: 'Hidden', isPublished: false });

      const response = await request(app).get('/api/layers').expect(200);
      const layers = response.body as { slug: string }[];
      expect(layers.map((layer) => layer.slug)).toEqual(['visible']);
    });

    it('shows unpublished layers to a moderator', async () => {
      await createTestLayer(db, { slug: 'hidden', name: 'Hidden', isPublished: false });
      const moderator = await createTestUser(db, 'moderator');

      const response = await request(app).get('/api/layers').set(moderator.authHeader).expect(200);
      expect(response.body).toHaveLength(1);
    });

    it('lets an admin create a layer', async () => {
      const admin = await createTestUser(db, 'admin');
      const response = await request(app)
        .post('/api/layers')
        .set(admin.authHeader)
        .send({
          slug: 'repair-cafes',
          name: 'Repair cafés',
          allowedGeometries: ['Point'],
          fields: [{ key: 'openingHours', label: 'Opening hours', type: 'text' }],
        })
        .expect(201);

      expect(response.body).toMatchObject({ slug: 'repair-cafes', featureCount: 0 });
      expect(response.body.fields).toHaveLength(1);
    });

    it('refuses layer creation for a contributor', async () => {
      const contributor = await createTestUser(db, 'contributor');
      const response = await request(app)
        .post('/api/layers')
        .set(contributor.authHeader)
        .send({ slug: 'nope', name: 'Nope' })
        .expect(403);

      expect(response.body.error.code).toBe('forbidden');
    });

    it('refuses layer creation for an anonymous visitor', async () => {
      await request(app).post('/api/layers').send({ slug: 'nope', name: 'Nope' }).expect(401);
    });

    it('refuses a duplicate slug', async () => {
      const admin = await createTestUser(db, 'admin');
      await createTestLayer(db, { slug: 'taken', name: 'Taken' });

      await request(app)
        .post('/api/layers')
        .set(admin.authHeader)
        .send({ slug: 'taken', name: 'Also taken' })
        .expect(409);
    });

    it('requires confirmation before deleting a layer that still holds features', async () => {
      const admin = await createTestUser(db, 'admin');
      const layer = await createTestLayer(db, { slug: 'busy', name: 'Busy' });

      await request(app)
        .post('/api/features')
        .set(admin.authHeader)
        .send({
          layerId: layer.id,
          name: 'Something here',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(201);

      await request(app).delete(`/api/layers/${layer.id}`).set(admin.authHeader).expect(409);
      await request(app)
        .delete(`/api/layers/${layer.id}?confirm=true`)
        .set(admin.authHeader)
        .expect(204);
    });
  });

  describe('features', () => {
    it('returns GeoJSON', async () => {
      const layer = await createTestLayer(db, { slug: 'points', name: 'Points' });
      const author = await createTestUser(db, 'contributor');

      await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Nexø garden',
          description: 'Behind the library',
          geometry: { type: 'Point', coordinates: [15.1289, 55.0605] },
        })
        .expect(201);

      const response = await request(app).get('/api/features').expect(200);
      expect(response.body.type).toBe('FeatureCollection');
      expect(response.body.total).toBe(1);
      expect(response.body.features[0].geometry).toEqual({
        type: 'Point',
        coordinates: [15.1289, 55.0605],
      });
      expect(response.body.features[0].properties.name).toBe('Nexø garden');
    });

    it('stores lines and polygons through PostGIS unchanged', async () => {
      const layer = await createTestLayer(db, {
        slug: 'shapes',
        name: 'Shapes',
        allowedGeometries: ['LineString', 'Polygon'],
      });
      const author = await createTestUser(db, 'contributor');

      const line = {
        type: 'LineString' as const,
        coordinates: [
          [14.8785, 55.1279],
          [14.8871, 55.1236],
        ],
      };
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [14.93, 55.08],
            [14.94, 55.08],
            [14.94, 55.09],
            [14.93, 55.08],
          ],
        ],
      };

      for (const [name, geometry] of [
        ['A path', line],
        ['An area', polygon],
      ] as const) {
        await request(app)
          .post('/api/features')
          .set(author.authHeader)
          .send({ layerId: layer.id, name, geometry })
          .expect(201);
      }

      const response = await request(app).get('/api/features').expect(200);
      const collection = response.body as { features: { geometry: unknown }[] };
      const geometries = collection.features.map((feature) => feature.geometry);
      expect(geometries).toContainEqual(line);
      expect(geometries).toContainEqual(polygon);
    });

    it('rejects a geometry the layer does not accept', async () => {
      const layer = await createTestLayer(db, {
        slug: 'points-only',
        name: 'Points only',
        allowedGeometries: ['Point'],
      });
      const author = await createTestUser(db, 'contributor');

      const response = await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'A line',
          geometry: {
            type: 'LineString',
            coordinates: [
              [14.9, 55.1],
              [15.0, 55.2],
            ],
          },
        })
        .expect(400);

      expect(response.body.error.message).toContain('Point');
    });

    it('validates custom fields defined on the layer', async () => {
      const layer = await createTestLayer(db, {
        slug: 'sightings',
        name: 'Sightings',
        fields: [
          { key: 'species', label: 'Species', type: 'text', required: true },
          { key: 'website', label: 'Website', type: 'url' },
        ],
      });
      const author = await createTestUser(db, 'contributor');

      const missingRequired = await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'A toad',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
          properties: {},
        })
        .expect(422);
      expect(missingRequired.body.error.issues).toContainEqual(
        expect.objectContaining({ path: 'species' }),
      );

      await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'A toad',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
          properties: { species: 'Bufo bufo', website: 'not a url' },
        })
        .expect(422);
    });

    it('filters by bounding box using the spatial index', async () => {
      const layer = await createTestLayer(db, { slug: 'spread', name: 'Spread out' });
      const author = await createTestUser(db, 'contributor');

      for (const [name, coordinates] of [
        ['On Bornholm', [14.9, 55.1]],
        ['In Copenhagen', [12.57, 55.68]],
      ] as const) {
        await request(app)
          .post('/api/features')
          .set(author.authHeader)
          .send({ layerId: layer.id, name, geometry: { type: 'Point', coordinates } })
          .expect(201);
      }

      const response = await request(app).get('/api/features?bbox=14.6,54.9,15.2,55.4').expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.features[0].properties.name).toBe('On Bornholm');
    });

    it('filters by layer slug, and returns nothing for an unknown slug', async () => {
      const wanted = await createTestLayer(db, { slug: 'wanted', name: 'Wanted' });
      const other = await createTestLayer(db, { slug: 'other', name: 'Other' });
      const author = await createTestUser(db, 'contributor');

      for (const layer of [wanted, other]) {
        await request(app)
          .post('/api/features')
          .set(author.authHeader)
          .send({
            layerId: layer.id,
            name: `In ${layer.slug}`,
            geometry: { type: 'Point', coordinates: [14.9, 55.1] },
          })
          .expect(201);
      }

      const filtered = await request(app).get('/api/features?layers=wanted').expect(200);
      expect(filtered.body.total).toBe(1);

      const unknown = await request(app).get('/api/features?layers=does-not-exist').expect(200);
      expect(unknown.body.total).toBe(0);
    });

    it('filters by free text across name and description', async () => {
      const layer = await createTestLayer(db, { slug: 'searchable', name: 'Searchable' });
      const author = await createTestUser(db, 'contributor');

      await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Beehive corner',
          description: 'Pollinator planting',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(201);
      await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Old quarry',
          description: 'Nothing to do with insects',
          geometry: { type: 'Point', coordinates: [14.91, 55.11] },
        })
        .expect(201);

      const byName = await request(app).get('/api/features?q=beehive').expect(200);
      expect(byName.body.total).toBe(1);

      const byDescription = await request(app).get('/api/features?q=pollinator').expect(200);
      expect(byDescription.body.total).toBe(1);

      /* The layer's own name finds everything in it: "searchable" is the layer here. */
      const byLayer = await request(app).get('/api/features?q=searchab').expect(200);
      expect(byLayer.body.total).toBe(2);

      /* ...but only from the start of a word: "archable" is inside "Searchable". */
      const insideWord = await request(app).get('/api/features?q=archable').expect(200);
      expect(insideWord.body.total).toBe(0);

      /* A whole word inside a description counts, but not a fragment of one. */
      const descriptionWord = await request(app).get('/api/features?q=insects').expect(200);
      expect(descriptionWord.body.total).toBe(1);
      const descriptionFragment = await request(app).get('/api/features?q=sects').expect(200);
      expect(descriptionFragment.body.total).toBe(0);

      /* Characters that mean something in a regular expression are taken literally. */
      await request(app).get('/api/features?q=(%5B*').expect(200);
    });

    it('rejects a contribution outside the configured contribution area', async () => {
      const admin = await createTestUser(db, 'admin');
      await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({ contributionArea: areaFromBBox([14.6, 54.9, 15.2, 55.4]) })
        .expect(200);
      const layer = await createTestLayer(db, { slug: 'bounded', name: 'Bounded' });
      const author = await createTestUser(db, 'contributor');

      await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Far away',
          geometry: { type: 'Point', coordinates: [12.57, 55.68] },
        })
        .expect(400);

      await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Close by',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(201);
    });

    it('catches a line that leaves a concave area and comes back', async () => {
      /* A "C" open to the east: both ends of the line are inside, its middle is not. */
      const admin = await createTestUser(db, 'admin');
      await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({
          contributionArea: areaFromCorners([
            [14.0, 55.0],
            [15.0, 55.0],
            [15.0, 55.3],
            [14.3, 55.3],
            [14.3, 55.7],
            [15.0, 55.7],
            [15.0, 56.0],
            [14.0, 56.0],
          ]),
        })
        .expect(200);
      const layer = await createTestLayer(db, {
        slug: 'paths',
        name: 'Paths',
        allowedGeometries: ['LineString'],
      });
      const author = await createTestUser(db, 'contributor');
      const line = (coordinates: [number, number][]) =>
        request(app)
          .post('/api/features')
          .set(author.authHeader)
          .send({
            layerId: layer.id,
            name: 'A path',
            geometry: { type: 'LineString', coordinates },
          });

      await line([
        [14.8, 55.1],
        [14.8, 55.9],
      ]).expect(400);
      await line([
        [14.8, 55.1],
        [14.1, 55.1],
        [14.1, 55.9],
        [14.8, 55.9],
      ]).expect(201);
    });

    it('refuses an area outline that crosses itself', async () => {
      const admin = await createTestUser(db, 'admin');
      const response = await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({
          contributionArea: areaFromCorners([
            [14.0, 55.0],
            [15.0, 56.0],
            [15.0, 55.0],
            [14.0, 56.0],
          ]),
        })
        .expect(422);
      expect(response.body.error.code).toBe('validation_failed');
    });

    it('lets an admin remove the area again', async () => {
      const admin = await createTestUser(db, 'admin');
      await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({ contributionArea: areaFromBBox([14.6, 54.9, 15.2, 55.4]) })
        .expect(200);
      const cleared = await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({ contributionArea: null })
        .expect(200);
      expect(cleared.body.contributionArea).toBeNull();

      const settings = await request(app).get('/api/settings').expect(200);
      expect(settings.body.contributionArea).toBeNull();
    });

    it('returns the area as GeoJSON the web app can draw', async () => {
      const admin = await createTestUser(db, 'admin');
      const area = areaFromBBox([14.6, 54.9, 15.2, 55.4]);
      await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({ contributionArea: area })
        .expect(200);
      const settings = await request(app).get('/api/settings').expect(200);
      expect(settings.body.contributionArea).toEqual(area);
    });

    it('needs a signed-in user to contribute', async () => {
      const layer = await createTestLayer(db, { slug: 'guarded', name: 'Guarded' });
      await request(app)
        .post('/api/features')
        .send({
          layerId: layer.id,
          name: 'Anonymous',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(401);
    });
  });

  describe('ownership and moderation', () => {
    async function createFeatureAs(
      layerId: string,
      token: { Authorization: string },
      name: string,
    ) {
      const response = await request(app)
        .post('/api/features')
        .set(token)
        .send({ layerId, name, geometry: { type: 'Point', coordinates: [14.9, 55.1] } })
        .expect(201);
      return response.body as { id: string; status: string };
    }

    it('lets an author edit and delete their own contribution', async () => {
      const layer = await createTestLayer(db, { slug: 'own', name: 'Own' });
      const author = await createTestUser(db, 'contributor');
      const feature = await createFeatureAs(layer.id, author.authHeader, 'Mine');

      await request(app)
        .patch(`/api/features/${feature.id}`)
        .set(author.authHeader)
        .send({ name: 'Renamed' })
        .expect(200);

      await request(app).delete(`/api/features/${feature.id}`).set(author.authHeader).expect(204);
    });

    it("stops a contributor editing somebody else's contribution directly", async () => {
      const layer = await createTestLayer(db, { slug: 'theirs', name: 'Theirs' });
      const author = await createTestUser(db, 'contributor');
      const stranger = await createTestUser(db, 'contributor');
      const feature = await createFeatureAs(layer.id, author.authHeader, 'Not yours');

      await request(app)
        .patch(`/api/features/${feature.id}`)
        .set(stranger.authHeader)
        .send({ name: 'Hijacked' })
        .expect(409);

      await request(app).delete(`/api/features/${feature.id}`).set(stranger.authHeader).expect(403);
    });

    it('lets a moderator edit anything', async () => {
      const layer = await createTestLayer(db, { slug: 'moderated', name: 'Moderated' });
      const author = await createTestUser(db, 'contributor');
      const moderator = await createTestUser(db, 'moderator');
      const feature = await createFeatureAs(layer.id, author.authHeader, 'Needs a tidy');

      await request(app)
        .patch(`/api/features/${feature.id}`)
        .set(moderator.authHeader)
        .send({ name: 'Tidied' })
        .expect(200);
    });

    it('holds contributions to a moderated layer until they are approved', async () => {
      const layer = await createTestLayer(db, {
        slug: 'queued',
        name: 'Queued',
        requiresModeration: true,
      });
      const author = await createTestUser(db, 'contributor');
      const moderator = await createTestUser(db, 'moderator');

      const feature = await createFeatureAs(layer.id, author.authHeader, 'Awaiting review');
      expect(feature.status).toBe('pending');

      /* Invisible to the public, visible to its author and to a moderator. */
      const anonymous = await request(app).get('/api/features').expect(200);
      expect(anonymous.body.total).toBe(0);

      const asAuthor = await request(app).get('/api/features').set(author.authHeader).expect(200);
      expect(asAuthor.body.total).toBe(1);

      const asModerator = await request(app)
        .get('/api/features?status=pending')
        .set(moderator.authHeader)
        .expect(200);
      expect(asModerator.body.total).toBe(1);

      await request(app)
        .post(`/api/features/${feature.id}/moderate`)
        .set(moderator.authHeader)
        .send({ status: 'published' })
        .expect(200);

      const afterApproval = await request(app).get('/api/features').expect(200);
      expect(afterApproval.body.total).toBe(1);
    });

    it('refuses moderation from a plain contributor', async () => {
      const layer = await createTestLayer(db, { slug: 'guard', name: 'Guard' });
      const author = await createTestUser(db, 'contributor');
      const feature = await createFeatureAs(layer.id, author.authHeader, 'Self-approve?');

      await request(app)
        .post(`/api/features/${feature.id}/moderate`)
        .set(author.authHeader)
        .send({ status: 'published' })
        .expect(403);
    });

    it('hides an unpublished feature behind a 404, not a 403', async () => {
      const layer = await createTestLayer(db, {
        slug: 'secretive',
        name: 'Secretive',
        requiresModeration: true,
      });
      const author = await createTestUser(db, 'contributor');
      const stranger = await createTestUser(db, 'contributor');
      const feature = await createFeatureAs(layer.id, author.authHeader, 'Pending');

      await request(app).get(`/api/features/${feature.id}`).set(stranger.authHeader).expect(404);
    });
  });

  describe('suggested changes', () => {
    async function publishedPlace(layerOverrides = {}) {
      const layer = await createTestLayer(db, layerOverrides);
      const author = await createTestUser(db, 'contributor');
      const response = await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Farm shop',
          description: 'Eggs',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(201);
      const moderator = await createTestUser(db, 'moderator');
      if (response.body.status !== 'published') {
        await request(app)
          .post(`/api/features/${String(response.body.id)}/moderate`)
          .set(moderator.authHeader)
          .send({ status: 'published' })
          .expect(200);
      }
      return { id: String(response.body.id), author, moderator };
    }

    const suggest = (actor: { authHeader: { Authorization: string } }, id: string, body: object) =>
      request(app).post(`/api/features/${id}/suggestions`).set(actor.authHeader).send(body);

    const decideUrl = (created: request.Response) =>
      `/api/suggestions/${String(created.body.id)}/decide`;

    it('keeps the place as it is until a moderator approves the change', async () => {
      const { id, moderator } = await publishedPlace();
      const neighbour = await createTestUser(db, 'contributor');

      const created = await suggest(neighbour, id, { description: 'Eggs and honey' }).expect(201);
      expect(created.body).toMatchObject({
        status: 'pending',
        changes: { description: 'Eggs and honey' },
        current: { description: 'Eggs' },
      });

      const before = await request(app).get(`/api/features/${id}`).expect(200);
      expect(before.body.description).toBe('Eggs');

      const queue = await request(app)
        .get('/api/suggestions')
        .set(moderator.authHeader)
        .expect(200);
      expect(queue.body).toHaveLength(1);

      const decided = await request(app)
        .post(decideUrl(created))
        .set(moderator.authHeader)
        .send({ decision: 'approve' })
        .expect(200);
      expect(decided.body.suggestion.status).toBe('approved');
      expect(decided.body.feature.description).toBe('Eggs and honey');

      const after = await request(app)
        .get('/api/suggestions')
        .set(moderator.authHeader)
        .expect(200);
      expect(after.body).toHaveLength(0);
    });

    it('leaves the place untouched when the change is rejected, and decides only once', async () => {
      const { id, moderator } = await publishedPlace();
      const neighbour = await createTestUser(db, 'contributor');
      const created = await suggest(neighbour, id, { name: 'Wrong name' }).expect(201);
      const decide = () =>
        request(app)
          .post(decideUrl(created))
          .set(moderator.authHeader)
          .send({ decision: 'reject' });

      await decide().expect(200);
      await decide().expect(409);
      const place = await request(app).get(`/api/features/${id}`).expect(200);
      expect(place.body.name).toBe('Farm shop');
    });

    it('sends an author edit of a reviewed, published place through a suggestion', async () => {
      const { id, author } = await publishedPlace({ requiresModeration: true });
      await request(app)
        .patch(`/api/features/${id}`)
        .set(author.authHeader)
        .send({ name: 'Renamed' })
        .expect(409);
      await suggest(author, id, { name: 'Renamed' }).expect(201);
      const place = await request(app).get(`/api/features/${id}`).expect(200);
      expect(place.body.status).toBe('published');
      expect(place.body.name).toBe('Farm shop');
    });

    it('checks a suggestion like an edit, and only members may make one', async () => {
      const { id, moderator } = await publishedPlace({ allowedGeometries: ['Point'] });
      const neighbour = await createTestUser(db, 'contributor');

      await request(app)
        .post(`/api/features/${id}/suggestions`)
        .send({ name: 'Anonymous' })
        .expect(401);
      await suggest(neighbour, id, {}).expect(422);
      /* The layer takes points only, so a line is refused - as it would be for an edit. */
      await suggest(neighbour, id, {
        geometry: {
          type: 'LineString',
          coordinates: [
            [14.9, 55.1],
            [14.91, 55.11],
          ],
        },
      }).expect(400);
      await request(app).get('/api/suggestions').set(neighbour.authHeader).expect(403);
      await request(app).get('/api/suggestions').set(moderator.authHeader).expect(200);
    });
  });

  describe('community settings', () => {
    it('is readable without signing in', async () => {
      const response = await request(app).get('/api/settings').expect(200);
      expect(response.body).toMatchObject({ name: 'EcoMap Community' });
      expect(response.body.initialView).toMatchObject({ lat: expect.any(Number) });
    });

    it('is editable by an admin', async () => {
      const admin = await createTestUser(db, 'admin');
      const response = await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({
          name: 'Grøn Bornholm',
          primaryColor: '#1a7f5a',
          initialView: { lat: 55.13, lng: 14.92, zoom: 11 },
        })
        .expect(200);

      expect(response.body).toMatchObject({ name: 'Grøn Bornholm', primaryColor: '#1a7f5a' });
      expect(response.body.initialView).toEqual({ lat: 55.13, lng: 14.92, zoom: 11 });
    });

    it('is not editable by a moderator', async () => {
      const moderator = await createTestUser(db, 'moderator');
      await request(app)
        .patch('/api/settings')
        .set(moderator.authHeader)
        .send({ name: 'Nope' })
        .expect(403);
    });

    it('rejects a malformed colour', async () => {
      const admin = await createTestUser(db, 'admin');
      await request(app)
        .patch('/api/settings')
        .set(admin.authHeader)
        .send({ primaryColor: 'green' })
        .expect(422);
    });
  });

  describe('user administration', () => {
    it('lets a superadmin change a role', async () => {
      const superadmin = await createTestUser(db, 'superadmin');
      const user = await createTestUser(db, 'contributor');

      const response = await request(app)
        .patch(`/api/users/${user.id}/role`)
        .set(superadmin.authHeader)
        .send({ role: 'moderator' })
        .expect(200);

      expect(response.body.role).toBe('moderator');
    });

    it('stops an admin changing roles', async () => {
      const admin = await createTestUser(db, 'admin');
      const user = await createTestUser(db, 'contributor');

      await request(app)
        .patch(`/api/users/${user.id}/role`)
        .set(admin.authHeader)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('stops a superadmin demoting themselves out of the role', async () => {
      const superadmin = await createTestUser(db, 'superadmin');
      await request(app)
        .patch(`/api/users/${superadmin.id}/role`)
        .set(superadmin.authHeader)
        .send({ role: 'viewer' })
        .expect(400);
    });
  });

  describe('profile pictures', () => {
    /* Only the header is ever inspected, so a signature plus padding is enough. */
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 1),
    ]);

    const upload = (user: { authHeader: { Authorization: string } }, body: Buffer = png) =>
      request(app)
        .put('/api/auth/me/avatar')
        .set(user.authHeader)
        .set('Content-Type', 'image/png')
        .send(body);

    it('stores a picture and serves it back, locked down', async () => {
      const user = await createTestUser(db);

      const uploaded = await upload(user).expect(200);
      const avatarUrl = String(uploaded.body.avatarUrl);
      expect(avatarUrl).toMatch(new RegExp(`^/api/users/${user.id}/avatar\\?v=\\d+$`));

      const served = await request(app).get(avatarUrl).expect(200);
      expect(served.headers['content-type']).toBe('image/png');
      expect(served.headers['content-security-policy']).toContain('sandbox');
      expect(served.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.compare(served.body as Buffer, png)).toBe(0);

      const me = await request(app).get('/api/auth/me').set(user.authHeader).expect(200);
      expect(me.body.avatarUrl).toBe(avatarUrl);
    });

    it('gives a replaced picture a new URL', async () => {
      const user = await createTestUser(db);
      const first = await upload(user).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await upload(user).expect(200);
      expect(second.body.avatarUrl).not.toBe(first.body.avatarUrl);
    });

    it('refuses markup sent with an image content type', async () => {
      const user = await createTestUser(db);
      await upload(
        user,
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
      ).expect(400);
    });

    it('refuses a picture over the size limit with a 413', async () => {
      const user = await createTestUser(db);
      const response = await upload(user, Buffer.concat([png, Buffer.alloc(300 * 1024)])).expect(
        413,
      );
      expect(response.body.error.code).toBe('payload_too_large');
    });

    it('needs a signed-in user to upload', async () => {
      await request(app)
        .put('/api/auth/me/avatar')
        .set('Content-Type', 'image/png')
        .send(png)
        .expect(401);
    });

    it('removes the picture', async () => {
      const user = await createTestUser(db);
      const uploaded = await upload(user).expect(200);

      const removed = await request(app)
        .delete('/api/auth/me/avatar')
        .set(user.authHeader)
        .expect(200);
      expect(removed.body.avatarUrl).toBeNull();
      await request(app).get(String(uploaded.body.avatarUrl)).expect(404);
    });
  });

  describe('invitations', () => {
    const newcomer = {
      email: 'newcomer@example.test',
      displayName: 'New Comer',
      password: 'a-long-enough-passw0rd',
    };

    function invite(
      inviter: { authHeader: { Authorization: string } },
      body: Record<string, unknown> = { role: 'contributor', label: 'For Bo' },
    ) {
      return request(app).post('/api/invitations').set(inviter.authHeader).send(body);
    }

    it('lets an admin invite someone, who joins with the chosen role', async () => {
      const admin = await createTestUser(db, 'admin');
      const created = await invite(admin, { role: 'moderator', label: 'Gardening lead' }).expect(
        201,
      );
      const token = String(created.body.token);
      expect(created.body.invitation).toMatchObject({ role: 'moderator', status: 'pending' });

      const preview = await request(app)
        .post('/api/auth/invitations/preview')
        .send({ token })
        .expect(200);
      expect(preview.body).toMatchObject({ role: 'moderator', label: 'Gardening lead' });

      const accepted = await request(app)
        .post('/api/auth/invitations/accept')
        .send({ ...newcomer, token })
        .expect(201);
      expect(accepted.body.user).toMatchObject({ email: newcomer.email, role: 'moderator' });
      expect(String(accepted.headers['set-cookie'])).toContain('HttpOnly');

      const list = await request(app).get('/api/invitations').set(admin.authHeader).expect(200);
      expect(list.body[0]).toMatchObject({ status: 'accepted', acceptedByName: 'New Comer' });
    });

    it('works even when open registration is switched off', async () => {
      await db`update community_settings set allow_public_registration = false`;
      const admin = await createTestUser(db, 'admin');
      const { body } = await invite(admin).expect(201);

      await request(app).post('/api/auth/register').send(newcomer).expect(403);
      await request(app)
        .post('/api/auth/invitations/accept')
        .send({ ...newcomer, token: body.token })
        .expect(201);
    });

    it('is single-use', async () => {
      const admin = await createTestUser(db, 'admin');
      const { body } = await invite(admin).expect(201);

      await request(app)
        .post('/api/auth/invitations/accept')
        .send({ ...newcomer, token: body.token })
        .expect(201);
      await request(app)
        .post('/api/auth/invitations/accept')
        .send({ ...newcomer, email: 'second@example.test', token: body.token })
        .expect(404);
    });

    it('stops working once withdrawn or expired', async () => {
      const admin = await createTestUser(db, 'admin');
      const withdrawn = await invite(admin).expect(201);
      await request(app)
        .delete(`/api/invitations/${String(withdrawn.body.invitation.id)}`)
        .set(admin.authHeader)
        .expect(204);
      await request(app)
        .post('/api/auth/invitations/preview')
        .send({ token: withdrawn.body.token })
        .expect(404);

      const expired = await invite(admin).expect(201);
      await db`update invitations set expires_at = now() - interval '1 minute'
               where id = ${String(expired.body.invitation.id)}`;
      await request(app)
        .post('/api/auth/invitations/accept')
        .send({ ...newcomer, token: expired.body.token })
        .expect(404);
    });

    it('stores only a hash of the token', async () => {
      const admin = await createTestUser(db, 'admin');
      const { body } = await invite(admin).expect(201);
      const [row] = await db<{ tokenHash: string }[]>`
        select token_hash as "tokenHash" from invitations
      `;
      expect(row?.tokenHash).not.toContain(String(body.token));
    });

    it('never lets an admin invite a peer, only the superadmin can', async () => {
      const admin = await createTestUser(db, 'admin');
      await invite(admin, { role: 'admin' }).expect(403);
      await invite(admin, { role: 'superadmin' }).expect(403);

      const superadmin = await createTestUser(db, 'superadmin');
      await invite(superadmin, { role: 'admin' }).expect(201);
      await invite(superadmin, { role: 'superadmin' }).expect(403);
    });

    it('gives moderators no invitations to hand out', async () => {
      const moderator = await createTestUser(db, 'moderator');
      await invite(moderator).expect(403);
      await request(app).get('/api/invitations').set(moderator.authHeader).expect(403);
    });

    it('refuses an email that already has an account', async () => {
      const admin = await createTestUser(db, 'admin');
      const { body } = await invite(admin).expect(201);
      await request(app)
        .post('/api/auth/invitations/accept')
        .send({ ...newcomer, email: admin.email, token: body.token })
        .expect(409);
    });
  });

  describe('exporting the map', () => {
    it('gives an admin everything, pending places and hidden layers included', async () => {
      const admin = await createTestUser(db, 'admin');
      const member = await createTestUser(db, 'contributor');
      const reviewed = await createTestLayer(db, { slug: 'reviewed', requiresModeration: true });
      const hidden = await createTestLayer(db, { slug: 'hidden-one', isPublished: false });

      await request(app)
        .post('/api/features')
        .set(member.authHeader)
        .send({
          layerId: reviewed.id,
          name: 'Waiting, for review',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(201);
      await request(app)
        .post('/api/features')
        .set(admin.authHeader)
        .send({
          layerId: hidden.id,
          name: 'On a hidden layer',
          geometry: { type: 'Point', coordinates: [15, 55.2] },
        })
        .expect(201);

      const geojson = await request(app).get('/api/export').set(admin.authHeader).expect(200);
      expect(geojson.headers['content-disposition']).toContain('.geojson');
      expect(geojson.headers['cache-control']).toBe('no-store');
      const body = JSON.parse(geojson.text) as {
        features: { properties: { name: string; status: string } }[];
      };
      expect(body.features.map((f) => [f.properties.name, f.properties.status])).toEqual(
        expect.arrayContaining([
          ['Waiting, for review', 'pending'],
          ['On a hidden layer', 'published'],
        ]),
      );

      const csv = await request(app)
        .get('/api/export?format=csv')
        .set(admin.authHeader)
        .expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.text).toContain('"Waiting, for review"');
    });

    it('is for admins only', async () => {
      const moderator = await createTestUser(db, 'moderator');
      await request(app).get('/api/export').expect(401);
      await request(app).get('/api/export').set(moderator.authHeader).expect(403);
    });
  });

  describe('temporary passwords', () => {
    function reset(actor: { authHeader: { Authorization: string } }, targetId: string) {
      return request(app).post(`/api/users/${targetId}/temporary-password`).set(actor.authHeader);
    }

    it('replaces the password and signs the person out', async () => {
      const admin = await createTestUser(db, 'admin');
      const member = await createTestUser(db, 'contributor');
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: TEST_PASSWORD })
        .expect(200);
      const cookie = refreshCookieFrom(login)!;

      const response = await reset(admin, member.id).expect(200);
      const temporary = String(response.body.temporaryPassword);
      expect(temporary).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
      expect(response.headers['cache-control']).toBe('no-store');

      await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
      await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: TEST_PASSWORD })
        .expect(401);
      await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: temporary })
        .expect(200);
    });

    it('only works downwards, and never on yourself', async () => {
      const admin = await createTestUser(db, 'admin');
      const otherAdmin = await createTestUser(db, 'admin');
      const member = await createTestUser(db, 'contributor');

      await reset(admin, admin.id).expect(403);
      await reset(admin, otherAdmin.id).expect(403);
      await reset(member, admin.id).expect(403);
    });
  });

  describe('blocking accounts', () => {
    function block(
      actor: { authHeader: { Authorization: string } },
      targetId: string,
      disabled = true,
    ) {
      return request(app)
        .patch(`/api/users/${targetId}/status`)
        .set(actor.authHeader)
        .send({ disabled });
    }

    it('signs a blocked person out everywhere, at once', async () => {
      const admin = await createTestUser(db, 'admin');
      const member = await createTestUser(db, 'contributor');
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: TEST_PASSWORD })
        .expect(200);
      const cookie = refreshCookieFrom(login)!;

      const blocked = await block(admin, member.id).expect(200);
      expect(blocked.body.disabled).toBe(true);

      /* The still-unexpired access token no longer works... */
      await request(app).get('/api/auth/me').set(member.authHeader).expect(401);
      /* ...nor does the refresh cookie, nor a fresh sign-in. */
      await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
      const again = await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: TEST_PASSWORD })
        .expect(403);
      expect(String(again.body.error.message)).toContain('blocked');
    });

    it('can be undone', async () => {
      const admin = await createTestUser(db, 'admin');
      const member = await createTestUser(db, 'contributor');
      await block(admin, member.id).expect(200);
      const unblocked = await block(admin, member.id, false).expect(200);
      expect(unblocked.body.disabled).toBe(false);
      await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: TEST_PASSWORD })
        .expect(200);
    });

    it('keeps the wrong password answer for a blocked account', async () => {
      const admin = await createTestUser(db, 'admin');
      const member = await createTestUser(db, 'contributor');
      await block(admin, member.id).expect(200);
      await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password: 'not-the-password-1' })
        .expect(401);
    });

    it('only works downwards, and never on yourself', async () => {
      const superadmin = await createTestUser(db, 'superadmin');
      const admin = await createTestUser(db, 'admin');
      const otherAdmin = await createTestUser(db, 'admin');
      const moderator = await createTestUser(db, 'moderator');

      await block(admin, otherAdmin.id).expect(403);
      await block(admin, superadmin.id).expect(403);
      await block(admin, admin.id).expect(403);
      await block(moderator, admin.id).expect(403);
      await block(superadmin, superadmin.id).expect(403);
      await block(superadmin, admin.id).expect(200);
    });

    it('withdraws the invitations a blocked admin handed out', async () => {
      const superadmin = await createTestUser(db, 'superadmin');
      const admin = await createTestUser(db, 'admin');
      const { body } = await request(app)
        .post('/api/invitations')
        .set(admin.authHeader)
        .send({ role: 'contributor' })
        .expect(201);

      await block(superadmin, admin.id).expect(200);
      await request(app)
        .post('/api/auth/invitations/preview')
        .send({ token: body.token })
        .expect(404);
    });
  });

  describe('contribution photos', () => {
    /* Only the header is inspected, so a JPEG signature plus padding is enough. */
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(256, 7)]);
    type Actor = { authHeader: { Authorization: string } };

    async function contribution(author: Actor, layerOverrides = {}) {
      const layer = await createTestLayer(db, layerOverrides);
      const response = await request(app)
        .post('/api/features')
        .set(author.authHeader)
        .send({
          layerId: layer.id,
          name: 'Kitchen garden',
          geometry: { type: 'Point', coordinates: [14.9, 55.1] },
        })
        .expect(201);
      return { id: String(response.body.id), status: String(response.body.status) };
    }

    function upload(actor: Actor, featureId: string, alt = '', body: Buffer = jpeg) {
      return request(app)
        .post(`/api/features/${featureId}/images?alt=${encodeURIComponent(alt)}`)
        .set(actor.authHeader)
        .set('Content-Type', 'image/jpeg')
        .send(body);
    }

    it('adds a photo the contribution then lists, and serves it to everyone', async () => {
      const author = await createTestUser(db, 'contributor');
      const { id } = await contribution(author);

      const added = await upload(author, id, 'Raised beds in spring').expect(201);
      expect(added.body.images).toHaveLength(1);
      expect(added.body.images[0]).toMatchObject({ alt: 'Raised beds in spring' });

      const url = String(added.body.images[0].url);
      const served = await request(app).get(url).expect(200);
      expect(served.headers['content-type']).toBe('image/jpeg');
      expect(served.headers['cache-control']).toContain('public');
      expect(served.headers['content-security-policy']).toContain('sandbox');

      const listed = await request(app).get('/api/features').expect(200);
      expect(listed.body.features[0].properties.images).toHaveLength(1);
    });

    it('hides the photos of an unapproved contribution from the public', async () => {
      const author = await createTestUser(db, 'contributor');
      const { id, status } = await contribution(author, { requiresModeration: true });
      expect(status).toBe('pending');
      const added = await upload(author, id).expect(201);
      const url = String(added.body.images[0].url);

      await request(app).get(url).expect(404);
      const own = await request(app).get(url).set(author.authHeader).expect(200);
      expect(own.headers['cache-control']).toContain('no-store');
      const moderator = await createTestUser(db, 'moderator');
      await request(app).get(url).set(moderator.authHeader).expect(200);
    });

    it("stops a stranger adding photos to somebody else's contribution", async () => {
      const author = await createTestUser(db, 'contributor');
      const stranger = await createTestUser(db, 'contributor');
      const moderator = await createTestUser(db, 'moderator');
      const { id } = await contribution(author);

      await upload(stranger, id).expect(403);
      await upload(moderator, id).expect(201);
    });

    it('refuses markup sent as an image, and anything over the size limit', async () => {
      const author = await createTestUser(db, 'contributor');
      const { id } = await contribution(author);
      await upload(author, id, '', Buffer.from('<svg onload="alert(1)"/>')).expect(400);
      await upload(author, id, '', Buffer.concat([jpeg, Buffer.alloc(1100 * 1024)])).expect(413);
    });

    it('allows at most six photos', async () => {
      const author = await createTestUser(db, 'contributor');
      const { id } = await contribution(author);
      for (let i = 0; i < 6; i += 1) await upload(author, id).expect(201);
      await upload(author, id).expect(409);
    });

    it('sends an approved contribution back for review when its author adds a photo', async () => {
      const author = await createTestUser(db, 'contributor');
      const moderator = await createTestUser(db, 'moderator');
      const { id } = await contribution(author, { requiresModeration: true });
      await request(app)
        .post(`/api/features/${id}/moderate`)
        .set(moderator.authHeader)
        .send({ status: 'published' })
        .expect(200);

      const added = await upload(author, id).expect(201);
      expect(added.body.status).toBe('pending');
    });

    it('changes a description and removes a photo', async () => {
      const author = await createTestUser(db, 'contributor');
      const { id } = await contribution(author);
      const added = await upload(author, id, 'first').expect(201);
      const imageId = String(added.body.images[0].id);

      const renamed = await request(app)
        .patch(`/api/features/${id}/images/${imageId}`)
        .set(author.authHeader)
        .send({ alt: 'A better description' })
        .expect(200);
      expect(renamed.body.images[0].alt).toBe('A better description');

      const removed = await request(app)
        .delete(`/api/features/${id}/images/${imageId}`)
        .set(author.authHeader)
        .expect(200);
      expect(removed.body.images).toEqual([]);
      await request(app).get(String(added.body.images[0].url)).expect(404);
    });

    it('deletes the photos together with their contribution', async () => {
      const author = await createTestUser(db, 'contributor');
      const { id } = await contribution(author);
      await upload(author, id).expect(201);
      await request(app).delete(`/api/features/${id}`).set(author.authHeader).expect(204);

      const [row] = await db<{ count: number }[]>`
        select count(*)::int as count from feature_images
      `;
      expect(row?.count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('answers an unknown endpoint with a structured 404', async () => {
      const response = await request(app).get('/api/nope').expect(404);
      expect(response.body.error.code).toBe('not_found');
    });

    it('answers malformed JSON with a structured 400', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ not json')
        .expect(400);

      expect(response.body.error.code).toBe('bad_request');
    });

    it('rejects a non-uuid id before it reaches the database', async () => {
      await request(app).get('/api/features/not-a-uuid').expect(422);
    });
  });
});
