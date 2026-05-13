import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { updateProfileSchema, changePasswordSchema, addressSchema } from './user.schema';
import { z } from 'zod';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getProfile(req.user!.id);
      return res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateProfileSchema.parse(req.body);
      const user = await userService.updateProfile(req.user!.id, data);
      return res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = changePasswordSchema.parse(req.body);
      await userService.changePassword(req.user!.id, data);
      return res.json({ status: 'success', message: 'Senha alterada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  async listAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await userService.listAddresses(req.user!.id);
      return res.json({ status: 'success', data: addresses });
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const data = addressSchema.parse(req.body);
      const address = await userService.addAddress(req.user!.id, data);
      return res.json({ status: 'success', data: address });
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = addressSchema.partial().parse(req.body);
      const address = await userService.updateAddress(id, req.user!.id, data);
      return res.json({ status: 'success', data: address });
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await userService.deleteAddress(id, req.user!.id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = z
        .object({
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(20),
        })
        .parse(req.query);

      const users = await userService.listUsers(page, limit);
      return res.json({ status: 'success', data: users });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await userService.getUserById(id);
      return res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }

  async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await userService.toggleUserStatus(id);
      return res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
