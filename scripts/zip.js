import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../dist');
const zipPath = path.join(__dirname, '../dist.zip');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function createZipEntry(filePath, relativePath) {
  const content = fs.readFileSync(filePath);
  const crc = crc32(content);
  const compressed = content;
  const uncompressedSize = content.length;
  const compressedSize = compressed.length;
  
  const fileNameBytes = Buffer.from(relativePath, 'utf-8');
  
  const localFileHeader = Buffer.alloc(30 + fileNameBytes.length);
  localFileHeader.writeUInt32LE(0x04034b50, 0);
  localFileHeader.writeUInt16LE(20, 4);
  localFileHeader.writeUInt16LE(0, 6);
  localFileHeader.writeUInt16LE(0, 8);
  localFileHeader.writeUInt16LE(0, 10);
  localFileHeader.writeUInt16LE(0, 12);
  localFileHeader.writeUInt32LE(crc, 14);
  localFileHeader.writeUInt32LE(compressedSize, 18);
  localFileHeader.writeUInt32LE(uncompressedSize, 22);
  localFileHeader.writeUInt16LE(fileNameBytes.length, 26);
  localFileHeader.writeUInt16LE(0, 28);
  fileNameBytes.copy(localFileHeader, 30);
  
  return {
    localFileHeader,
    compressed,
    centralDirectory: {
      versionMadeBy: 0x0317,
      versionNeeded: 20,
      flags: 0,
      compression: 0,
      modTime: 0,
      modDate: 0,
      crc,
      compressedSize,
      uncompressedSize,
      fileName: relativePath
    }
  };
}

function createCentralDirectoryEntry(entry, offset) {
  const fileNameBytes = Buffer.from(entry.fileName, 'utf-8');
  const cdEntry = Buffer.alloc(46 + fileNameBytes.length);
  
  cdEntry.writeUInt32LE(0x02014b50, 0);
  cdEntry.writeUInt16LE(entry.versionMadeBy, 4);
  cdEntry.writeUInt16LE(entry.versionNeeded, 6);
  cdEntry.writeUInt16LE(entry.flags, 8);
  cdEntry.writeUInt16LE(entry.compression, 10);
  cdEntry.writeUInt16LE(entry.modTime, 12);
  cdEntry.writeUInt16LE(entry.modDate, 14);
  cdEntry.writeUInt32LE(entry.crc, 16);
  cdEntry.writeUInt32LE(entry.compressedSize, 20);
  cdEntry.writeUInt32LE(entry.uncompressedSize, 24);
  cdEntry.writeUInt16LE(fileNameBytes.length, 28);
  cdEntry.writeUInt16LE(0, 30);
  cdEntry.writeUInt16LE(0, 32);
  cdEntry.writeUInt16LE(0, 34);
  cdEntry.writeUInt16LE(0, 36);
  cdEntry.writeUInt32LE(0, 38);
  cdEntry.writeUInt32LE(offset, 42);
  fileNameBytes.copy(cdEntry, 46);
  
  return cdEntry;
}

function createEndOfCentralDirectory(entries, cdOffset, cdSize) {
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return eocd;
}

async function zipDist() {
  try {
    if (!fs.existsSync(distPath)) {
      console.error('❌ 错误：dist 目录不存在，请先执行 npm run build');
      process.exit(1);
    }

    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    const zipBuffer = [];
    const cdEntries = [];
    let offset = 0;

    function addFiles(dir, prefix) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = prefix ? `${prefix}/${file}` : file;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          addFiles(fullPath, relativePath);
        } else {
          const entry = createZipEntry(fullPath, relativePath);
          zipBuffer.push(entry.localFileHeader);
          zipBuffer.push(entry.compressed);
          cdEntries.push({ ...entry.centralDirectory, offset });
          offset += entry.localFileHeader.length + entry.compressed.length;
        }
      }
    }

    addFiles(distPath, '');

    const cdOffset = offset;
    for (const cdEntry of cdEntries) {
      const cdBuf = createCentralDirectoryEntry(cdEntry, cdEntry.offset);
      zipBuffer.push(cdBuf);
      offset += cdBuf.length;
    }

    const cdSize = offset - cdOffset;
    const eocd = createEndOfCentralDirectory(cdEntries, cdOffset, cdSize);
    zipBuffer.push(eocd);

    const finalBuffer = Buffer.concat(zipBuffer);
    fs.writeFileSync(zipPath, finalBuffer);

    const stats = fs.statSync(zipPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`✅ 已生成 dist.zip，路径：${zipPath}，大小：${sizeKB} KB`);
  } catch (error) {
    console.error('❌ 压缩失败：', error.message);
    process.exit(1);
  }
}

zipDist();