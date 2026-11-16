// Storage is optional: React state remains the source of truth for this session.
export type ThemePreference = 'dark' | 'light' | 'auto';

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'auto' ? value : 'dark';
}

export function readInitialThemePreference(): ThemePreference {
  try {
    const migrationKey = 'medifollow-theme-v2-initialized';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.setItem('medifollow-theme', 'dark');
      localStorage.setItem(migrationKey, 'true');
      return 'dark';
    }
    return normalizeThemePreference(localStorage.getItem('medifollow-theme'));
  } catch {
    return 'dark';
  }
}

export function persistThemePreference(preference: ThemePreference): boolean {
  try {
    localStorage.setItem('medifollow-theme', preference);
    return localStorage.getItem('medifollow-theme') === preference;
  } catch {
    return false;
  }
}
