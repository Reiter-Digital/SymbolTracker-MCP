import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('MCP Tool Tests', () => {
  const testDir = path.resolve(__dirname, '..'); // Project root directory
  const testFiles = fs.readdirSync(testDir)
    .filter(file => 
        file.startsWith('test-') && 
        file.endsWith('.json') &&
        !file.includes('js-request') && // Exclude js-request for now
        !file.includes('search-routes')   // Exclude search-routes for now
    );

  testFiles.forEach(testFile => {
    const testName = testFile.replace('.json', '');
    const filePath = path.join(testDir, testFile);

    it(`should match snapshot for ${testName}`, () => {
      const inputFileContent = fs.readFileSync(filePath, 'utf-8');
      let output = '';
      let error = '';

      try {
        // Escape single quotes within the JSON for the shell command
        const escapedInput = inputFileContent.replace(/'/g, "'\\''");
        const command = `echo '${escapedInput}' | node dist/index.js`;
        
        output = execSync(command, { encoding: 'utf-8', cwd: testDir });

      } catch (e: any) {
        error = e.stderr ? e.stderr.toString() : e.toString();
        // console.error(`Error executing test ${testName}:`, error);
        output = error; // Snapshot the error output
      }
      
      // Normalize paths before snapshotting
      const normalizedOutput = normalizeOutput(output, testDir);

      expect(normalizedOutput).toMatchSnapshot();
    });
  });
});

/**
 * Helper function to normalize output before snapshotting.
 * Replaces project-specific absolute paths with a placeholder.
 */
function normalizeOutput(output: string, projectRoot: string): string {
    // Normalize backslashes to forward slashes for cross-platform consistency
    const consistentRoot = projectRoot.replace(/\\/g, '/');
    const escapedRoot = consistentRoot.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedRoot, 'g');
    let normalized = output.replace(regex, '<PROJECT_ROOT>');

    // Also normalize backslashes in any remaining paths within the output
    normalized = normalized.replace(/\\/g, '/');

    // Add any other normalizations needed (e.g., timestamps, dynamic IDs)

    return normalized;
}
