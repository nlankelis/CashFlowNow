export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
}
