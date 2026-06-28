import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { signJwtToken } from '../lib/auth';

export async function loginUser(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new Error('Invalid username or password');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid username or password');
  }

  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const token = await signJwtToken(payload);
  return {
    user: payload,
    token,
  };
}

export async function signupUser(username, password, role = 'USER', secretKey) {
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    throw new Error('Username already taken');
  }

  // Role validation
  if (role === 'ADMIN') {
    if (secretKey !== process.env.ADMIN_SECRET) {
      throw new Error('Invalid secret phrase for ADMIN role');
    }
  } else if (role === 'MANAGER') {
    if (secretKey !== process.env.MANAGER_SECRET) {
      throw new Error('Invalid secret phrase for MANAGER role');
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: { username, passwordHash, role }
  });

  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const token = await signJwtToken(payload);
  return {
    user: payload,
    token,
  };
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  if (!userId) throw new Error('Authentication context lost. Please log in again.');
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`[Security] Password change failed. User not found for ID: ${userId}`);
    throw new Error('User identity could not be verified. Please log in again.');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new Error('Incorrect current password');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  return { success: true };
}
