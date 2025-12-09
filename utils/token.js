import jwt from 'jsonwebtoken';


export const generateToken = (userOrId) => {
  const payload = {
    id: typeof userOrId === 'object' ? userOrId._id?.toString() : userOrId,
    role: typeof userOrId === 'object' ? userOrId.role : 'user',
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'SECRET123', { expiresIn: '30d' });
};
