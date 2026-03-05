import assert from 'node:assert/strict';
import test from 'node:test';

function extractBearerToken(authHeader) {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

function isValidAdminTaskToken(authHeader, configuredToken) {
  if (!configuredToken) return false;
  const token = extractBearerToken(authHeader);
  return Boolean(token && token === configuredToken);
}

test('extractBearerToken handles valid and invalid headers', () => {
  assert.equal(extractBearerToken('Bearer abc123'), 'abc123');
  assert.equal(extractBearerToken('bearer xyz'), 'xyz');
  assert.equal(extractBearerToken('Basic aaa'), null);
  assert.equal(extractBearerToken(null), null);
});

test('admin task token validation is strict', () => {
  assert.equal(isValidAdminTaskToken('Bearer token-1', 'token-1'), true);
  assert.equal(isValidAdminTaskToken('Bearer token-2', 'token-1'), false);
  assert.equal(isValidAdminTaskToken('Bearer token-1', ''), false);
});
