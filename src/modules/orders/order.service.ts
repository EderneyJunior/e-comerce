import { Prisma, OrderStatus } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { prisma } from '#config/prisma';
import { NotFoundError, AppError, ForbiddenError } from '#shared/errors/appError';
import type { CheckoutInput, UpdateOrderStatusInput, OrderFilterInput } from './order.schema';

const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'PAYMENT_CONFIRMED', 'PROCESSING'];

const VALID_TRANSATIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export class OrderService {}
