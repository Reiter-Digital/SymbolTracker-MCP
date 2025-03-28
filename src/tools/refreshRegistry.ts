import * as fs from 'fs';
import * as path from 'path';
import { symbolRegistry } from '../registry/symbolRegistry';
import { getDocForFile, GetDocForFileInput } from './getDocForFile';

/**
 * Input for the refresh_registry tool
 */
export interface RefreshRegistryInput {
  fullScan?: boolean;       // Whether to perform a full scan of the codebase
  baseDir?: string;         // Base directory to scan (default: current working directory)
  patterns?: string[];      // File patterns to include (default: all TypeScript and JavaScript files)
}

/**
 * Result of refresh_registry
 */
export interface RefreshRegistryResult {
  refreshed: boolean;
  filesProcessed: number;
  filesRemoved: number;
  symbols: number;
  error?: string;
}

/**
 * Refreshes the symbol registry by reprocessing files that have changed
 * @param input Refresh parameters
 * @returns Refresh results
 */
export async function refreshRegistry(input: RefreshRegistryInput): Promise<RefreshRegistryResult> {
  try {
    // Clean up symbols for deleted files first
    symbolRegistry.cleanupDeletedFiles();
    
    // Determine which files need to be refreshed
    const baseDir = input.baseDir || process.cwd();
    let filesToProcess: string[] = [];
    let filesRemoved = 0;
    
    // If full scan requested, discover all files in the codebase
    if (input.fullScan) {
      const patterns = input.patterns || ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
      filesToProcess = await symbolRegistry.fullScan(baseDir, patterns);
    } else {
      // Otherwise, just get the files that have changed
      filesToProcess = await symbolRegistry.getFilesNeedingRefresh();
    }
    
    // Process each file
    for (const filePath of filesToProcess) {
      if (fs.existsSync(filePath)) {
        // Reuse getDocForFile to parse the file and update registry
        await getDocForFile({ file: filePath });
      } else {
        // File no longer exists, remove its symbols
        symbolRegistry.removeFileSymbols(filePath);
        filesRemoved++;
      }
    }
    
    return {
      refreshed: true,
      filesProcessed: filesToProcess.length,
      filesRemoved,
      symbols: symbolRegistry.getAllSymbols().length
    };
  } catch (error) {
    return {
      refreshed: false,
      filesProcessed: 0,
      filesRemoved: 0,
      symbols: 0,
      error: (error as Error).message
    };
  }
}
