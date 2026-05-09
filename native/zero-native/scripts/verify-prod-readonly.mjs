const productionOrigin = 'https://codex-pets.net';

async function fetchJson(path) {
  const url = new URL(path, productionOrigin);
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${url.href} returned ${response.status}`);
  }
  return response.json();
}

async function verifyUrl(url, expectedTypePrefix) {
  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith(expectedTypePrefix)) {
    throw new Error(`${url} content-type ${contentType}, expected ${expectedTypePrefix}`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

const gallery = await fetchJson('/api/pets?page=1&pageSize=1&sort=new');
if (!Array.isArray(gallery.pets) || gallery.pets.length !== 1) {
  throw new Error('Expected one newest pet from /api/pets');
}

const newestPet = gallery.pets[0];
const newestPetId = requireString(newestPet.id, 'newest pet id');
const detail = await fetchJson(`/api/pets/${encodeURIComponent(newestPetId)}`);
if (detail?.pet?.id !== newestPetId) {
  throw new Error(`Pet detail id mismatch for ${newestPetId}`);
}

await verifyUrl(requireString(newestPet.spritesheetUrl, 'spritesheetUrl'), 'image/');
await verifyUrl(requireString(newestPet.posterUrl, 'posterUrl'), 'image/');
await verifyUrl(requireString(newestPet.previewUrl, 'previewUrl'), 'image/');

const collections = await fetchJson('/api/collections');
if (!Array.isArray(collections.collections) || collections.collections.length === 0) {
  throw new Error('Expected collections from /api/collections');
}

const firstCollectionSlug = requireString(collections.collections[0].slug, 'collection slug');
const collectionDetail = await fetchJson(`/api/collections/${encodeURIComponent(firstCollectionSlug)}?page=1&pageSize=1`);
if (!Array.isArray(collectionDetail.pets)) {
  throw new Error(`Expected pets array for collection ${firstCollectionSlug}`);
}

const creators = await fetchJson('/api/creators/leaderboard');
if (!Array.isArray(creators.creators) || creators.creators.length === 0) {
  throw new Error('Expected creators from /api/creators/leaderboard');
}

console.log(`ok prod-readonly newest=${newestPetId} pets=${gallery.totalCount ?? 'unknown'} collections=${collections.collections.length} creators=${creators.creators.length}`);
