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

export async function promoteNextReservation(tx: TransactionClient, copyId: string) {
  const nextReservation = await tx.reservation.findFirst({
    where: { copyId, status: 'WAITING' },
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

  await compactReservationQueue(tx, copyId, nextReservation.position);

  await tx.copy.update({
    where: { id: copyId },
    data: { status: 'RESERVED' },
  });

  return promotedReservation;
}

export async function releaseOrPromoteReservation(tx: TransactionClient, copyId: string) {
  const promotedReservation = await promoteNextReservation(tx, copyId);

  if (!promotedReservation) {
    await tx.copy.update({
      where: { id: copyId },
      data: { status: 'AVAILABLE' },
    });
  }

  return promotedReservation;
}
