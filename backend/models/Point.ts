import pool from '../config/database';

export interface Point {
  id: number;
  name: string;
  description: string;
  location: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePointDto {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

export interface UpdatePointDto {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

interface PointRow {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  created_at: Date;
  updated_at: Date;
}

const PointModel = {
  async findAll(): Promise<PointRow[]> {
    const result = await pool.query<PointRow>(
      `SELECT id, name, description,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude,
              created_at, updated_at
       FROM points
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async findById(id: number): Promise<PointRow | null> {
    const result = await pool.query<PointRow>(
      `SELECT id, name, description,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude,
              created_at, updated_at
       FROM points
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async create(data: CreatePointDto): Promise<PointRow> {
    const result = await pool.query<PointRow>(
      `INSERT INTO points (name, description, location)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
       RETURNING id, name, description,
                 ST_Y(location::geometry) AS latitude,
                 ST_X(location::geometry) AS longitude,
                 created_at, updated_at`,
      [data.name, data.description, data.longitude, data.latitude]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: UpdatePointDto): Promise<PointRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.latitude !== undefined && data.longitude !== undefined) {
      fields.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)`);
      values.push(data.longitude, data.latitude);
      paramIndex += 2;
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<PointRow>(
      `UPDATE points
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description,
                 ST_Y(location::geometry) AS latitude,
                 ST_X(location::geometry) AS longitude,
                 created_at, updated_at`,
      values
    );
    return result.rows[0] ?? null;
  },

  async destroy(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM points WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

export default PointModel;
