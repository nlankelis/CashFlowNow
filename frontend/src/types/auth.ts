export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  access_token?: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  token_type: string;
}

