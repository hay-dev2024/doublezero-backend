import { z } from 'zod';

export const envSchema = z.object({
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // API
    OPENWEATHER_API_KEY: z.string().min(1, 'OPENWEATHER_API_KEY is required'),
    GOOGLE_PLACES_API_KEY: z.string().min(1, 'GOOGLE_PLACES_API_KEY is required'),

    PORT: z.coerce.number().default(3000),
    NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Environment = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        console.error('Environment variable validation failed:');
        console.error(parsed.error.format());
        throw new Error('Invalid environment configuration. Please check your .env file.')
    }

    return parsed.data;
}