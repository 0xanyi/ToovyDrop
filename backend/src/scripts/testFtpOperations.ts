import * as ftp from 'basic-ftp';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testFtpOperations() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  console.log('='.repeat(60));
  console.log('FTP CONNECTION AND OPERATIONS TEST');
  console.log('='.repeat(60));

  try {
    console.log('\n1. Testing FTP Connection...');
    console.log('   Host:', process.env.FTP_HOST);
    console.log('   User:', process.env.FTP_USER);
    console.log('   Port:', process.env.FTP_PORT || '21');
    console.log('   Secure:', process.env.FTP_SECURE === 'true');

    // Connect to FTP server
    await client.access({
      host: process.env.FTP_HOST!,
      user: process.env.FTP_USER!,
      password: process.env.FTP_PASSWORD!,
      port: parseInt(process.env.FTP_PORT || '21'),
      secure: process.env.FTP_SECURE === 'true',
    });

    console.log('   ✅ Successfully connected to FTP server!');

    // Test 1: List root directory
    console.log('\n2. Listing root directory...');
    const rootList = await client.list();
    console.log(`   Found ${rootList.length} items in root:`);
    rootList.forEach(item => {
      console.log(`   - ${item.type === 1 ? '[DIR]' : '[FILE]'} ${item.name}`);
    });

    // Test 2: Check if /uploads exists
    console.log('\n3. Checking /uploads directory...');
    try {
      await client.cd('/uploads');
      console.log('   ✅ /uploads directory exists');
      
      const uploadsList = await client.list();
      console.log(`   Found ${uploadsList.length} items in /uploads:`);
      uploadsList.forEach(item => {
        console.log(`   - ${item.type === 1 ? '[DIR]' : '[FILE]'} ${item.name}`);
      });
    } catch {
      console.log('   ⚠️  /uploads directory does not exist, creating it...');
      await client.ensureDir('/uploads');
      console.log('   ✅ Created /uploads directory');
    }

    // Test 3: Create a test channel directory
    const testChannelDir = '/uploads/test-channel-' + Date.now();
    console.log(`\n4. Creating test channel directory: ${testChannelDir}`);
    try {
      await client.ensureDir(testChannelDir);
      console.log('   ✅ Successfully created channel directory');
    } catch (error) {
      console.error('   ❌ Failed to create channel directory:', error);
      throw error;
    }

    // Test 4: Upload a test file
    console.log('\n5. Testing file upload...');
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    const testFileContent = `Test file uploaded at ${new Date().toISOString()}`;
    fs.writeFileSync(testFilePath, testFileContent);
    
    const remotePath = `${testChannelDir}/test-file.txt`;
    try {
      await client.uploadFrom(testFilePath, remotePath);
      console.log(`   ✅ Successfully uploaded file to: ${remotePath}`);
    } catch (error) {
      console.error('   ❌ Failed to upload file:', error);
      throw error;
    } finally {
      // Clean up local test file
      fs.unlinkSync(testFilePath);
    }

    // Test 5: List files in test channel directory
    console.log('\n6. Listing files in test channel directory...');
    await client.cd(testChannelDir);
    const channelFiles = await client.list();
    console.log(`   Found ${channelFiles.length} files:`);
    channelFiles.forEach(item => {
      console.log(`   - ${item.name} (${item.size} bytes)`);
    });

    // Test 6: Download the test file
    console.log('\n7. Testing file download...');
    const downloadPath = path.join(__dirname, 'test-download.txt');
    try {
      await client.downloadTo(downloadPath, remotePath);
      const downloadedContent = fs.readFileSync(downloadPath, 'utf-8');
      console.log('   ✅ Successfully downloaded file');
      console.log('   Content:', downloadedContent);
      fs.unlinkSync(downloadPath);
    } catch (error) {
      console.error('   ❌ Failed to download file:', error);
      throw error;
    }

    // Test 7: Delete the test file
    console.log('\n8. Testing file deletion...');
    try {
      await client.remove(remotePath);
      console.log('   ✅ Successfully deleted test file');
    } catch (error) {
      console.error('   ❌ Failed to delete file:', error);
      throw error;
    }

    // Test 8: Delete the test channel directory
    console.log('\n9. Cleaning up test channel directory...');
    try {
      await client.removeDir(testChannelDir);
      console.log('   ✅ Successfully deleted test channel directory');
    } catch (error) {
      console.error('   ⚠️  Could not delete directory (may not be empty):', error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL FTP OPERATIONS TESTS PASSED!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ FTP OPERATIONS TEST FAILED');
    console.log('='.repeat(60));
    
    if (error instanceof Error) {
      console.error('\nError:', error.message);
      
      if (error.message.includes('530')) {
        console.error('\n⚠️  LOGIN FAILED - Please check your FTP credentials:');
        console.error('   - Username: ' + process.env.FTP_USER);
        console.error('   - Password: ' + (process.env.FTP_PASSWORD ? '***' : 'NOT SET'));
        console.error('   - Host: ' + process.env.FTP_HOST);
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('\n⚠️  HOST NOT FOUND - Please check your FTP host:');
        console.error('   - Host: ' + process.env.FTP_HOST);
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('\n⚠️  CONNECTION REFUSED - Please check:');
        console.error('   - Port: ' + (process.env.FTP_PORT || '21'));
        console.error('   - Firewall settings');
      }
    }
    
    throw error;
  } finally {
    client.close();
    console.log('\nFTP connection closed.');
  }
}

// Run the test
testFtpOperations()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.error('\n❌ Test failed');
    process.exit(1);
  });
