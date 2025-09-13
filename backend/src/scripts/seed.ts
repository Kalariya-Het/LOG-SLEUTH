#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { SeedDataUtils } from '../utils/seedData';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

async function seedDatabase() {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/log-sleuth';
    await mongoose.connect(mongoURI);
    
    console.log('Connected to MongoDB');

    // Seed data
    await SeedDataUtils.seedAll();
    
    console.log('✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
