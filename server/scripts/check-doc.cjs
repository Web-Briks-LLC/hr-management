const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const ex = await mongoose.connection.collection('expenses').findOne({ _id: new mongoose.Types.ObjectId('69464706ff100c4d40b733e5') });
  console.log("=== EXPENSE DOC ===");
  console.log(JSON.stringify(ex, null, 2));

  // Also let's check one transaction
  const tx = await mongoose.connection.collection('transactions').findOne({ sourceId: '69464706ff100c4d40b733e5' });
  console.log("=== TRANSACTION DOC ===");
  console.log(JSON.stringify(tx, null, 2));

  process.exit(0);
});
