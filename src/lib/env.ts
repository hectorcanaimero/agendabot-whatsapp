/**
 * Environment variables validation
 * Validates required environment variables at application startup
 */

const requiredEnvVars = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // DeepSeek
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,

  // App
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} as const;

const optionalEnvVars = {
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
} as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    const errorMessage = `❌ Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}`;
    console.error(errorMessage);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  // Check optional variables
  Object.entries(optionalEnvVars).forEach(([key, value]) => {
    if (!value || value === optionalEnvVars[key as keyof typeof optionalEnvVars]) {
      warnings.push(`⚠️  Using default for ${key}: ${value}`);
    }
  });

  if (warnings.length > 0) {
    console.warn('Environment warnings:');
    warnings.forEach((w) => console.warn(w));
  }

  console.log('✅ Environment variables validated successfully');
}

export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,
} as {
  [K in keyof typeof requiredEnvVars]: string;
} & {
  [K in keyof typeof optionalEnvVars]: string;
};
