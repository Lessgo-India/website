import test from 'node:test';
import assert from 'node:assert/strict';
import { INDIA_DISTRICT_COUNT, INDIA_GEO, getGeoDistrict, isPincodeInState, statesForPincode } from './indiaGeo.ts';

const toRad = (degrees) => (degrees * Math.PI) / 180;
function km([lat1, lng1], [lat2, lng2]) {
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

test('mirrors the app master table', () => {
  assert.equal(INDIA_GEO.length, 36);
  assert.equal(INDIA_DISTRICT_COUNT, 788);
  for (const state of INDIA_GEO) {
    for (const district of state.districts) assert.ok(district.id.startsWith(`${state.code}-`), district.id);
  }
});

test('gives every district its own centre', () => {
  const owners = new Map();
  for (const state of INDIA_GEO) {
    for (const district of state.districts) {
      const key = district.centroid.join(',');
      assert.equal(owners.get(key) ?? district.id, district.id, `${district.id} shares a centre with ${owners.get(key)}`);
      owners.set(key, district.id);
    }
  }
});

test('keeps outlet pins at real towns close to their district centre', () => {
  // Town, PIN, district — pins here used to be rejected as "far from the district".
  const towns = [
    ['LA-leh', '194101', 34.1526, 77.5771],
    ['LA-nubra', '194401', 34.5469, 77.5563],
    ['CG-bilaspur', '495001', 22.0797, 82.1409],
    ['TG-nirmal', '504106', 19.0964, 78.3444],
    ['TG-wanaparthy', '509103', 16.3623, 78.0622],
  ];
  for (const [districtId, pin, lat, lng] of towns) {
    const district = getGeoDistrict(districtId);
    assert.ok(district, districtId);
    assert.ok(isPincodeInState(pin, district.stateCode), `${pin} should be in ${district.stateCode}`);
    assert.ok(km(district.centroid, [lat, lng]) < 60, `${districtId} centre is ${Math.round(km(district.centroid, [lat, lng]))} km away`);
  }
});

test('resolves PIN codes to states', () => {
  const codes = (pin) => statesForPincode(pin).map((state) => state.code).join('/');
  assert.equal(codes('560001'), 'KA');
  assert.equal(codes('605001'), 'PY');
  assert.equal(codes('244001'), 'UP/UK');
  assert.equal(codes('012345'), '');
  assert.equal(codes('5600'), '');
});
