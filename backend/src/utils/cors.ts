type RawOriginsInput = string | string[] | undefined;

function addOrigins(target: Set<string>, raw: string | undefined): void {
  if (typeof raw !== 'string' || raw.length === 0) {
    return;
  }

  const entries = raw.split(',');
  for (let index = 0; index < entries.length; index += 1) {
    const segment = entries[index].trim();
    if (!segment) {
      continue;
    }

    if (segment === '*') {
      target.add('*');
      continue;
    }

    let withoutTrailingSlash = segment;
    while (withoutTrailingSlash.endsWith('/')) {
      withoutTrailingSlash = withoutTrailingSlash.slice(0, -1);
    }

    target.add(withoutTrailingSlash.toLowerCase());
  }
}

export function parseAllowedOrigins(
  raw: RawOriginsInput,
  defaultOrigins: string[] = ['http://localhost:5173'],
): string[] {
  const normalized = new Set<string>();

  if (Array.isArray(raw)) {
    for (let index = 0; index < raw.length; index += 1) {
      addOrigins(normalized, raw[index]);
    }
  } else {
    addOrigins(normalized, raw);
  }

  if (normalized.size === 0) {
    for (let index = 0; index < defaultOrigins.length; index += 1) {
      addOrigins(normalized, defaultOrigins[index]);
    }
  }

  return Array.from(normalized);
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    return false;
  }

  for (let index = 0; index < allowedOrigins.length; index += 1) {
    if (allowedOrigins[index] === '*') {
      return true;
    }
  }

  let candidate = origin.trim();
  if (!candidate) {
    return false;
  }

  while (candidate.endsWith('/')) {
    candidate = candidate.slice(0, -1);
  }

  const normalizedCandidate = candidate.toLowerCase();

  for (let index = 0; index < allowedOrigins.length; index += 1) {
    if (allowedOrigins[index] === normalizedCandidate) {
      return true;
    }
  }

  return false;
}

export function buildConnectSrcDirectives(
  allowedOrigins: string[],
  additionalRaw?: string,
): string[] {
  const directives = new Set<string>();

  directives.add("'self'");
  directives.add('https:');
  directives.add('http:');
  directives.add('wss:');
  directives.add('ws:');

  for (let index = 0; index < allowedOrigins.length; index += 1) {
    directives.add(allowedOrigins[index]);
  }

  const additional = parseAllowedOrigins(additionalRaw, []);
  for (let index = 0; index < additional.length; index += 1) {
    directives.add(additional[index]);
  }

  const result: string[] = [];
  for (const value of directives) {
    result.push(value);
  }

  return result;
}
