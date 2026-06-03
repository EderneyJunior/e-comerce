import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { calculateShipping } from './shipping.service';
import {
  addItemSchema,
  updateItemSchema,
  couponSchema,
  margeCartSchema,
  shippingSchema,
} from './cart.schema';
import { env } from '#config/env';
import { AppError } from '#shared/errors/appError';


