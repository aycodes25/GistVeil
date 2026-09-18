export type Category =
  | 'relationship'
  | 'money'
  | 'family'
  | 'work'
  | 'mental_health'
  | 'education';

export interface AnonUser {
  id: string;
  anon_name: string;
  device_token: string;
}

export interface Post {
  id: string;
  anon_user_id: string;
  category: Category;
  body: string;
  report_count: number;
  created_at: string;
  anon_users?: { anon_name: string };
  advice_count?: number;
}

export interface Advice {
  id: string;
  post_id: string;
  anon_user_id: string;
  body: string;
  upvotes: number;
  report_count: number;
  created_at: string;
  anon_users?: { anon_name: string };
}
