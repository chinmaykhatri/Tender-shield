// FILE: lib/auth/passwordValidator.ts
// SECURITY LAYER: Prevents weak passwords
// BREAKS IF REMOVED: NO — just less secure

export interface PasswordStrength {
  score: number;        // 0-4
  label: string;        // WEAK / FAIR / STRONG / VERY STRONG
  color: string;        // for UI display
  passed: boolean;      // meets minimum requirements
  failures: string[];   // what is missing
}

export function validatePassword(password: string): PasswordStrength {
  const failures: string[] = [];

  if (password.length < 10)
    failures.push('At least 10 characters required');
  if (!/[A-Z]/.test(password))
    failures.push('At least one uppercase letter required');
  if (!/[a-z]/.test(password))
    failures.push('At least one lowercase letter required');
  if (!/[0-9]/.test(password))
    failures.push('At least one number required');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password))
    failures.push('At least one special character required');

  // Common weak passwords — India procurement context
  const blocklist = [
    'password', '12345678', 'india123', 'tender123',
    'government', 'admin123', 'password1', 'tender@123',
    'welcome1', 'india@123', 'qwerty', 'letmein',
    'abc123', 'monkey', 'iloveyou', 'trustno1',
  ];
  if (blocklist.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
    failures.push('Password is too common — choose something unique');
  }

  const score = Math.max(0, Math.min(4, 4 - failures.length));
  const labels = ['WEAK', 'WEAK', 'FAIR', 'STRONG', 'VERY STRONG'];
  const colors = ['#dc2626', '#dc2626', '#d97706', '#059669', '#059669'];

  return {
    score,
    label: labels[score],
    color: colors[score],
    passed: failures.length === 0,
    failures,
  };
}
