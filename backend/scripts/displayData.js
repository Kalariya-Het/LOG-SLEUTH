require('dotenv').config();
const mongoose = require('mongoose');

async function displayData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB Atlas');
    console.log('📊 Database: log-sleuth');
    console.log('============================================================');
    
    // Display Users
    console.log('\n👥 USERS COLLECTION:');
    console.log('----------------------------------------');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    users.forEach((user, index) => {
      console.log((index + 1) + '. ' + user.firstName + ' ' + user.lastName);
      console.log('   Email: ' + user.email);
      console.log('   Role: ' + user.role);
      console.log('   Verified: ' + user.isEmailVerified);
      console.log('   Created: ' + user.createdAt);
      console.log('');
    });
    
    // Display History Entries
    console.log('\n📋 LOG ANALYSIS HISTORY:');
    console.log('----------------------------------------');
    const histories = await mongoose.connection.db.collection('historyentries').find({}).toArray();
    histories.forEach((history, index) => {
      console.log((index + 1) + '. ' + history.fileName);
      console.log('   Size: ' + (history.fileSize / 1024).toFixed(1) + ' KB');
      console.log('   Risk Level: ' + history.riskLevel.toUpperCase());
      console.log('   Analysis Type: ' + history.analysisType);
      console.log('   Summary: ' + history.summary);
      console.log('   Security Threats: ' + history.securityThreats.length);
      console.log('   Operational Issues: ' + history.operationalIssues.length);
      console.log('   Created: ' + history.createdAt);
      console.log('');
    });
    
    console.log('============================================================');
    console.log('📈 Total Users: ' + users.length);
    console.log('📈 Total Analyses: ' + histories.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

displayData();
