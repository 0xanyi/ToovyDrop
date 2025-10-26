#!/usr/bin/env node

/**
 * Cleanup script for orphaned files
 * This script finds and removes files that exist on FTP but not in the database,
 * or files marked as inactive in the database but still exist on FTP.
 */

import { PrismaClient } from '@prisma/client';
import { FileService } from '../services/fileService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function cleanupOrphanedFiles() {
  console.log('🧹 Starting orphaned files cleanup...');
  
  try {
    const fileService = new FileService(prisma);
    
    // Get all inactive files from database
    const inactiveFiles = await prisma.file.findMany({
      where: { isActive: false },
      select: { id: true, ftpPath: true, filename: true, createdAt: true }
    });
    
    console.log(`Found ${inactiveFiles.length} inactive files in database`);
    
    if (inactiveFiles.length === 0) {
      console.log('✅ No orphaned files to clean up');
      return;
    }
    
    // Connect to FTP
    await fileService.connectToFtp();
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const file of inactiveFiles) {
      try {
        // Try to delete from FTP
        await fileService.ftpClientInstance.remove(file.ftpPath);
        console.log(`🗑️  Deleted from FTP: ${file.filename}`);
        
        // Delete from database
        await prisma.file.delete({
          where: { id: file.id }
        });
        console.log(`🗑️  Deleted from database: ${file.filename}`);
        
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${file.filename}:`, error);
        errorCount++;
      }
    }
    
    await fileService.disconnectFromFtp();
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully deleted: ${deletedCount} files`);
    console.log(`   ❌ Failed to delete: ${errorCount} files`);
    console.log(`   🧹 Cleanup completed!`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedFiles()
    .then(() => {
      console.log('✅ Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

export { cleanupOrphanedFiles };