// Simple debug endpoint to check environment variables
export default function handler(req, res) {
  // Only show partial keys for security
  const secureEnvDisplay = (key, value) => {
    if (!value) return 'undefined';
    if (key.includes('SECRET') || key.includes('URL')) {
      return value.substring(0, 15) + '...' + value.substring(value.length - 5);
    }
    return value;
  };

  const envKeys = [
    'DATABASE_URL',
    'PRISMA_ACCELERATE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ];

  const envValues = envKeys.reduce((acc, key) => {
    acc[key] = secureEnvDisplay(key, process.env[key]);
    return acc;
  }, {});

  // Also check for the presence of key config objects
  const config = {
    environment: process.env.NODE_ENV,
    envValues,
  };

  res.status(200).json(config);
} 