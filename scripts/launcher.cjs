const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');
const sharedDir = path.join(rootDir, 'shared');

console.log('\x1b[36m%s\x1b[0m', '=============================================================');
console.log('\x1b[36m%s\x1b[0m', '   LARV - Local Asset & Resource Vault (v1.0.0)');
console.log('\x1b[36m%s\x1b[0m', '   Inicializador Operacional Local-First (One-Click Launcher)');
console.log('\x1b[36m%s\x1b[0m', '=============================================================\n');

// 0. Auto-healing: verificar e reparar integridade de @larv/shared nos modulos locais
function ensureLocalPackageResolution(targetDir, pkgName) {
  const pkgJsonPath = path.join(targetDir, 'node_modules', '@larv', 'shared', 'package.json');
  let isHealthy = false;
  try {
    if (fs.existsSync(pkgJsonPath)) {
      fs.readFileSync(pkgJsonPath, 'utf8');
      isHealthy = true;
    }
  } catch (e) {
    isHealthy = false;
  }

  if (!isHealthy) {
    console.log('\x1b[33m%s\x1b[0m', '[Auto-Healing] Reparando vinculo local de @larv/shared em ' + pkgName + '...');
    const symlinkPath = path.join(targetDir, 'node_modules', '@larv', 'shared');
    try {
      fs.rmSync(symlinkPath, { recursive: true, force: true });
    } catch (e) {}

    try {
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execSync(npmCmd + ' install', { cwd: targetDir, stdio: 'inherit' });
      console.log('\x1b[32m%s\x1b[0m', '[Auto-Healing] Vinculo de @larv/shared reparado com sucesso em ' + pkgName + '.');
    } catch (err) {
      console.error('\x1b[31m%s\x1b[0m', '[ERRO] Falha no auto-healing de ' + pkgName + ':', err.message);
    }
  }
}

ensureLocalPackageResolution(serverDir, 'server');
ensureLocalPackageResolution(clientDir, 'client');

// 1. Check shared build
const sharedDist = path.join(sharedDir, 'dist', 'index.js');
if (!fs.existsSync(sharedDist)) {
  console.log('\x1b[33m%s\x1b[0m', '[1/4] Compilando contratos compartilhados (@larv/shared)...');
  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execSync(npmCmd + ' --prefix shared run build', { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.error('\x1b[31m%s\x1b[0m', '[ERRO] Falha ao compilar @larv/shared:', e.message);
    process.exit(1);
  }
} else {
  console.log('\x1b[32m%s\x1b[0m', '[1/4] Contratos compartilhados (@larv/shared) prontos.');
}

// 2. Check server build
const serverDist = path.join(serverDir, 'dist', 'server.js');
if (!fs.existsSync(serverDist)) {
  console.log('\x1b[33m%s\x1b[0m', '[2/4] Compilando backend Fastify...');
  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execSync(npmCmd + ' --prefix server run build', { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.error('\x1b[31m%s\x1b[0m', '[ERRO] Falha ao compilar server:', e.message);
    process.exit(1);
  }
} else {
  console.log('\x1b[32m%s\x1b[0m', '[2/4] Binarios do backend prontos.');
}

// 3. Start Backend
console.log('\x1b[34m%s\x1b[0m', '[3/4] Inicializando servidor Fastify na porta 3001...');
const serverProcess = spawn('node', ['dist/server.js'], {
  cwd: serverDir,
  stdio: 'inherit',
});

// 4. Start Frontend
console.log('\x1b[35m%s\x1b[0m', '[4/4] Inicializando frontend Vite na porta 5173...');
const clientProcess = spawn('node', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: clientDir,
  stdio: 'inherit',
});

// Wait for frontend and open browser
let opened = false;
function checkFrontendReady(retries = 30) {
  if (retries <= 0 || opened) return;

  const req = http.get('http://127.0.0.1:5173/', (res) => {
    if (res.statusCode === 200 && !opened) {
      opened = true;
      console.log('\n\x1b[32m%s\x1b[0m', '=============================================================');
      console.log('\x1b[32m%s\x1b[0m', '   LARV Online! Abrindo navegador em http://localhost:5173');
      console.log('\x1b[32m%s\x1b[0m', '   Pressione Ctrl+C para encerrar os servidores com seguranca.');
      console.log('\x1b[32m%s\x1b[0m', '=============================================================\n');

      const openCmd = process.platform === 'win32' ? 'start "" "http://localhost:5173"' : 'xdg-open http://localhost:5173';
      try {
        execSync(openCmd, { shell: true });
      } catch (e) {}
    } else {
      setTimeout(() => checkFrontendReady(retries - 1), 300);
    }
  });

  req.on('error', () => {
    setTimeout(() => checkFrontendReady(retries - 1), 300);
  });
}

setTimeout(() => checkFrontendReady(), 1000);

// Cleanup on exit
function shutdown() {
  console.log('\n\x1b[33m%s\x1b[0m', '[LARV] Encerrando processos do backend e frontend...');
  try { serverProcess.kill(); } catch (e) {}
  try { clientProcess.kill(); } catch (e) {}
  console.log('\x1b[32m%s\x1b[0m', '[LARV] Servidores finalizados com sucesso.');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
