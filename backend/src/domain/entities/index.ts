export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
  isActive: boolean;
  blockedUntil: Date | null;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  synopsis: string | null;
  coverUrl: string | null;
  publishedYear: number | null;
  publisher: string | null;
  language: string;
  pageCount: number | null;
  authorId: string;
  genreId: string;
}

export interface Copy {
  id: string;
  barcode: string;
  status: 'AVAILABLE' | 'LOANED' | 'RESERVED' | 'MAINTENANCE' | 'TRANSFERRED';
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  bookId: string;
  branchId: string;
}

export interface Loan {
  id: string;
  userId: string;
  copyId: string;
  branchId: string;
  loanDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  renewalCount: number;
  maxRenewals: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  schedule: { open: string; close: string };
}
