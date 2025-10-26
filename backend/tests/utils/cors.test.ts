import {
  parseAllowedOrigins,
  isOriginAllowed,
  buildConnectSrcDirectives,
} from '../../src/utils/cors';

describe('cors utils', () => {
  it('parses comma-separated origins with normalization', () => {
    const origins = parseAllowedOrigins('https://Drop.Toovy.Tech/, http://LOCALHOST:5173/');

    expect(origins).toEqual([
      'https://drop.toovy.tech',
      'http://localhost:5173',
    ]);
  });

  it('falls back to default origin when none provided', () => {
    const origins = parseAllowedOrigins(undefined);

    expect(origins).toEqual(['http://localhost:5173']);
  });

  it('merges multiple raw values when provided as an array', () => {
    const origins = parseAllowedOrigins([
      'https://drop.toovy.tech/',
      ' https://drop.lweurope.org ,https://EXAMPLE.com/',
    ]);

    expect(origins).toEqual([
      'https://drop.toovy.tech',
      'https://drop.lweurope.org',
      'https://example.com',
    ]);
  });

  it('allows listed origins and rejects others', () => {
    const origins = parseAllowedOrigins('https://drop.toovy.tech, http://localhost:5173');

    expect(isOriginAllowed('https://drop.toovy.tech', origins)).toBe(true);
    expect(isOriginAllowed('https://DROP.TOOVY.TECH/', origins)).toBe(true);
    expect(isOriginAllowed('https://example.com', origins)).toBe(false);
  });

  it('builds connect-src directives with additional sources', () => {
    const origins = parseAllowedOrigins('https://drop.toovy.tech');
    const directives = buildConnectSrcDirectives(
      origins,
      'wss://drop-api.toovy.tech, https://drop-api.toovy.tech',
    );

    expect(directives).toEqual(expect.arrayContaining([
      "'self'",
      'https:',
      'http:',
      'wss:',
      'ws:',
      'https://drop.toovy.tech',
      'wss://drop-api.toovy.tech',
      'https://drop-api.toovy.tech',
    ]));
  });
});
