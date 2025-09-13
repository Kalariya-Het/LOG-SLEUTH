// MongoDB Data Viewer Script
// Run with: node scripts/viewData.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'log-sleuth';

async function viewData() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db(dbName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // View users
    console.log('\n👥 Users:');
    const users = await db.collection('users').find({}).limit(5).toArray();
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Created: ${user.createdAt}`);
    });
    
    // View history entries
    console.log('\n📊 Recent Log Analyses:');
    const histories = await db.collection('historyentries').find({}).limit(3).toArray();
    histories.forEach(history => {
      console.log(`  - ${history.fileName} - Risk: ${history.riskLevel} - ${history.createdAt}`);
    });
    
    // View sessions
    console.log('\n🔐 Active Sessions:');
    const sessions = await db.collection('sessions').find({ isActive: true }).limit(3).toArray();
    console.log(`  - ${sessions.length} active sessions`);
    
    // View audit logs
    console.log('\n📝 Recent Audit Logs:');
    const audits = await db.collection('auditlogs').find({}).limit(3).toArray();
    audits.forEach(audit => {
      console.log(`  - ${audit.action} by ${audit.userEmail} - ${audit.timestamp}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

viewData();
