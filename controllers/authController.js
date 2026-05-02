import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/token.js';

const sanitizeUser = (user) => {
if (!user) return null;
const plain = user.toObject ? user.toObject() : user;
delete plain.password;
return plain;
};

export const login = async (req, res) => {
try {
const { phoneNumber, password } = req.body;
if (!phoneNumber || !password)
return res.status(400).json({ success: false, message: 'phoneNumber and password required' });

const user = await User.findOne({ phoneNumber });
if (!user) return res.status(404).json({ success: false, message: 'User not found' });

const match = await bcrypt.compare(password, user.password);
if (!match) return res.status(400).json({ success: false, message: 'Wrong password' });

if (!user.is_verified)
return res.status(403).json({ success: false, message: 'User not verified' });

const token = generateToken(user);
return res.json({ success: true, message: 'Login successful', user: sanitizeUser(user), token });
} catch (error) {
return res.status(500).json({ success: false, message: error.message });
}
};


export const createSuperAdmin = async (req, res) => {
try {
const { name, email, phoneNumber, password, city, caLevel } = req.body;
if (!req.user || !['admin', 'superadmin'].includes(req.user.role))
return res.status(403).json({ success: false, message: 'Forbidden' });

const exists = await User.findOne({ $or: [{ phoneNumber }, { email }] });
if (exists) return res.status(400).json({ success: false, message: 'User already exists' });

const newUser = await User.create({
name,
email,
phoneNumber,
password,
city,
caLevel,
role: 'superadmin',
is_verified: true
});

return res.status(201).json({ success: true, message: 'Super admin created', user: sanitizeUser(newUser) });
} catch (error) {
return res.status(500).json({ success: false, message: error.message });
}
};


export const bootstrapSuperAdmin = async (req, res) => {
try {
const { setupKey, name, email, phoneNumber, password, city, caLevel } = req.body;
// console.log(typeof(process.env.SUPERADMIN_SETUP_KEY) + process.env.SUPERADMIN_SETUP_KEY)
// console.log(typeof(setupKey) + setupKey)
// console.log(setupKey === process.env.SUPERADMIN_SETUP_KEY)
if (!process.env.SUPERADMIN_SETUP_KEY)
return res.status(500).json({ success: false, message: 'Setup key missing in environment' });

const existing = await User.findOne({ role: 'superadmin' });
if (existing) return res.status(400).json({ success: false, message: 'Super admin already exists' });

if (!setupKey || setupKey !== process.env.SUPERADMIN_SETUP_KEY)
return res.status(403).json({ success: false, message: 'Invalid setup key' });

const user = await User.create({
name,
email,
phoneNumber,
password,
city,
caLevel,
role: 'superadmin',
is_verified: true
});

const token = generateToken(user);
return res.status(201).json({ success: true, message: 'Super admin bootstrapped', user: sanitizeUser(user), token });
} catch (error) {
return res.status(500).json({ success: false, message: error.message });
}
};


export const createAdmin = async (req, res) => {
try {
const { name, email, phoneNumber, password, city, caLevel } = req.body;
if (!req.user || req.user.role !== 'superadmin')
return res.status(403).json({ success: false, message: 'Only super admins can create admins' });

const exists = await User.findOne({ $or: [{ phoneNumber }, { email }] });
if (exists) return res.status(400).json({ success: false, message: 'User already exists' });

const newUser = await User.create({
name,
email,
phoneNumber,
password,
city,
caLevel,
role: 'admin',
is_verified: true
});

return res.status(201).json({ success: true, message: 'Admin created', user: sanitizeUser(newUser) });
} catch (error) {
return res.status(500).json({ success: false, message: error.message });
}
};