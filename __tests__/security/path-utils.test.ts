/**
 * Security Tests for Path Utilities
 * Tests safe path manipulation functions to prevent path traversal attacks
 */

import {
  safeJoin,
  isValidFilename,
  createSafeFilePath,
  validatePath,
  sanitizePathComponent,
  createTimestampedFilename,
  SAFE_PATH_CONFIG
} from '@/lib/security/path-utils';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Path Security Utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('safeJoin', () => {
    it('should safely join valid paths', () => {
      const result = safeJoin(tempDir, 'test.txt');
      expect(result).toBe(path.join(tempDir, 'test.txt'));
    });

    it('should prevent path traversal attacks', () => {
      expect(() => {
        safeJoin(tempDir, '../../../etc/passwd');
      }).toThrow('Path traversal detected');
    });

    it('should prevent path traversal with mixed separators', () => {
      expect(() => {
        safeJoin(tempDir, '..\\..\\..\\windows\\system32');
      }).toThrow('Path traversal detected');
    });

    it('should handle nested safe paths correctly', () => {
      const result = safeJoin(tempDir, 'subdir/file.txt');
      expect(result).toBe(path.join(tempDir, 'subdir', 'file.txt'));
    });

    it('should prevent relative path traversal', () => {
      expect(() => {
        safeJoin(tempDir, 'valid/../../../etc/passwd');
      }).toThrow('Path traversal detected');
    });
  });

  describe('isValidFilename', () => {
    it('should accept valid filenames', () => {
      expect(isValidFilename('document.pdf')).toBe(true);
      expect(isValidFilename('image_2023.jpg')).toBe(true);
      expect(isValidFilename('config-file.json')).toBe(true);
    });

    it('should reject path traversal patterns', () => {
      expect(isValidFilename('../etc/passwd')).toBe(false);
      expect(isValidFilename('..\\windows\\system32')).toBe(false);
      expect(isValidFilename('../../secret.txt')).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(isValidFilename('file<script>.txt')).toBe(false);
      expect(isValidFilename('file|pipe.txt')).toBe(false);
      expect(isValidFilename('file?.txt')).toBe(false);
      expect(isValidFilename('file*.txt')).toBe(false);
    });

    it('should reject Windows reserved names', () => {
      expect(isValidFilename('CON')).toBe(false);
      expect(isValidFilename('PRN.txt')).toBe(false);
      expect(isValidFilename('AUX')).toBe(false);
      expect(isValidFilename('COM1')).toBe(false);
    });

    it('should reject only dots', () => {
      expect(isValidFilename('.')).toBe(false);
      expect(isValidFilename('..')).toBe(false);
      expect(isValidFilename('...')).toBe(false);
    });

    it('should reject control characters', () => {
      expect(isValidFilename('file\x00.txt')).toBe(false);
      expect(isValidFilename('file\x1f.txt')).toBe(false);
    });

    it('should reject null/undefined/empty', () => {
      expect(isValidFilename('')).toBe(false);
      expect(isValidFilename(null as any)).toBe(false);
      expect(isValidFilename(undefined as any)).toBe(false);
    });
  });

  describe('createSafeFilePath', () => {
    it('should create safe file paths', () => {
      const result = createSafeFilePath(tempDir, 'test.json', ['.json']);
      expect(result).toBe(path.join(tempDir, 'test.json'));
    });

    it('should enforce file extension restrictions', () => {
      expect(() => {
        createSafeFilePath(tempDir, 'test.exe', ['.json', '.txt']);
      }).toThrow('File extension .exe not allowed');
    });

    it('should prevent path traversal in file creation', () => {
      expect(() => {
        createSafeFilePath(tempDir, '../../../etc/passwd', ['.txt']);
      }).toThrow('Invalid filename');
    });

    it('should work with case-insensitive extensions', () => {
      const result = createSafeFilePath(tempDir, 'test.JSON', ['.json']);
      expect(result).toBe(path.join(tempDir, 'test.JSON'));
    });
  });

  describe('validatePath', () => {
    it('should validate paths within base directory', async () => {
      // Create a test file
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');

      const result = await validatePath(testFile, tempDir);
      expect(result.exists).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.isFile).toBe(true);
      expect(result.isDirectory).toBe(false);
    });

    it('should reject paths outside base directory', async () => {
      const result = await validatePath('/etc/passwd', tempDir);
      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(false);
    });

    it('should handle non-existent files within base directory', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt');
      const result = await validatePath(nonExistentFile, tempDir);
      expect(result.isValid).toBe(true);
      expect(result.exists).toBe(false);
    });

    it('should validate directories', async () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);

      const result = await validatePath(subDir, tempDir);
      expect(result.exists).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.isFile).toBe(false);
      expect(result.isDirectory).toBe(true);
    });
  });

  describe('sanitizePathComponent', () => {
    it('should remove dangerous patterns', () => {
      expect(sanitizePathComponent('../etc/passwd')).toBe('etc/passwd');
      expect(sanitizePathComponent('..\\windows')).toBe('windows');
      expect(sanitizePathComponent('file<script>')).toBe('filescript');
    });

    it('should handle null/undefined inputs', () => {
      expect(sanitizePathComponent(null as any)).toBe('');
      expect(sanitizePathComponent(undefined as any)).toBe('');
      expect(sanitizePathComponent('')).toBe('');
    });

    it('should remove leading dots', () => {
      expect(sanitizePathComponent('...file')).toBe('file');
      expect(sanitizePathComponent('.hidden')).toBe('hidden');
    });

    it('should preserve safe characters', () => {
      expect(sanitizePathComponent('safe-file_name.txt')).toBe('safe-file_name.txt');
    });
  });

  describe('createTimestampedFilename', () => {
    it('should create timestamped filenames', () => {
      const result = createTimestampedFilename('database-export', '.json');
      expect(result).toMatch(/^database-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });

    it('should sanitize prefix', () => {
      const result = createTimestampedFilename('../malicious', '.txt');
      expect(result).toMatch(/^malicious-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.txt$/);
    });

    it('should handle extension format', () => {
      const resultWithDot = createTimestampedFilename('test', '.json');
      const resultWithoutDot = createTimestampedFilename('test', 'json');

      expect(resultWithDot).toMatch(/\.json$/);
      expect(resultWithoutDot).toMatch(/\.json$/);
    });
  });

  describe('SAFE_PATH_CONFIG', () => {
    it('should have valid configuration', () => {
      expect(SAFE_PATH_CONFIG.MAX_FILENAME_LENGTH).toBe(255);
      expect(Array.isArray(SAFE_PATH_CONFIG.ALLOWED_EXTENSIONS.EXPORTS)).toBe(true);
      expect(SAFE_PATH_CONFIG.ALLOWED_EXTENSIONS.EXPORTS).toContain('.json');
      expect(typeof SAFE_PATH_CONFIG.BASE_DIRECTORIES.EXPORTS).toBe('string');
    });
  });
});

describe('Path Security Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-integration-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should prevent path traversal in real file operations', () => {
    // Attempt various path traversal attacks
    const attacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config',
      'valid/../../../etc/shadow',
      'file\0.txt', // null byte injection
      '/absolute/path/attack'
    ];

    attacks.forEach(attack => {
      expect(() => {
        safeJoin(tempDir, attack);
      }).toThrow();
    });
  });

  it('should work correctly with nested safe paths', () => {
    // Create nested directory structure
    const nestedPath = path.join(tempDir, 'level1', 'level2');
    fs.mkdirSync(nestedPath, { recursive: true });

    // Test safe operations
    const safePath = safeJoin(tempDir, 'level1/level2/file.txt');
    fs.writeFileSync(safePath, 'test content');

    expect(fs.existsSync(safePath)).toBe(true);
    expect(fs.readFileSync(safePath, 'utf8')).toBe('test content');
  });

  it('should handle concurrent path validation', async () => {
    // Create multiple test files
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    files.forEach(file => {
      fs.writeFileSync(path.join(tempDir, file), 'content');
    });

    // Validate all paths concurrently
    const validations = files.map(file =>
      validatePath(path.join(tempDir, file), tempDir)
    );

    const results = await Promise.all(validations);
    results.forEach(result => {
      expect(result.exists).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.isFile).toBe(true);
    });
  });
});