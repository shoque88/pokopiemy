const { execSync } = require('child_process');
const path = require('path');

console.log('Dodawanie zmian do git...');
try {
  execSync('git add .', { stdio: 'inherit', cwd: __dirname });
  
  console.log('\nTworzenie commita...');
  execSync('git commit -m "Migrate from JSON files to Vercel Blob storage"', { 
    stdio: 'inherit', 
    cwd: __dirname 
  });
  
  console.log('\nPushowanie do GitHub...');
  execSync('git push', { stdio: 'inherit', cwd: __dirname });
  
  console.log('\n✓ Gotowe! Zmiany zostały wysłane do GitHub.');
  console.log('Vercel automatycznie wdroży aktualizację.');
} catch (error) {
  console.error('\n❌ Błąd:', error.message);
  console.log('\nUruchom ręcznie w terminalu:');
  console.log('  git add .');
  console.log('  git commit -m "Migrate from JSON files to Vercel Blob storage"');
  console.log('  git push');
  process.exit(1);
}


