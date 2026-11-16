// Storage is optional: React state remains the source of truth for this session.
export function readInitialThemePreference(): string {
  try {
    const migrationKey = 'medifollow-theme-v2-initialized';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.setItem('medifollow-theme', 'dark');
      localStorage.setItem(migrationKey, 'true');
      return 'dark';
    }
    return localStorage.getItem('medifollow-theme') || 'dark';
  } catch {
    return 'dark';
  }
}

export function persistThemePreference(preference: string): boolean {
  try {
    localStorage.setItem('medifollow-theme', preference);
    return true;
  } catch {
    return false;
  }
}
