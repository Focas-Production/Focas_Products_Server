import mongoose from 'mongoose';
import bcrypt from 'bcrypt';


const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'home' },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
}, { _id: false });


const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  phoneNumber: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  city: { type: String },
  caLevel: { type: String, enum: ['Foundation', 'Intermediate', 'Final'], default: 'Foundation' },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  addresses: [addressSchema],
  lastLoginAt: { type: Date },
}, { timestamps: true });


// Async pre-save - do not use next()
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});


userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


export default mongoose.model('User', userSchema);
