import { env } from '#config/env';

export interface ShippingOptions {
  code: string;
  name: string;
  price: number;
  estimatedDays: number;
}

export interface CartTotals {
  subTotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
}

export async function calculateShipping(
  zipcode: string,
  totalWeight: number,
  subTotal: number,
): Promise<ShippingOptions[]> {
  const clenZip = String(zipcode).replace(/\D/g, '');
  if (clenZip.length !== 8) {
    throw new Error('CEP inválido');
  }

  if (subTotal >= env.SHIPPING_FREE_ABOVE) {
    return [
      {
        code: 'free',
        name: 'Frete Grátis',
        price: 0,
        estimatedDays: 7,
      },
    ];
  }

  const base = env.SHIPPING_BASE_RATE;
  const weightRate = Math.max(totalWeight, 0.3) * env.SHIPPING_RATE_PER_KG;
  const region = Number.parseInt(clenZip[0]);

  const regionMultiplier = region <= 3 ? 1.0 : region <= 6 ? 1.3 : 1.6;
  const stdPrice = Number.parseFloat(((base + weightRate) * regionMultiplier).toFixed(2));
  const expPrice = Number.parseFloat((stdPrice * 1.8).toFixed());

  return [
    {
      code: 'STANDARD',
      name: 'Entrega Padrão (PAC)',
      price: expPrice,
      estimatedDays: region <= 3 ? 5 : region <= 6 ? 8 : 12,
    },
    {
      code: 'EXPRESS',
      name: 'Entrega Expressa (SEDEX)',
      price: expPrice,
      estimatedDays: region <= 3 ? 2 : region <= 6 ? 4 : 6,
    },
  ];
}

export function calculateTotals(
  subTotal: number,
  discountAmount: number,
  shippingPrice: number,
): CartTotals {
  const freeShipping = subTotal >= env.SHIPPING_FREE_ABOVE || shippingPrice === 0;
  const effectiveShipping = freeShipping ? 0 : shippingPrice;
  const total = Math.max(0, subTotal - discountAmount + effectiveShipping);

  return {
    subTotal: Number.parseFloat(subTotal.toFixed()),
    discount: Number.parseFloat(discountAmount.toFixed()),
    shipping: Number.parseFloat(effectiveShipping.toFixed()),
    total: Number.parseFloat(total.toFixed()),
    freeShipping,
  };
}
