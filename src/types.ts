export interface User {
  id: string;
  name?: string;
  avatar?: string;
  initials: string;
  role?: string;
  email?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  points?: number;
  is_premium?: boolean;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earn' | 'spend';
  description: string;
  createdAt: string;
}

export interface Story {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  imageUrl: string;
  videoUrl?: string;
  additionalImages?: string[];
  type: 'video' | 'audio' | 'image';
  date: string;
  pages?: number;
  metadata?: Record<string, any>;
  promptId?: string;
}

export interface Prompt {
  id: string;
  question: string;
  imageUrl: string;
  sentDate: string;
  status: 'sent' | 'draft' | 'recorded';
  isRecorded?: boolean;
  category?: string;
  recordedDate?: string;
}

export interface QuestionTemplate {
  id: string;
  category: string;
  text: string;
}

export interface Order {
  id: string;
  bookTitle: string;
  bookSubtitle: string;
  bookAuthor: string;
  coverColor: string;
  imageUrl: string;
  status: 'processing' | 'shipped' | 'delivered';
  date: string;
  price: string;
  recipientName?: string;
  contactPhone?: string;
  shippingAddress?: string;
  isExample?: boolean;
  trackingNumber?: string;
  logistics?: {
    time: string;
    description: string;
  }[];
  created_at?: string;
}

export interface ProjectMember extends User {
  projectRole: 'owner' | 'collaborator' | 'storyteller';
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: ProjectMember[];
  createdAt: string;
}

export interface StoryInteraction {
  id: string;
  storyId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  type: 'like' | 'reaction';
  content?: string;
  createdAt: string;
}

export type ViewType = 'home' | 'stories' | 'prompts' | 'order' | 'settings' | 'account' | 'story-detail' | 'order-detail' | 'add-story' | 'project-detail' | 'recording' | 'buy-now' | 'redemption' | 'membership' | 'upgrade-payment';
