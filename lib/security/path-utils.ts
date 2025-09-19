/**
 * Path Security Utilities
 * Provides safe path manipulation functions to prevent path traversal attacks
 */

import path from 'path';
import fs from 'fs';

/**
 * Safely joins path segments and validates against path traversal
 * @param basePath - The base directory path
 * @param userPath - User-provided path to join (potentially unsafe)
 * @returns Sanitized absolute path within the base directory
 * @throws Error if path traversal is detected
 */
export function safeJoin(basePath: string, userPath: string): string {
  // Normalize and resolve the base path
  const normalizedBase = path.resolve(basePath);

  // Remove any leading slashes and normalize the user path
  const normalizedUserPath = userPath.replace(/^\/+/, '');

  // Join the paths
  const joinedPath = path.join(normalizedBase, normalizedUserPath);

  // Resolve to get the absolute path
  const resolvedPath = path.resolve(joinedPath);

  // Check if the resolved path is within the base directory
  if (!resolvedPath.startsWith(normalizedBase + path.sep) && resolvedPath !== normalizedBase) {
    throw new Error(`Path traversal detected: ${userPath} resolves outside base directory`);
  }

  return resolvedPath;
}

/**
 * Validates a filename to ensure it doesn't contain dangerous characters
 * @param filename - The filename to validate
 * @returns True if filename is safe
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for dangerous characters and patterns
  const dangerousPatterns = [
    /\.\./,          // Parent directory traversal
    /[<>:"|?*]/,     // Invalid filename characters on Windows
    /^\.+$/,         // Only dots (., .., ...)
    /[\x00-\x1f]/,   // Control characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
  ];

  return !dangerousPatterns.some(pattern => pattern.test(filename));
}

/**
 * Safely creates a file path for exports/downloads within a base directory
 * @param baseDir - Base directory for files
 * @param filename - User-provided filename
 * @param allowedExtensions - Array of allowed file extensions (e.g., ['.json', '.csv'])
 * @returns Safe file path
 * @throws Error if validation fails
 */
export function createSafeFilePath(
  baseDir: string,
  filename: string,
  allowedExtensions: string[] = []
): string {
  // Validate filename
  if (!isValidFilename(filename)) {
    throw new Error(`Invalid filename: ${filename}`);
  }

  // Check file extension if restrictions are provided
  if (allowedExtensions.length > 0) {
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`File extension ${ext} not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }
  }

  // Use safeJoin to create the path
  return safeJoin(baseDir, filename);
}

/**
 * Checks if a path exists and is within the allowed base directory
 * @param fullPath - The full path to check
 * @param baseDir - The base directory to validate against
 * @returns Object with exists and isValid properties
 */
export async function validatePath(fullPath: string, baseDir: string): Promise<{
  exists: boolean;
  isValid: boolean;
  isFile: boolean;
  isDirectory: boolean;
}> {
  try {
    // Check if path is within base directory
    const normalizedBase = path.resolve(baseDir);
    const normalizedPath = path.resolve(fullPath);

    const isValid = normalizedPath.startsWith(normalizedBase + path.sep) ||
                   normalizedPath === normalizedBase;

    if (!isValid) {
      return { exists: false, isValid: false, isFile: false, isDirectory: false };
    }

    // Check if path exists and get stats
    const stats = await fs.promises.stat(fullPath).catch(() => null);

    return {
      exists: stats !== null,
      isValid: true,
      isFile: stats?.isFile() ?? false,
      isDirectory: stats?.isDirectory() ?? false
    };
  } catch (error) {
    return { exists: false, isValid: false, isFile: false, isDirectory: false };
  }
}

/**
 * Sanitizes a user-provided path component by removing dangerous characters
 * @param pathComponent - Path component to sanitize
 * @returns Sanitized path component
 */
export function sanitizePathComponent(pathComponent: string): string {
  if (!pathComponent || typeof pathComponent !== 'string') {
    return '';
  }

  return pathComponent
    .replace(/\.\./g, '')  // Remove parent directory traversal
    .replace(/[<>:"|?*\x00-\x1f]/g, '')  // Remove dangerous characters
    .replace(/^\.+/, '')   // Remove leading dots
    .trim();
}

/**
 * Creates a safe export filename with timestamp
 * @param prefix - Filename prefix (e.g., 'database-export')
 * @param extension - File extension (e.g., '.json')
 * @returns Safe filename with timestamp
 */
export function createTimestampedFilename(prefix: string, extension: string): string {
  const sanitizedPrefix = sanitizePathComponent(prefix);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedExtension = extension.startsWith('.') ? extension : `.${extension}`;

  return `${sanitizedPrefix}-${timestamp}${sanitizedExtension}`;
}

/**
 * Configuration for safe file operations
 */
export const SAFE_PATH_CONFIG = {
  // Maximum filename length
  MAX_FILENAME_LENGTH: 255,

  // Allowed extensions for different file types
  ALLOWED_EXTENSIONS: {
    EXPORTS: ['.json', '.csv', '.txt'],
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.md'],
    ARCHIVES: ['.zip', '.tar', '.gz']
  },

  // Base directories for different operations
  BASE_DIRECTORIES: {
    EXPORTS: process.env.EXPORTS_DIR || './data/exports',
    UPLOADS: process.env.UPLOADS_DIR || './uploads',
    TEMP: process.env.TEMP_DIR || './temp'
  }
} as const;

/**
 * Type definitions for better TypeScript support
 */
export type AllowedExtension = typeof SAFE_PATH_CONFIG.ALLOWED_EXTENSIONS[keyof typeof SAFE_PATH_CONFIG.ALLOWED_EXTENSIONS][number];
export type BaseDirectory = keyof typeof SAFE_PATH_CONFIG.BASE_DIRECTORIES;