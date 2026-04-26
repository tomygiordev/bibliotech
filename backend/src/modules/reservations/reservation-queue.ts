import { Prisma } from '@prisma/client';
import { addDays } from '../../shared/utils/date.js';

export const ACTIVE_RESERVATION_STATUSES = ['WAITING', 'READY'];
export const READY_RESERVATION_DAYS = 2;
export const WAITING_RESERVATION_DAYS = 30;

type TransactionClient = Prisma.TransactionClient;

export async function compactReservationQueue(
  tx: TransactionClient,
  copyId: string,
  fromPosition: number
) {
  await tx.reservation.updateMany({
    where: {
      copyId,
      status: 'WAITING',
      position: { gt: fromPosition },
    },
    data: {
      position: { decrement: 1 },
    },
  });
}

export async function promoteNextReservation(tx: TransactionClient, copyId: string, bookId?: string) {
  const nextReservation = await tx.reservation.findFirst({
    where: {
      copyId: copyId || undefined,
      bookId: bookId || undefined,
      status: 'WAITING',
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  if (!nextReservation) {
    return null;
  }

  const now = new Date();
  const promotedReservation = await tx.reservation.update({
    where: { id: nextReservation.id },
    data: {
      status: 'READY',
      position: 1,
      notifiedAt: now,
      expiresAt: addDays(now, READY_RESERVATION_DAYS),
    },
  });

  await compactReservationQueue(tx, nextReservation.copyId, nextReservation.position);

  await tx.copy.update({
    where: { id: nextReservation.copyId },
    data: { status: 'RESERVED' },
  });

  return promotedReservation;
}

export async function releaseOrPromoteReservation(tx: TransactionClient, copyId: string, bookId?: string) {
  const promotedReservation = await promoteNextReservation(tx, copyId, bookId);

  if (!promotedReservation) {
    await tx.copy.update({
      where: { id: copyId },
      data: { status: 'AVAILABLE' },
    });
  }

  return promotedReservation;
}

export async function promoteNextReservationByBook(tx: TransactionClient, bookId: string) {
  const nextReservation = await tx.reservation.findFirst({
    where: { bookId, status: 'WAITING' },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  if (!nextReservation) {
    return null;
  }

  const availableCopy = await tx.copy.findFirst({
    where: {
      bookId,
      status: 'AVAILABLE',
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!availableCopy) {
    return null;
  }

  const now = new Date();
  await tx.reservation.update({
    where: { id: nextReservation.id },
    data: {
      copyId: availableCopy.id,
      status: 'READY',
      position: 1,
      notifiedAt: now,
      expiresAt: addDays(now, READY_RESERVATION_DAYS),
    },
  });

  await tx.copy.update({
    where: { id: availableCopy.id },
    data: { status: 'RESERVED' },
  });

  return { reservation: nextReservation, copy: availableCopy };
}
