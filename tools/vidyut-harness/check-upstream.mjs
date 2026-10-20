#!/usr/bin/env node

/**
 * Vidyut Upstream & Release Checker
 * Compares current local installation with upstream ambuda-org/vidyut
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkUpstream() {
  console.log('====================================================');
  console.log('🔍 Kontrola upstream projektu Vidyut (Ambuda Project)');
  console.log('====================================================\n');

  // 1. Check local installed package version
  let localPackageJson = null;
  try {
    const pkgPath = join(__dirname, '../../node_modules/@siva-sh/vidyut/package.json');
    const content = await readFile(pkgPath, 'utf-8');
    localPackageJson = JSON.parse(content);
    console.log(`📦 Lokálně nainstalovaná verze WASM: v${localPackageJson.version}`);
  } catch (err) {
    console.warn('⚠️ Lokální balíček @siva-sh/vidyut nebyl nalezen v node_modules.');
  }

  // 2. Check latest npm release
  console.log('\n🌐 Zjišťuji stav na npm registry...');
  try {
    const res = await fetch('https://registry.npmjs.org/@siva-sh/vidyut/latest', {
      headers: { 'User-Agent': 'SanskrtNaWeb-Vidyut-Harness' }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Nejnovější verze na npm: v${data.version}`);
      if (localPackageJson && localPackageJson.version !== data.version) {
        console.log(`⚡ K dispozici je nová verze! Spusťte: npm update @siva-sh/vidyut`);
      } else {
        console.log(`✨ Lokální verze je aktuální vůči npm.`);
      }
    } else {
      console.warn(`⚠️ Nepodařilo se ověřit npm registry (HTTP ${res.status})`);
    }
  } catch (err) {
    console.warn(`⚠️ Chyba připojení k npm registry: ${err.message}`);
  }

  // 3. Check GitHub repository latest commit
  console.log('\n🐙 Zjišťuji stav na GitHub (ambuda-org/vidyut)...');
  try {
    const res = await fetch('https://api.github.com/repos/ambuda-org/vidyut/commits/main', {
      headers: { 'User-Agent': 'SanskrtNaWeb-Vidyut-Harness' }
    });
    if (res.ok) {
      const commit = await res.json();
      console.log(`✅ Poslední commit na větvi main:`);
      console.log(`   Hash:   ${commit.sha.substring(0, 10)}`);
      console.log(`   Autor:  ${commit.commit.author.name}`);
      console.log(`   Datum:  ${commit.commit.author.date}`);
      console.log(`   Zpráva: ${commit.commit.message.split('\n')[0]}`);
      console.log(`   URL:    ${commit.html_url}`);
    } else {
      console.warn(`⚠️ GitHub API limit nebo nedostupnost (HTTP ${res.status})`);
    }
  } catch (err) {
    console.warn(`⚠️ Chyba připojení k GitHub API: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('✅ Kontrola dokončena.');
  console.log('====================================================\n');
}

checkUpstream();
