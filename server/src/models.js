import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const ownerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true });

const houseSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, unique: true },
  name: { type: String, default: '' }, photos: [{ type: String }],
  location: { type: String, default: '' },
  category: { type: String, enum: ['Male','Female','Mixed'], default: 'Mixed' },
  contact: { type: String, default: '' }, description: { type: String, default: '' }
}, { timestamps: true });

const roomSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
  roomNumber: { type: String, required: true }, roomType: { type: String, default: 'Standard' },
  price: { type: Number, required: true, min: 0 }, capacity: { type: Number, required: true, min: 1 },
  occupied: { type: Number, default: 0, min: 0 }, description: { type: String, default: '' }
}, { timestamps: true });

const studentSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
  name: { type: String, required: true }, contact: String, email: String,
  roomId: { type: Schema.Types.ObjectId, ref: 'Room' }, moveInDate: Date
}, { timestamps: true });

const paymentSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' }, studentName: { type: String, required: true },
  roomNumber: String, description: { type: String, default: 'Monthly Rent' },
  amount: { type: Number, required: true, min: 0 }, balance: { type: Number, default: 0, min: 0 },
  method: { type: String, default: 'Cash' }, receiptNumber: { type: String, unique: true },
  paidAt: { type: Date, default: Date.now }
}, { timestamps: true });

const reservationSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
  applicantName: { type: String, required: true }, contact: { type: String, required: true },
  email: String, roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
  preferredRoom: String, moveInDate: Date, message: String,
  status: { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' }
}, { timestamps: true });

export const Owner = model('Owner', ownerSchema);
export const House = model('House', houseSchema);
export const Room = model('Room', roomSchema);
export const Student = model('Student', studentSchema);
export const Payment = model('Payment', paymentSchema);
export const Reservation = model('Reservation', reservationSchema);
