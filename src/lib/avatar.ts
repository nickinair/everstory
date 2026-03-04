import { User } from '../types';

/**
 * Returns a valid avatar URL for a user.
 * If the user has a valid avatar or avatar_url, it returns that.
 * Otherwise, it generates a random cartoon avatar using DiceBear Adventurer.
 * 
 * @param user The user object which can contain avatar or avatar_url
 * @returns A string representing the avatar URL
 */
export const getAvatarUrl = (user: User | null | undefined): string => {
    const url = user?.avatar_url || user?.avatar;

    if (url && url.startsWith('http')) {
        return url;
    }

    // Fallback to random cartoon avatar
    // Using adventurer style which looks like cartoon characters
    const seed = user?.id || user?.full_name || user?.name || 'guest-' + Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
};
