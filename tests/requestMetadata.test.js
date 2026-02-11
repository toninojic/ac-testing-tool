const test = require('node:test');
const assert = require('node:assert/strict');
const { getClientIp, getReferrer } = require('../middlewares/requestMetadata');

test('getClientIp returns first IP from x-forwarded-for list', () => {
    const req = {
        headers: { 'x-forwarded-for': '203.0.113.8, 10.0.0.5' },
        socket: { remoteAddress: '10.0.0.1' },
        ip: '127.0.0.1'
    };

    assert.equal(getClientIp(req), '203.0.113.8');
});

test('getClientIp falls back to socket remoteAddress', () => {
    const req = {
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
        ip: '127.0.0.1'
    };

    assert.equal(getClientIp(req), '10.0.0.1');
});

test('getReferrer returns default value when referer header missing', () => {
    const req = {
        get: () => undefined
    };

    assert.equal(getReferrer(req), 'No referrer');
});
