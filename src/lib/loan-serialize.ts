import type { Loan, User, Item, MeetupSpot, Message } from "@prisma/client";

export type LoanWithRelations = Loan & {
  item: Item & { owner: User };
  borrower: User;
  lender: User;
  meetup: MeetupSpot | null;
  lastMessage?: Message | null;
};

export interface SerializedLoan {
  id: string;
  itemId: string;
  borrowerId: string;
  lenderId: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  returnedDate: string | null;
  proposedReturnDate: string | null;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    ownerId: string;
    type: string;
    title: string;
    creator: string | null;
    isbn: string | null;
    imageUrl: string | null;
    condition: string;
    description: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    owner: {
      id: string;
      name: string;
      neighborhood: string | null;
      swapScore: number;
      avatarUrl: string | null;
    };
  };
  borrower: {
    id: string;
    email: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    neighborhood: string | null;
    swapScore: number;
    createdAt: string;
  };
  lender: {
    id: string;
    email: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    neighborhood: string | null;
    swapScore: number;
    createdAt: string;
  };
  meetup: {
    id: string;
    loanId: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    suggestedBy: string;
    agreedBy: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  lastMessage: {
    id: string;
    loanId: string;
    senderId: string;
    text: string;
    systemEvent: string | null;
    createdAt: string;
  } | null;
}

function pubUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    neighborhood: u.neighborhood,
    swapScore: u.swapScore,
    createdAt: u.createdAt.toISOString(),
  };
}

function pubOwner(u: User) {
  return {
    id: u.id,
    name: u.name,
    neighborhood: u.neighborhood,
    swapScore: u.swapScore,
    avatarUrl: u.avatarUrl,
  };
}

export function serializeLoan(loan: LoanWithRelations): SerializedLoan {
  return {
    id: loan.id,
    itemId: loan.itemId,
    borrowerId: loan.borrowerId,
    lenderId: loan.lenderId,
    status: loan.status,
    startDate: loan.startDate ? loan.startDate.toISOString() : null,
    dueDate: loan.dueDate ? loan.dueDate.toISOString() : null,
    returnedDate: loan.returnedDate ? loan.returnedDate.toISOString() : null,
    proposedReturnDate: loan.proposedReturnDate
      ? loan.proposedReturnDate.toISOString()
      : null,
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
    item: {
      id: loan.item.id,
      ownerId: loan.item.ownerId,
      type: loan.item.type,
      title: loan.item.title,
      creator: loan.item.creator,
      isbn: loan.item.isbn,
      imageUrl: loan.item.imageUrl,
      condition: loan.item.condition,
      description: loan.item.description,
      status: loan.item.status,
      createdAt: loan.item.createdAt.toISOString(),
      updatedAt: loan.item.updatedAt.toISOString(),
      owner: pubOwner(loan.item.owner),
    },
    borrower: pubUser(loan.borrower),
    lender: pubUser(loan.lender),
    meetup: loan.meetup
      ? {
          id: loan.meetup.id,
          loanId: loan.meetup.loanId,
          name: loan.meetup.name,
          address: loan.meetup.address,
          latitude: loan.meetup.latitude,
          longitude: loan.meetup.longitude,
          suggestedBy: loan.meetup.suggestedBy,
          agreedBy: loan.meetup.agreedBy,
          status: loan.meetup.status,
          createdAt: loan.meetup.createdAt.toISOString(),
          updatedAt: loan.meetup.updatedAt.toISOString(),
        }
      : null,
    lastMessage: loan.lastMessage
      ? {
          id: loan.lastMessage.id,
          loanId: loan.lastMessage.loanId,
          senderId: loan.lastMessage.senderId,
          text: loan.lastMessage.text,
          systemEvent: loan.lastMessage.systemEvent,
          createdAt: loan.lastMessage.createdAt.toISOString(),
        }
      : null,
  };
}

export const loanInclude = {
  item: { include: { owner: true } },
  borrower: true,
  lender: true,
  meetup: true,
} as const;
