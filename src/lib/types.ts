// Shared domain types for SwapShelf

export type ItemType = "BOOK" | "BOARD_GAME";
export type ItemCondition =
  | "NEW"
  | "LIKE_NEW"
  | "GOOD"
  | "FAIR"
  | "WORN";
export type ItemStatus =
  | "AVAILABLE"
  | "REQUESTED"
  | "IN_TRANSIT"
  | "BORROWED"
  | "RETURNED"
  | "STOLEN"
  | "REMOVED";

export type LoanStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "MEETING_SCHEDULED"
  | "BORROWED"
  | "OVERDUE"
  | "RETURNED"
  | "STOLEN"
  | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  sessionToken?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  latitude: number;
  longitude: number;
  zipCode?: string | null;
  neighborhood?: string | null;
  swapScore: number;
  createdAt: string;
}

export interface Item {
  id: string;
  ownerId: string;
  type: ItemType;
  title: string;
  creator?: string | null;
  isbn?: string | null;
  imageUrl?: string | null;
  condition: ItemCondition;
  description?: string | null;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  distanceMiles?: number;
}

export interface Loan {
  id: string;
  itemId: string;
  borrowerId: string;
  lenderId: string;
  status: LoanStatus;
  startDate?: string | null;
  dueDate?: string | null;
  returnedDate?: string | null;
  proposedReturnDate?: string | null;
  createdAt: string;
  updatedAt: string;
  item?: Item;
  borrower?: User;
  lender?: User;
  meetup?: MeetupSpot | null;
  lastMessage?: Message | null;
}

export interface Message {
  id: string;
  loanId: string;
  senderId: string;
  text: string;
  systemEvent?: string | null;
  createdAt: string;
}

export interface MeetupSpot {
  id: string;
  loanId: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  suggestedBy: string;
  agreedBy?: string | null;
  status: string;
  createdAt: string;
}

export interface Review {
  id: string;
  loanId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  isRevealed: boolean;
  createdAt: string;
  reviewer?: { name: string; avatarUrl?: string | null };
}

export type AppView =
  | "landing"
  | "login"
  | "signup"
  | "onboarding"
  | "dashboard"
  | "discover"
  | "loan"
  | "profile"
  | "items";

export interface DiscoverFilters {
  type: ItemType | "ALL";
  condition: ItemCondition | "ALL";
  availability: "available" | "all";
  radiusMiles: number;
  query: string;
}
