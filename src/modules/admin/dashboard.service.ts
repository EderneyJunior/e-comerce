import { Prisma, OrderStatus } from '@prisma/client';
import { subDays, startOfDay, format } from 'date-fns';
import { prisma } from '#config/prisma';

const PAID_STATUSES: OrderStatus[] = [
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

interface Overview {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  today: { revenue: number; orders: number };
  last30Days: { revenue: number; orders: number };
}

interface RecentOrder {
  id: string;
  total: number;
  status: OrderStatus;
  customer: string;
  createdAt: Date;
}

interface TopProduct {
  name: string;
  totalSold: number;
  totalRevenue: number;
}

interface RevenueByDay {
  date: string;
  revenue: number;
}

interface DashboardSummary {
  overview: Overview;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  ordersByStatus: Record<string, number>;
  revenueByDay: RevenueByDay[];
}

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const today = startOfDay(new Date());
    const last30Days = subDays(today, 30);
    const last7Days = subDays(today, 7);

    const paidStatusFilter: Prisma.OrderWhereInput['status'] = {
      in: PAID_STATUSES,
    };

    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      revenueToday,
      ordersToday,
      revenueLast30Days,
      ordersLast30Days,
      recentOrders,
      topProducts,
      ordersByStatus,
    ] = await prisma.$transaction([
      prisma.order.aggregate({
        where: { status: paidStatusFilter },
        _sum: { total: true },
      }),

      prisma.order.count(),

      prisma.user.count({ where: { role: 'CUSTOMER', isActive: true } }),

      prisma.product.count({ where: { isActive: true, deletedAt: null } }),

      prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: paidStatusFilter },
        _sum: { total: true },
      }),

      prisma.order.count({ where: { createdAt: { gte: today } } }),

      prisma.order.aggregate({
        where: { createdAt: { gte: last30Days }, status: paidStatusFilter },
        _sum: { total: true },
      }),

      prisma.order.count({ where: { createdAt: { gte: last30Days } } }),

      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),

      prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: { status: paidStatusFilter } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const revenueByDay = await this.buildRevenueByDay(last7Days);

    return {
      overview: {
        totalRevenue: Number(totalRevenue._sum.total ?? 0),
        totalOrders,
        totalCustomers,
        totalProducts,
        today: {
          revenue: Number(revenueToday._sum.total ?? 0),
          orders: ordersToday,
        },
        last30Days: {
          revenue: Number(revenueLast30Days._sum.total ?? 0),
          orders: ordersLast30Days,
        },
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        total: Number(o.total),
        status: o.status,
        customer: o.user.name,
        createdAt: o.createdAt,
      })),
      topProducts: topProducts.map((p) => ({
        name: p.productName,
        totalSold: p._sum.quantity ?? 0,
        totalRevenue: Number(p._sum.subtotal ?? 0),
      })),
      ordersByStatus: ordersByStatus.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count.status }),
        {} as Record<string, number>,
      ),
      revenueByDay,
    };
  }

  private async buildRevenueByDay(since: Date): Promise<RevenueByDay[]> {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { in: PAID_STATUSES } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, number>();

    for (const order of orders) {
      const day = format(order.createdAt, 'dd/MM');
      const current = grouped.get(day) ?? 0;
      grouped.set(day, current + Number(order.total));
    }

    return Array.from(grouped.entries()).map(([date, revenue]) => ({
      date,
      revenue: Number(revenue.toFixed(2)),
    }));
  }
}

export const dashboardService = new DashboardService();
