#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { logger } from '../config/logger';

// Load environment variables
dotenv.config();

async function createAdminUser() {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/log-sleuth';
    await mongoose.connect(mongoURI);
    
    console.log('Connected to MongoDB');

    // Get admin details from command line or environment
    const email = process.argv[2] || process.env.DEFAULT_ADMIN_EMAIL || 'admin@log-sleuth.com';
    const password = process.argv[3] || process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const firstName = process.argv[4] || 'System';
    const lastName = process.argv[5] || 'Administrator';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin user with email ${email} already exists`);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (require.main === module) {
  createAdminUser();
}

export default createAdminUser;
