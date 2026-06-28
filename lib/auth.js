import { SignJWT, jwtVerify } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error('The environment variable JWT_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
};

export async function signJwtToken(payload) {
  const secret = getJwtSecretKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyJwtToken(token) {
  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}
