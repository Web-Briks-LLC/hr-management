import { Role } from '@/constants/role';

export const blockedRoute: Record<string, Role[]> = {
    '/leave': [Role.SUPER_ADMIN],
};
