// This file provides a centralized place to import authOptions
// This prevents relative path issues when importing from different API route depths

import { authOptions } from '../pages/api/auth/[...nextauth]';

export { authOptions }; 