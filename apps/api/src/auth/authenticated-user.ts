export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
}
