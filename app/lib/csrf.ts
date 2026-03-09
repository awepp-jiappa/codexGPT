import crypto from 'crypto';

function signValue(value: string) {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET || 'dev-secret').update(value).digest('hex');
}

export function issueCsrfToken() {
  const nonce = crypto.randomBytes(24).toString('hex');
  return `${nonce}.${signValue(nonce)}`;
}

function verifyIssuedCsrfToken(raw: string | null) {
  if (!raw) return false;
  const [nonce, signature] = raw.split('.');
  if (!nonce || !signature) return false;
  return signValue(nonce) === signature;
}

export async function verifyCsrfToken(req: Request) {
  const headerToken = req.headers.get('x-csrf-token');
  const contentType = req.headers.get('content-type') || '';
  if (verifyIssuedCsrfToken(headerToken)) return true;
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.clone().formData().catch(() => null);
    const bodyToken = form?.get('csrfToken');
    return typeof bodyToken === 'string' && verifyIssuedCsrfToken(bodyToken);
  }
  return false;
}
