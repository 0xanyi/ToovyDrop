import * as ftp from 'basic-ftp';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testFtpConnection() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('Testing FTP connection...');
    console.log('Host:', process.env.FTP_HOST);
    console.log('User:', process.env.FTP_USER);
    console.log('Port:', process.env.FTP_PORT || '21');
    console.log('Secure:', process.env.FTP_SECURE === 'true');

    // Connect to FTP server
    await client.access({
      host: process.env.FTP_HOST!,
      user: process.env.FTP_USER!,
      password: process.env.FTP_PASSWORD!,
      port: parseInt(process.env.FTP_PORT || '21'),
      secure: process.env.FTP_SECURE === 'true',
    });

    console.log('✅ Successfully connected to FTP server!');

    // List current directory
    console.log('\nListing root directory:');
    const list = await client.list();
    console.log(list);

    // Test creating a directory
    const testDir = '/uploads/test-channel';
    console.log(`\nTesting directory creation: ${testDir}`);
    
    try {
      await client.ensureDir(testDir);
      console.log(`✅ Successfully created/verified directory: ${testDir}`);
    } catch (error) {
      console.error(`❌ Failed to create directory: ${error}`);
    }

    // List uploads directory
    console.log('\nListing /uploads directory:');
    try {
      await client.cd('/uploads');
      const uploadsList = await client.list();
      console.log(uploadsList);
    } catch (error) {
      console.error('Could not list /uploads directory:', error);
    }

    // Test write permissions
    console.log('\nTesting write permissions...');
    try {
      const testFile = '/uploads/test.txt';
      const testContent = Buffer.from('Test file content');
      await client.uploadFrom(Buffer.from(testContent) as any, testFile);
      console.log(`✅ Successfully created test file: ${testFile}`);
      
      // Clean up test file
      await client.remove(testFile);
      console.log('✅ Successfully deleted test file');
    } catch (error) {
      console.error('❌ Write permission test failed:', error);
    }

  } catch (error) {
    console.error('❌ FTP connection test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    client.close();
    console.log('\nFTP connection closed.');
  }
}

// Run the test
testFtpConnection()
  .then(() => {
    console.log('\n✅ FTP connection test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ FTP connection test failed:', error);
    process.exit(1);
  });
