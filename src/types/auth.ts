export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionTier: 'free' | 'pro';
  tokensUsedThisMonth: number;
  tokenResetDate: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
