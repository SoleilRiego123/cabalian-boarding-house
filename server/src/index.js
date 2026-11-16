import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Owner, House, Room, Student, Payment, Reservation } from './models.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please log in.' });
  try { req.ownerId = jwt.verify(token, process.env.JWT_SECRET).id; next(); }
  catch { return res.status(401).json({ message: 'Session expired. Please log in again.' }); }
}
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

app.post('/api/auth/register', asyncRoute(async (req,res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Enter your name, valid email, and password (at least 6 characters).' });
  if (await Owner.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email is already registered.' });
  const owner = await Owner.create({ name, email, password: await bcrypt.hash(password, 12) });
  const token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, owner: { id: owner._id, name: owner.name, email: owner.email } });
}));
app.post('/api/auth/login', asyncRoute(async (req,res) => {
  const owner = await Owner.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!owner || !(await bcrypt.compare(req.body.password || '', owner.password))) return res.status(401).json({ message: 'Incorrect email or password.' });
  const token = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, owner: { id: owner._id, name: owner.name, email: owner.email } });
}));
app.get('/api/auth/me', auth, asyncRoute(async (req,res) => {
  const owner = await Owner.findById(req.ownerId).select('-password');
  if (!owner) return res.status(404).json({ message: 'Owner not found.' });
  res.json(owner);
}));

app.get('/api/public/houses', asyncRoute(async (req,res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.location) filter.location = { $regex: req.query.location, $options: 'i' };
  if (req.query.q) filter.name = { $regex: req.query.q, $options: 'i' };
  const houses = await House.find(filter).lean();
  const results = await Promise.all(houses.map(async h => {
    const rooms = await Room.find({ ownerId: h.ownerId }).lean();
    const beds = rooms.reduce((s,r) => s + Math.max(0, r.capacity-r.occupied), 0);
    const prices = rooms.map(r => r.price);
    return { ...h, availableBeds: beds, minPrice: prices.length ? Math.min(...prices) : 0, maxPrice: prices.length ? Math.max(...prices) : 0 };
  }));
  res.json(results);
}));
app.get('/api/public/houses/:id', asyncRoute(async (req,res) => {
  const house = await House.findById(req.params.id).lean();
  if (!house) return res.status(404).json({ message: 'Boarding house not found.' });
  const rooms = await Room.find({ ownerId: house.ownerId }).lean();
  res.json({ ...house, rooms });
}));
app.post('/api/public/houses/:id/reservations', asyncRoute(async (req,res) => {
  const house = await House.findById(req.params.id);
  if (!house) return res.status(404).json({ message: 'Boarding house not found.' });
  const { applicantName, contact, email, preferredRoom, moveInDate, message } = req.body;
  if (!applicantName || !contact) return res.status(400).json({ message: 'Name and contact number are required.' });
  const reservation = await Reservation.create({ ownerId: house.ownerId, applicantName, contact, email, preferredRoom, moveInDate, message });
  res.status(201).json(reservation);
}));

app.get('/api/house', auth, asyncRoute(async (req,res) => res.json(await House.findOne({ ownerId: req.ownerId }))));
app.put('/api/house', auth, asyncRoute(async (req,res) => {
  const data = (({ name, location, category, contact, description }) => ({ name, location, category, contact, description }))(req.body);
  const house = await House.findOneAndUpdate({ ownerId: req.ownerId }, { $set: data }, { new: true, upsert: true, runValidators: true });
  res.json(house);
}));
app.post('/api/house/photos', auth, upload.array('photos', 8), asyncRoute(async (req,res) => {
  const urls = (req.files || []).map(f => `/uploads/${f.filename}`);
  const house = await House.findOneAndUpdate({ ownerId: req.ownerId }, { $push: { photos: { $each: urls } } }, { new: true, upsert: true });
  res.json(house);
}));

for (const [route, Model] of [['rooms',Room],['students',Student],['payments',Payment],['reservations',Reservation]]) {
  app.get(`/api/${route}`, auth, asyncRoute(async (req,res) => {
    const rows = await Model.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    res.json(rows);
  }));
  app.post(`/api/${route}`, auth, asyncRoute(async (req,res) => {
    const data = { ...req.body, ownerId: req.ownerId };
    if (route === 'payments') data.receiptNumber = `CBH-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const row = await Model.create(data);
    res.status(201).json(row);
  }));
  app.put(`/api/${route}/:id`, auth, asyncRoute(async (req,res) => {
    const row = await Model.findOneAndUpdate({ _id: req.params.id, ownerId: req.ownerId }, { $set: req.body }, { new: true, runValidators: true });
    if (!row) return res.status(404).json({ message: 'Record not found.' });
    res.json(row);
  }));
  app.delete(`/api/${route}/:id`, auth, asyncRoute(async (req,res) => {
    const row = await Model.findOneAndDelete({ _id: req.params.id, ownerId: req.ownerId });
    if (!row) return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Deleted successfully.' });
  }));
}

app.get('/api/dashboard', auth, asyncRoute(async (req,res) => {
  const [rooms, students, payments, house] = await Promise.all([
    Room.find({ ownerId: req.ownerId }), Student.countDocuments({ ownerId: req.ownerId }),
    Payment.find({ ownerId: req.ownerId }), House.findOne({ ownerId: req.ownerId })
  ]);
  const totalRooms = rooms.length;
  const availableBeds = rooms.reduce((s,r) => s + Math.max(0,r.capacity-r.occupied),0);
  const occupiedBeds = rooms.reduce((s,r) => s + r.occupied,0);
  const monthlyIncome = payments.filter(p => new Date(p.paidAt).getMonth() === new Date().getMonth() && new Date(p.paidAt).getFullYear() === new Date().getFullYear()).reduce((s,p) => s+p.amount,0);
  res.json({ totalRooms, availableBeds, occupiedBeds, totalStudents: students, monthlyIncome, house });
}));

app.use((err,req,res,next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error.' });
});
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cabalian_boarding_house')
  .then(() => app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
