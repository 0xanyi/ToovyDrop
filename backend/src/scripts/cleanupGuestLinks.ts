#!/usr/bin/env ts-node

/**
 * Guest Link Cleanup Script
 * 
 * This script can be run manually or via cron job to clean up expired guest links.
 * 
 * Usage:
 *   npm run cleanup:guest-links
 *   or
 *   npx ts-node src/scripts/cleanupGuestLinks.ts
 */

import { PrismaClient } from '@prisma/client';
import GuestLinkCleanupService from '../services/guestLinkCleanupService';
import logger from '../utils/logger';

async function main() {
  const prisma = new PrismaClient();
  const cleanupService = new GuestLinkCleanupService(prisma);

  try {
    console.log('Starting guest link cleanup...');
    
    // Get stats before cleanup
    const statsBefore = await cleanupService.getCleanupStats();
    console.log('Stats before cleanup:', statsBefore);
    
    // Run cleanup
    const result = await cleanupService.cleanupExpiredLinks();
    
    // Get stats after cleanup
    const statsAfter = await cleanupService.getCleanupStats();
    console.log('Stats after cleanup:', statsAfter);
    
    console.log('\nCleanup Results:');
    console.log(`- Deactivated links: ${result.deactivatedCount}`);
    console.log(`- Deleted links: ${result.deletedCount}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\nGuest link cleanup completed successfully!');
  } catch (error) {
    console.error('Guest link cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
}

export default main;