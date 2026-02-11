const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ACCESS_TOKEN = 'plugin-secret';
process.env.API_TOKEN = 'api-secret';

const { requirePluginToken, requireBearerToken } = require('../middlewares/authMiddleware');

const createMockRes = () => {
    const res = {
        statusCode: 200,
        body: undefined,
        text: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(payload) {
            this.text = payload;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };

    return res;
};

test('requirePluginToken blocks request without x-plugin-token', () => {
    const req = { headers: {}, path: '/plugin-protected', socket: { remoteAddress: '127.0.0.1' } };
    const res = createMockRes();
    let wasNextCalled = false;

    requirePluginToken(req, res, () => {
        wasNextCalled = true;
    });

    assert.equal(wasNextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.text, 'Forbidden Access!');
});

test('requirePluginToken allows request with valid x-plugin-token', () => {
    const req = { headers: { 'x-plugin-token': 'plugin-secret' }, path: '/plugin-protected' };
    const res = createMockRes();
    let wasNextCalled = false;

    requirePluginToken(req, res, () => {
        wasNextCalled = true;
    });

    assert.equal(wasNextCalled, true);
});

test('requireBearerToken blocks request with invalid bearer token', () => {
    const req = { headers: { authorization: 'Bearer wrong-token' } };
    const res = createMockRes();
    let wasNextCalled = false;

    requireBearerToken(req, res, () => {
        wasNextCalled = true;
    });

    assert.equal(wasNextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'Forbidden: Invalid API token' });
});

test('requireBearerToken allows request with valid bearer token', () => {
    const req = { headers: { authorization: 'Bearer api-secret' } };
    const res = createMockRes();
    let wasNextCalled = false;

    requireBearerToken(req, res, () => {
        wasNextCalled = true;
    });

    assert.equal(wasNextCalled, true);
});
