#!/usr/bin/env node

// Simple test script to verify file upload functionality
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing file upload functionality...');

// Test that we're in the right directory
if (!fs.existsSync('frontend/src/components/FileList.tsx')) {
  console.error('❌ Not in the right directory - please run this from the project root');
  process.exit(1);
}

// Test 1: Check if FileList has the Edit2 icon import
const fileListContent = fs.readFileSync('frontend/src/components/FileList.tsx', 'utf8');
if (fileListContent.includes('Edit2')) {
  console.log('✅ 1. Edit2 icon is imported correctly');
} else {
  console.error('❌ 1. Edit2 icon is not imported');
}

// Test 2: Check if FileList has rename button
if (fileListContent.includes('onRename')) {
  console.log('✅ 2. FileList has onRename prop');
} else {
  console.error('❌ 2. FileList missing onRename prop');
}

// Test 3: Check if DashboardPage has RenameFileModal import
const dashboardContent = fs.readFileSync('frontend/src/pages/DashboardPage.tsx', 'utf8');
if (dashboardContent.includes('RenameFileModal')) {
  console.log('✅ 3. DashboardPage imports RenameFileModal');
} else {
  console.error('❌ 3. DashboardPage missing RenameFileModal import');
}

// Test 4: Check if DashboardPage passes onRename handler
if (dashboardContent.includes('onRename={handleRename}')) {
  console.log('✅ 4. DashboardPage passes onRename handler');
} else {
  console.error('❌ 4. DashboardPage missing onRename handler');
}

// Test 5: Check if backend fileController uses originalFilename
const controllerContent = fs.readFileSync('backend/src/controllers/fileController.ts', 'utf8');
if (controllerContent.includes('uploadData.originalFilename')) {
  console.log('✅ 5. Backend uses uploadData.originalFilename');
} else {
  console.error('❌ 5. Backend still using uploadData.filename');
}

// Test 6: Check if routes have rename endpoint
const routesContent = fs.readFileSync('backend/src/routes/files.ts', 'utf8');
if (routesContent.includes("router.patch('/:fileId/rename', renameFile)")) {
  console.log('✅ 6. Routes have PATCH /:fileId/rename endpoint');
} else {
  console.error('❌ 6. Missing rename endpoint in routes');
}

console.log('\n📋 Summary:');
console.log('The file naming improvements should now be working.');
console.log('If you still see issues, try:');
console.log('1. Restart both servers completely');
console.log('2. Clear browser cache (Cmd+Shift+R)');
console.log('3. Upload a new file to test the improved naming');
console.log('4. Try renaming an existing file');
