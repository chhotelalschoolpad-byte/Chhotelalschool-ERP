import { cookies } from 'next/headers';
import { verifyJwtToken } from './auth';

export async function withAuth(req, allowedRoles = []) {
  const cookieStore = await cookies();
  const token = cookieStore.get('school_token')?.value;

  if (!token) {
    return { error: 'Unauthorized: No token provided', status: 401 };
  }

  const user = await verifyJwtToken(token);
  if (!user) {
    return { error: 'Unauthorized: Invalid or expired token', status: 401 };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { error: 'Forbidden: Insufficient permissions', status: 403 };
  }

  return { user };
}
