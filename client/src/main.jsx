import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('cbh_token');
async function request(path, options={}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
function App() {
  const [page,setPage] = useState('browse');
  const [owner,setOwner] = useState(null);
  const [authMode,setAuthMode] = useState('login');
  const [form,setForm] = useState({});
  const [error,setError] = useState('');
  const [houses,setHouses] = useState([]);
  const [search,setSearch] = useState({q:'',location:'',category:''});
  const [house,setHouse] = useState(null);
  const [profile,setProfile] = useState({});
  const [rooms,setRooms] = useState([]);
  const [students,setStudents] = useState([]);
  const [payments,setPayments] = useState([]);
  const [reservations,setReservations] = useState([]);
  const [dashboard,setDashboard] = useState({});
  const [receipt,setReceipt] = useState(null);
  const [roomForm,setRoomForm] = useState({roomNumber:'',roomType:'Standard',price:'',capacity:'1',occupied:'0'});
  const [studentForm,setStudentForm] = useState({name:'',contact:'',email:''});
  const [paymentForm,setPaymentForm] = useState({studentName:'',roomNumber:'',description:'Monthly Rent',amount:'',balance:'0',method:'Cash'});
  const [reservationForm,setReservationForm] = useState({applicantName:'',contact:'',email:'',preferredRoom:'',moveInDate:'',message:''});

  const loadPublic = async () => { try { setHouses(await request('/public/houses')); } catch(e){setError(e.message);} };
  const loadOwner = async () => {
    const [p,r,s,pay,rv,d] = await Promise.all([
      request('/house'),request('/rooms'),request('/students'),request('/payments'),request('/reservations'),request('/dashboard')
    ]);
    setProfile(p || {}); setRooms(r); setStudents(s); setPayments(pay); setReservations(rv); setDashboard(d);
  };
  useEffect(()=>{ loadPublic(); if(getToken()) request('/auth/me').then(setOwner).then(loadOwner).catch(()=>localStorage.removeItem('cbh_token')); },[]);
  const submitAuth = async e => {
    e.preventDefault(); setError('');
    try {
      const data = await request(`/auth/${authMode}`,{method:'POST',body:JSON.stringify(form)});
      localStorage.setItem('cbh_token',data.token); setOwner(data.owner); setPage('dashboard'); await loadOwner();
    } catch(e){setError(e.message);}
  };
  const logout = () => { localStorage.removeItem('cbh_token'); setOwner(null); setPage('browse'); setError(''); };
  const saveProfile = async e => { e.preventDefault(); try { await request('/house',{method:'PUT',body:JSON.stringify(profile)}); alert('Profile saved.'); await loadOwner(); await loadPublic(); } catch(e){setError(e.message);} };
  const uploadPhotos = async e => { const fd=new FormData(); [...e.target.files].forEach(f=>fd.append('photos',f)); try { const p=await request('/house/photos',{method:'POST',body:fd}); setProfile(p); await loadPublic(); } catch(e){setError(e.message);} };
  const addRoom = async e => { e.preventDefault(); try { await request('/rooms',{method:'POST',body:JSON.stringify({...roomForm,price:Number(roomForm.price),capacity:Number(roomForm.capacity),occupied:Number(roomForm.occupied)})}); setRoomForm({roomNumber:'',roomType:'Standard',price:'',capacity:'1',occupied:'0'}); await loadOwner(); } catch(e){setError(e.message);} };
  const addStudent = async e => { e.preventDefault(); try { await request('/students',{method:'POST',body:JSON.stringify(studentForm)}); setStudentForm({name:'',contact:'',email:''}); await loadOwner(); } catch(e){setError(e.message);} };
  const addPayment = async e => { e.preventDefault(); try { const p=await request('/payments',{method:'POST',body:JSON.stringify({...paymentForm,amount:Number(paymentForm.amount),balance:Number(paymentForm.balance)})}); setReceipt(p); setPaymentForm({studentName:'',roomNumber:'',description:'Monthly Rent',amount:'',balance:'0',method:'Cash'}); await loadOwner(); } catch(e){setError(e.message);} };
  const del = async (type,id) => { if(!confirm('Delete this record?')) return; try { await request(`/${type}/${id}`,{method:'DELETE'}); await loadOwner(); } catch(e){setError(e.message);} };
  const openHouse = async id => { try { setHouse(await request(`/public/houses/${id}`)); setPage('details'); } catch(e){setError(e.message);} };
  const sendReservation = async e => { e.preventDefault(); try { await request(`/public/houses/${house._id}/reservations`,{method:'POST',body:JSON.stringify(reservationForm)}); alert('Reservation request sent.'); setReservationForm({applicantName:'',contact:'',email:'',preferredRoom:'',moveInDate:'',message:''}); } catch(e){setError(e.message);} };
  const filtered = houses.filter(h => (!search.q || h.name?.toLowerCase().includes(search.q.toLowerCase())) && (!search.location || h.location?.toLowerCase().includes(search.location.toLowerCase())) && (!search.category || h.category===search.category));
  const img = p => p?.length ? `http://localhost:5000${p[0]}` : '';
  const money = n => `₱${Number(n||0).toLocaleString('en-PH')}`;
  const nav = ['Home','Room','Payment','Students','Account','Reservations'];
  const [section,setSection] = useState('Home');

  return <div className="app">
    <header><div className="brand" onClick={()=>setPage('browse')}>🏠 Cabalian Boarding House</div><nav><button onClick={()=>setPage('browse')}>Find Boarding House</button>{owner ? <><button onClick={()=>setPage('dashboard')}>Owner Dashboard</button><button className="outline" onClick={logout}>Logout</button></> : <button onClick={()=>{setPage('auth');setAuthMode('login')}}>Owner Login</button>}</nav></header>
    {error && <div className="error" onClick={()=>setError('')}>{error}　×</div>}
    {page==='browse' && <main><section className="hero"><p className="eyebrow">CABALIAN • BOARDING HOUSE DIRECTORY</p><h1>Find a place<br/>you can call home.</h1><p>Search boarding houses by name, location, and category.</p></section>
      <div className="filters"><input placeholder="Boarding house name" value={search.q} onChange={e=>setSearch({...search,q:e.target.value})}/><input placeholder="Location" value={search.location} onChange={e=>setSearch({...search,location:e.target.value})}/><select value={search.category} onChange={e=>setSearch({...search,category:e.target.value})}><option value="">All categories</option><option>Male</option><option>Female</option><option>Mixed</option></select><button onClick={loadPublic}>Refresh</button></div>
      <h2>Available Boarding Houses</h2><div className="grid">{filtered.map(h=><article className="card" key={h._id}>{h.photos?.length ? <img className="cover" src={img(h.photos)} /> : <div className="placeholder">🏠</div>}<div className="cardbody"><span className="badge">{h.category}</span><h3>{h.name || 'Boarding House'}</h3><p>📍 {h.location || 'Location not provided'}</p><p>{h.availableBeds} available beds</p><b>{h.minPrice ? `${money(h.minPrice)} – ${money(h.maxPrice)} / month` : 'Price not set'}</b><button onClick={()=>openHouse(h._id)}>View Details</button></div></article>)}</div>{!filtered.length && <p className="muted">No boarding houses found. Try another search.</p>}</main>}
    {page==='details' && house && <main><button className="light" onClick={()=>setPage('browse')}>← Back to listings</button><div className="detail"><div>{house.photos?.length ? house.photos.map(p=><img className="detailimg" key={p} src={`http://localhost:5000${p}`}/>) : <div className="placeholder big">🏠</div>}</div><div><span className="badge">{house.category}</span><h1>{house.name}</h1><p>📍 {house.location}</p><p>☎ {house.contact}</p><p>{house.description}</p><h2>Rooms</h2>{house.rooms?.map(r=><p key={r._id}>{r.roomNumber} · {r.roomType} · {money(r.price)}/month · {r.capacity-r.occupied} available beds</p>)}</div></div><section className="panel"><h2>Send Reservation Request</h2><form className="formgrid" onSubmit={sendReservation}><input required placeholder="Your full name" value={reservationForm.applicantName} onChange={e=>setReservationForm({...reservationForm,applicantName:e.target.value})}/><input required placeholder="Contact number" value={reservationForm.contact} onChange={e=>setReservationForm({...reservationForm,contact:e.target.value})}/><input placeholder="Email address" value={reservationForm.email} onChange={e=>setReservationForm({...reservationForm,email:e.target.value})}/><input placeholder="Preferred room" value={reservationForm.preferredRoom} onChange={e=>setReservationForm({...reservationForm,preferredRoom:e.target.value})}/><input type="date" value={reservationForm.moveInDate} onChange={e=>setReservationForm({...reservationForm,moveInDate:e.target.value})}/><textarea placeholder="Message" value={reservationForm.message} onChange={e=>setReservationForm({...reservationForm,message:e.target.value})}/><button>Send Request</button></form></section></main>}
    {page==='auth' && <main className="authwrap"><section className="panel auth"><h1>Owner {authMode==='login'?'Login':'Registration'}</h1><form onSubmit={submitAuth}>{authMode==='register' && <input required placeholder="Full name" onChange={e=>setForm({...form,name:e.target.value})}/>}<input required type="email" placeholder="Email" onChange={e=>setForm({...form,email:e.target.value})}/><input required type="password" placeholder="Password (at least 6 characters)" onChange={e=>setForm({...form,password:e.target.value})}/><button>{authMode==='login'?'Login':'Create Account'}</button></form><p>{authMode==='login'?'No account yet?':'Already registered?'} <a onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setForm({});}}> {authMode==='login'?'Register':'Login'}</a></p></section></main>}
    {page==='dashboard' && owner && <main className="owner"><aside><h3>Owner Panel</h3><p>{owner.name}</p>{nav.map(n=><button className={section===n?'active':''} key={n} onClick={()=>setSection(n)}>{n}</button>)}<button onClick={logout}>Logout</button></aside><div className="content">
      {section==='Home' && <><h1>Dashboard</h1>{profile?.photos?.length>0 && <img className="dashphoto" src={img(profile.photos)}/>}<h2>{profile?.name || 'Your Boarding House'}</h2><p>📍 {profile?.location || 'Set your location in Account'}</p><div className="stats">{[['Total Rooms',dashboard.totalRooms],['Available Beds',dashboard.availableBeds],['Occupied Beds',dashboard.occupiedBeds],['Total Students',dashboard.totalStudents],['Monthly Income',money(dashboard.monthlyIncome)]].map(([k,v])=><div className="stat" key={k}><small>{k}</small><strong>{v??0}</strong></div>)}</div></>}
      {section==='Account' && <><h1>Boarding House Account</h1><form className="stack" onSubmit={saveProfile}><label>Boarding House Name<input value={profile.name||''} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label>Location / Complete Address<input value={profile.location||''} onChange={e=>setProfile({...profile,location:e.target.value})}/></label><label>Category<select value={profile.category||'Mixed'} onChange={e=>setProfile({...profile,category:e.target.value})}><option>Male</option><option>Female</option><option>Mixed</option></select></label><label>Contact Number<input value={profile.contact||''} onChange={e=>setProfile({...profile,contact:e.target.value})}/></label><label>Description<textarea value={profile.description||''} onChange={e=>setProfile({...profile,description:e.target.value})}/></label><button>Save Changes</button></form><label className="upload">Upload Boarding House Photos<input type="file" accept="image/*" multiple onChange={uploadPhotos}/></label>{profile.photos?.map(p=><img className="thumb" key={p} src={`http://localhost:5000${p}`}/>)}</>}
      {section==='Room' && <><h1>Room Management</h1><form className="formgrid" onSubmit={addRoom}><input required placeholder="Room number" value={roomForm.roomNumber} onChange={e=>setRoomForm({...roomForm,roomNumber:e.target.value})}/><input placeholder="Room type" value={roomForm.roomType} onChange={e=>setRoomForm({...roomForm,roomType:e.target.value})}/><input required type="number" min="0" placeholder="Monthly price" value={roomForm.price} onChange={e=>setRoomForm({...roomForm,price:e.target.value})}/><input required type="number" min="1" placeholder="Capacity" value={roomForm.capacity} onChange={e=>setRoomForm({...roomForm,capacity:e.target.value})}/><input type="number" min="0" placeholder="Occupied beds" value={roomForm.occupied} onChange={e=>setRoomForm({...roomForm,occupied:e.target.value})}/><button>Add Room</button></form><Rows rows={rooms} fields={['roomNumber','roomType','price','capacity','occupied']} onDelete={id=>del('rooms',id)}/></>}
      {section==='Students' && <><h1>Students Management</h1><form className="formgrid" onSubmit={addStudent}><input required placeholder="Student name" value={studentForm.name} onChange={e=>setStudentForm({...studentForm,name:e.target.value})}/><input placeholder="Contact" value={studentForm.contact} onChange={e=>setStudentForm({...studentForm,contact:e.target.value})}/><input placeholder="Email" value={studentForm.email} onChange={e=>setStudentForm({...studentForm,email:e.target.value})}/><button>Add Student</button></form><Rows rows={students} fields={['name','contact','email']} onDelete={id=>del('students',id)}/></>}
      {section==='Payment' && <><h1>Payment Management</h1><form className="formgrid" onSubmit={addPayment}><input required placeholder="Student name" value={paymentForm.studentName} onChange={e=>setPaymentForm({...paymentForm,studentName:e.target.value})}/><input placeholder="Room number" value={paymentForm.roomNumber} onChange={e=>setPaymentForm({...paymentForm,roomNumber:e.target.value})}/><input placeholder="Description" value={paymentForm.description} onChange={e=>setPaymentForm({...paymentForm,description:e.target.value})}/><input required type="number" min="0" placeholder="Amount paid" value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:e.target.value})}/><input type="number" min="0" placeholder="Remaining balance" value={paymentForm.balance} onChange={e=>setPaymentForm({...paymentForm,balance:e.target.value})}/><select value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm,method:e.target.value})}><option>Cash</option><option>GCash</option><option>Bank Transfer</option></select><button>Record Payment & Generate Receipt</button></form><Rows rows={payments} fields={['receiptNumber','studentName','description','amount','balance','method']} onDelete={id=>del('payments',id)} onReceipt={setReceipt}/></>}
      {section==='Reservations' && <><h1>Reservation Requests</h1><Rows rows={reservations} fields={['applicantName','contact','email','preferredRoom','status']} onDelete={id=>del('reservations',id)}/></>}
    </div></main>}
    {receipt && <div className="modal"><div className="receipt" id="receipt"><h2>{profile.name || 'Boarding House'}</h2><p>{profile.location}</p><hr/><h3>PAYMENT RECEIPT</h3><p>Receipt No: {receipt.receiptNumber}</p><p>Date: {new Date(receipt.paidAt).toLocaleString()}</p><p>Received from: {receipt.studentName}</p><p>Room: {receipt.roomNumber || '—'}</p><p>Description: {receipt.description}</p><p>Payment method: {receipt.method}</p><h2>Amount Paid: {money(receipt.amount)}</h2><p>Remaining Balance: {money(receipt.balance)}</p><p>Received by: {owner?.name || 'Owner'}</p><button onClick={()=>window.print()}>Print / Save as PDF</button><button className="light" onClick={()=>setReceipt(null)}>Close</button></div></div>}
    <footer>Cabalian Boarding House Management System</footer>
  </div>;
}
function Rows({rows,fields,onDelete,onReceipt}) { return <div className="rows">{rows.map(r=><div className="row" key={r._id}><div>{fields.map(f=><span key={f}><b>{f}:</b> {r[f] ?? '—'}　</span>)}</div><div className="rowactions">{onReceipt && <button className="light" onClick={()=>onReceipt(r)}>Receipt</button>}<button className="danger" onClick={()=>onDelete(r._id)}>Delete</button></div></div>)}</div>; }
createRoot(document.getElementById('root')).render(<App/>);
