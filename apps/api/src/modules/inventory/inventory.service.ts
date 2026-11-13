import { Prisma, prisma } from '@rental-vala/database';
import { ApiError } from '../../utils/ApiError';

export class InventoryService {
  /**
   * Calculates exact available quantity for a listing between startDate and endDate.
   * Accounts for confirmed/active/pending-payment bookings AND provider manual blocks.
   */
  static async getAvailableQuantity(
    listingId: string,
    startDate: Date,
    endDate: Date,
    tx: Prisma.TransactionClient = prisma
  ): Promise<{ totalQuantity: number; committedQuantity: number; availableQuantity: number }> {
    const inventory = await tx.inventoryItem.findUnique({
      where: { listingId },
    });

    if (!inventory) {
      throw new ApiError(404, 'Inventory record not found for this listing.');
    }

    // 1. Sum quantities from overlapping non-cancelled bookings
    const overlappingBookings = await tx.bookingItem.aggregate({
      _sum: { quantity: true },
      where: {
        listingId,
        booking: {
          status: {
            in: [
              'PENDING_PROVIDER_APPROVAL',
              'APPROVED',
              'PAYMENT_PENDING',
              'CONFIRMED',
              'READY_FOR_PICKUP',
              'OUT_FOR_DELIVERY',
              'ACTIVE',
              'RETURN_REQUESTED',
              'INSPECTION_PENDING',
            ],
          },
          AND: [{ startDate: { lt: endDate } }, { endDate: { gt: startDate } }],
        },
      },
    });

    // 2. Sum quantities from manual availability blocks / maintenance
    const overlappingBlocks = await tx.availabilityBlock.aggregate({
      _sum: { blockedQuantity: true },
      where: {
        inventoryItemId: inventory.id,
        AND: [{ startDate: { lt: endDate } }, { endDate: { gt: startDate } }],
      },
    });

    const bookedQty = overlappingBookings._sum.quantity ?? 0;
    const blockedQty = overlappingBlocks._sum.blockedQuantity ?? 0;
    const committedQuantity = bookedQty + blockedQty;
    const availableQuantity = Math.max(0, inventory.totalQuantity - committedQuantity);

    return {
      totalQuantity: inventory.totalQuantity,
      committedQuantity,
      availableQuantity,
    };
  }

  /**
   * Acquires a PostgreSQL row-level lock on inventory_items before verifying & reserving stock.
   */
  static async lockAndVerifyAvailability(
    tx: Prisma.TransactionClient,
    listingId: string,
    startDate: Date,
    endDate: Date,
    requestedQuantity: number
  ) {
    // Row-level lock prevents concurrent transactions from reading stale stock
    await tx.$queryRaw`SELECT id FROM inventory_items WHERE listing_id = ${listingId} FOR UPDATE`;

    const { availableQuantity } = await this.getAvailableQuantity(listingId, startDate, endDate, tx);
    if (availableQuantity < requestedQuantity) {
      throw new ApiError(
        409,
        `Insufficient inventory for selected dates. Only ${availableQuantity} unit(s) available.`
      );
    }
  }
}