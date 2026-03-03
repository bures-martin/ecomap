import { Request, Response } from 'express';
import PointModel from '../models/Point';

const PointController = {
  async index(_req: Request, res: Response): Promise<void> {
    try {
      const points = await PointModel.findAll();
      res.json({ data: points });
    } catch (error) {
      console.error('Failed to fetch points:', error);
      res.status(500).json({ error: 'Failed to fetch points' });
    }
  },

  async show(req: Request, res: Response): Promise<void> {
    try {
      const point = await PointModel.findById(Number(req.params['id']));

      if (!point) {
        res.status(404).json({ error: 'Point not found' });
        return;
      }

      res.json({ data: point });
    } catch (error) {
      console.error('Failed to fetch point:', error);
      res.status(500).json({ error: 'Failed to fetch point' });
    }
  },

  async store(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, latitude, longitude } = req.body as {
        name: string;
        description: string;
        latitude: number;
        longitude: number;
      };

      if (!name || !description || latitude == null || longitude == null) {
        res.status(422).json({ error: 'Missing required fields: name, description, latitude, longitude' });
        return;
      }

      const point = await PointModel.create({ name, description, latitude, longitude });
      res.status(201).json({ data: point });
    } catch (error) {
      console.error('Failed to create point:', error);
      res.status(500).json({ error: 'Failed to create point' });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params['id']);
      const { name, description, latitude, longitude } = req.body as {
        name?: string;
        description?: string;
        latitude?: number;
        longitude?: number;
      };

      const point = await PointModel.update(id, { name, description, latitude, longitude });

      if (!point) {
        res.status(404).json({ error: 'Point not found' });
        return;
      }

      res.json({ data: point });
    } catch (error) {
      console.error('Failed to update point:', error);
      res.status(500).json({ error: 'Failed to update point' });
    }
  },

  async destroy(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await PointModel.destroy(Number(req.params['id']));

      if (!deleted) {
        res.status(404).json({ error: 'Point not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete point:', error);
      res.status(500).json({ error: 'Failed to delete point' });
    }
  },
};

export default PointController;
