import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Mock data interface
interface DataItem {
  id: number;
  name: string;
  value: number;
}

interface MockData {
  message: string;
  data: DataItem[];
  timestamp: string;
}

const mockData: MockData = {
  message: 'Hello from Express backend! (Using mock data)',
  data: [
    { id: 1, name: 'Item 1', value: 100 },
    { id: 2, name: 'Item 2', value: 200 },
    { id: 3, name: 'Item 3', value: 300 },
  ],
  timestamp: new Date().toISOString(),
};

// GET endpoint - fetch data from PostgreSQL with fallback to mock data
app.get('/api/data', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Try to query the database
    const result = await pool.query(
      'SELECT id, name, value FROM items ORDER BY id'
    );
    
    res.json({
      message: 'Hello from Express backend with PostgreSQL!',
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Database query error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Fallback to mock data if database is not available
    console.warn('Falling back to mock data');
    res.json(mockData);
  }
});


app.listen(PORT, (): void => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
