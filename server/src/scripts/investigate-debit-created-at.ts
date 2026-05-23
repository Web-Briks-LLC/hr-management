import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DebitModel from '../models/Debit.js';
import ExpenseModel from '../models/expense.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    const userCol = mongoose.connection.collection("user");

    // 1. Fetch the Debit Borrow document
    const debitId = "69f983b9e9bc712ab28da732";
    const debit = await DebitModel.findById(debitId).lean();
    
    // 2. Fetch the Salary Expense and Bonus Expense documents
    const salaryId = "6a0ec13baea13d82e0c6f2e6";
    const bonusId = "6a0ec04baea13d82e0c6f121";
    const salary = await ExpenseModel.findById(salaryId).lean();
    const bonus = await ExpenseModel.findById(bonusId).lean();

    console.log("\n=================== DOCUMENT DETAILS & TIMESTAMPS ===================");
    
    if (debit) {
        const creator = await userCol.findOne({ _id: debit.createdBy });
        console.log(`🏦 Debit Borrow (950,000.00 BDT):
  ID: ${debit._id}
  Description: "${debit.description}"
  Date (date field): ${debit.date.toISOString()}
  CreatedAt: ${debit.createdAt.toISOString()} (${debit.createdAt.toLocaleString()})
  CreatedBy: ${debit.createdBy} (${creator ? creator.name : 'Unknown'})
`);
    } else {
        console.log("❌ Debit Borrow document not found!");
    }

    if (bonus) {
        const creator = await userCol.findOne({ _id: bonus.createdBy });
        console.log(`🎁 Bonus Expense (236,500.00 BDT):
  ID: ${bonus._id}
  Title: "${bonus.title}"
  Date (date field): ${bonus.date.toISOString()}
  CreatedAt: ${bonus.createdAt.toISOString()} (${bonus.createdAt.toLocaleString()})
  CreatedBy: ${bonus.createdBy} (${creator ? creator.name : 'Unknown'})
`);
    } else {
        console.log("❌ Bonus Expense document not found!");
    }

    if (salary) {
        const creator = await userCol.findOne({ _id: salary.createdBy });
        console.log(`💼 Salary Expense (532,234.00 BDT):
  ID: ${salary._id}
  Title: "${salary.title}"
  Date (date field): ${salary.date.toISOString()}
  CreatedAt: ${salary.createdAt.toISOString()} (${salary.createdAt.toLocaleString()})
  CreatedBy: ${salary.createdBy} (${creator ? creator.name : 'Unknown'})
`);
    } else {
        console.log("❌ Salary Expense document not found!");
    }

    console.log("=====================================================================");

    if (debit && salary && bonus) {
        const debitTime = debit.createdAt.getTime();
        const salaryTime = salary.createdAt.getTime();
        const bonusTime = bonus.createdAt.getTime();

        console.log("\n🔍 TIMELINE COMPARISON:");
        console.log(`- Was Debit Borrow created BEFORE Salary Expense? ${debitTime < salaryTime ? "YES ✅" : "NO ❌"}`);
        console.log(`- Was Debit Borrow created BEFORE Bonus Expense? ${debitTime < bonusTime ? "YES ✅" : "NO ❌"}`);
        
        console.log(`\nTime Differences:`);
        const diffSalaryDays = ((salaryTime - debitTime) / (1000 * 60 * 60 * 24)).toFixed(2);
        console.log(`  * Salary was created ${diffSalaryDays} days AFTER the Debit Borrow was added.`);
        const diffBonusDays = ((bonusTime - debitTime) / (1000 * 60 * 60 * 24)).toFixed(2);
        console.log(`  * Bonus was created ${diffBonusDays} days AFTER the Debit Borrow was added.`);
    }

    await mongoose.disconnect();
}

run().catch(console.error);
