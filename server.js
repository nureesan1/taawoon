
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Firestore } = require('@google-cloud/firestore');

const app = express();

// ระบุ databaseId ให้ตรงกับที่คุณสร้างไว้ใน screenshot (taawoon)
const firestore = new Firestore({
  databaseId: 'taawoon'
});

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Collections
const MEMBERS = 'members';
const LEDGER = 'ledger';

/**
 * API Routes
 */

// 1. Get All Data
app.post('/api/getData', async (req, res) => {
  try {
    const membersSnap = await firestore.collection(MEMBERS).get();
    const ledgerSnap = await firestore.collection(LEDGER).orderBy('timestamp', 'desc').get();
    
    const members = [];
    membersSnap.forEach(doc => members.push({ id: doc.id, ...doc.data() }));
    
    const ledger = [];
    ledgerSnap.forEach(doc => ledger.push({ id: doc.id, ...doc.data() }));

    res.json({ status: 'success', members, ledger });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 2. Member Management
app.post('/api/addMember', async (req, res) => {
  try {
    const { member } = req.body.data;
    const docRef = await firestore.collection(MEMBERS).add({
      ...member,
      transactions: []
    });
    res.json({ status: 'success', id: docRef.id });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/updateMember', async (req, res) => {
  try {
    const { id, data } = req.body.data;
    await firestore.collection(MEMBERS).doc(id).update(data);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/deleteMember', async (req, res) => {
  try {
    const { id } = req.body.data;
    await firestore.collection(MEMBERS).doc(id).delete();
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 3. Transactions & Ledger
app.post('/api/addTransaction', async (req, res) => {
  try {
    const { transaction } = req.body.data;
    const mRef = firestore.collection(MEMBERS).doc(transaction.memberId);
    
    await firestore.runTransaction(async (t) => {
      const mDoc = await t.get(mRef);
      if (!mDoc.exists) throw new Error("Member not found");
      
      const mData = mDoc.data();
      const updates = {
        transactions: [...(mData.transactions || []), transaction],
        accumulatedShares: (mData.accumulatedShares || 0) + (transaction.shares || 0),
        savingsBalance: (mData.savingsBalance || 0) + (transaction.savings || 0),
        housingLoanBalance: Math.max(0, (mData.housingLoanBalance || 0) - (transaction.housing || 0)),
        landLoanBalance: Math.max(0, (mData.landLoanBalance || 0) - (transaction.land || 0)),
        generalLoanBalance: Math.max(0, (mData.generalLoanBalance || 0) - (transaction.generalLoan || 0))
      };
      t.update(mRef, updates);

      const lRef = firestore.collection(LEDGER).doc(`L-TX-${transaction.id}`);
      t.set(lRef, {
        date: transaction.date,
        type: 'income',
        category: 'รับชำระเงินสมาชิก',
        description: `รับจากสมาชิก ${mData.name}`,
        amount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        recordedBy: transaction.recordedBy,
        timestamp: transaction.timestamp
      });
    });
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/deleteTransaction', async (req, res) => {
  try {
    const { id, memberId } = req.body.data;
    const mRef = firestore.collection(MEMBERS).doc(memberId);
    
    await firestore.runTransaction(async (t) => {
      const mDoc = await t.get(mRef);
      if (!mDoc.exists) return;
      
      const mData = mDoc.data();
      const tx = mData.transactions.find(tx => tx.id === id);
      if (!tx) return;

      const updates = {
        transactions: mData.transactions.filter(tx => tx.id !== id),
        accumulatedShares: (mData.accumulatedShares || 0) - (tx.shares || 0),
        savingsBalance: (mData.savingsBalance || 0) - (tx.savings || 0),
        housingLoanBalance: (mData.housingLoanBalance || 0) + (tx.housing || 0),
        landLoanBalance: (mData.landLoanBalance || 0) + (tx.land || 0),
        generalLoanBalance: (mData.generalLoanBalance || 0) + (tx.generalLoan || 0)
      };
      t.update(mRef, updates);
      t.delete(firestore.collection(LEDGER).doc(`L-TX-${id}`));
    });
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/addLedgerItem', async (req, res) => {
  try {
    const { item } = req.body.data;
    await firestore.collection(LEDGER).doc(item.id).set(item);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/deleteLedgerItem', async (req, res) => {
  try {
    const { id } = req.body.data;
    await firestore.collection(LEDGER).doc(id).delete();
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Static Hosting
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server ready on port ${PORT}`));
