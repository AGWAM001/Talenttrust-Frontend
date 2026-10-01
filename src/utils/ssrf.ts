import { URL } from 'url';

/**
 * Environments that may opt into private-host access via SSRF_ALLOW_PRIVATE_HOSTS.
 * Any other NODE_ENV value (including unset / misspelled) is treated as unsafe -
 * the bypass flag is ignored and private hosts are blocked.
 */
const SSRF_BYPASS_ALLOWED_ENVS = new Set(['development', 'test', 'staging']);

const PRIVATE_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
];

/**
 * Strips IPv6 literal decoration so a bare address remains:
 * - a leading `[` and/or trailing `]` (even when unmatched, e.g. `[fd00::`)
 * - a scope/zone identifier (`%eth0`)
 */
function stripIpv6Wrapper(host: string): string {
  let h = host.toLowerCase().trim();
  if (h.startsWith('[')) {
    h = h.slice(1);
  }
  if (h.endsWith(']')) {
    h = h.slice(0, -1);
  }
  const zoneIdx = h.indexOf('%');
  if (zoneIdx !== -1) {
    h = h.slice(0, zoneIdx);
  }
  return h;
}

/**
 * Decodes the compressed-hex form of an IPv4-mapped IPv6 suffix, e.g. the
 * `7f00:1` in `::ffff:7f00:1` (which is 127.0.0.1). Returns null when the input
 * is not exactly two hex groups.
 */
function parseHexMappedIpv4(mapped: string): [number, number, number, number] | null {
  const groups = mapped.split(':').filter((g) => g.length > 0);
  if (groups.length !== 2) return null;
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  const hi = parseInt(groups[0], 16);
  const lo = parseInt(groups[1], 16);
  return [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
}

function parseIpv4Like(host: string): [number, number, number, number] | null {
  let normalized = stripIpv6Wrapper(host);

  // Strip IPv4-mapped IPv6 prefix
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    if (!mapped.includes('.')) {
      const octets = parseHexMappedIpv4(mapped);
      if (octets) return octets;
    }
    normalized = mapped;
  } else if (normalized.startsWith('0000:0000:0000:0000:0000:ffff:')) {
    normalized = normalized.slice('0000:0000:0000:0000:0000:ffff:'.length);
  }

  // Try integer representation (e.g., 2130706433 -> 127.0.0.1)
  const asInt = Number(normalized);
  if (Number.isFinite(asInt) && Number.isInteger(asInt) && asInt >= 0 && asInt <= 0xffffffff) {
    return [
      (asInt >> 24) & 0xff,
      (asInt >> 16) & 0xff,
      (asInt >> 8) & 0xff,
      asInt & 0xff,
    ];
  }

  // Try dotted notation, handling octal/hex
  const parts = normalized.split('.');
  if (parts.length === 4) {
    const octets = parts.map(part => {
      if (part.startsWith('0x') || part.startsWith('0X')) {
        return parseInt(part, 16);
      }
      if (part.startsWith('0') && part.length > 1) {
        return parseInt(part, 8);
      }
      return parseInt(part, 10);
    });
    if (octets.every(n => Number.isFinite(n) && n >= 0 && n <= 255)) {
      return octets as [number, number, number, number];
    }
  }

  return null;
}

/**
 * Checks if an IPv6 host is private
 */
function isPrivateIpv6(host: string): boolean {
  const noBrackets = stripIpv6Wrapper(host);

  if (noBrackets === '::1' || noBrackets === '0000:0000:0000:0000:0000:0000:0000:0001') {
    return true;
  }

  if (noBrackets.startsWith('fc') || noBrackets.startsWith('fd')) {
    return true;
  }

  if (noBrackets.startsWith('fe8') || noBrackets.startsWith('fe9') ||
      noBrackets.startsWith('fea') || noBrackets.startsWith('feb')) {
    return true;
  }

  return false;
}

/**
 * Checks if an IPv4 octet tuple is private
 */
function isPrivateIpv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;

  // 127.0.0.0/8
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local / metadata)
  if (a === 169 && b === 254) return true;

  return false;
}

export function isPrivateHost(host: string): boolean {
  const normalizedHost = host.toLowerCase().trim();

  if (PRIVATE_HOSTNAMES.includes(normalizedHost)) {
    return true;
  }

  if (isPrivateIpv6(normalizedHost)) {
    return true;
  }

  const ipv4 = parseIpv4Like(normalizedHost);
  if (ipv4 && isPrivateIpv4(ipv4)) {
    return true;
  }

  return false;
}

function isSsrfBypassEnvAllowed(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    return false;
  }
  return SSRF_BYPASS_ALLOWED_ENVS.has(nodeEnv);
}

export function isSafeUrl(urlString: string): boolean {
  const allowPrivateHosts = process.env.SSRF_ALLOW_PRIVATE_HOSTS === 'true';

  if (allowPrivateHosts && isSsrfBypassEnvAllowed()) {
    return true;
  }

  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const host = url.hostname;

    if (!host) {
      return false;
    }

    return !isPrivateHost(host);
  } catch (_error) {
    return false;
  }
}
