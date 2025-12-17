/**
 * Normalize project names into safe path segments
 */
export const normalizeProjectName = (projectName: string): string => {
  const trimmed = projectName.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'project';
};

/**
 * Build a stable storage key for an uploaded asset
 */
export const buildObjectKey = (projectName: string, fileName: string, fileId: string): string => {
  const safeProject = normalizeProjectName(projectName);
  const safeFile = fileName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'asset';

  return `projects/${safeProject}/assets/${fileId}-${safeFile}`;
};
