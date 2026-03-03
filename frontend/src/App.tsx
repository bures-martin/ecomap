import { useEffect, useState } from 'react'
import { z } from 'zod'

// Zod schema for data validation
const DataItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  value: z.number().int().nonnegative(),
})

const ApiResponseSchema = z.object({
  message: z.string().min(1),
  data: z.array(DataItemSchema),
  timestamp: z.string().datetime(),
})

type ApiResponse = z.infer<typeof ApiResponseSchema>

function App() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:3001/api/data')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const jsonData = await response.json()
        
        // Validate data with Zod
        const result = ApiResponseSchema.parse(jsonData)
        
        setData(result)
        setError(null)
      } catch (err) {
        if (err instanceof z.ZodError) {
          // Handle Zod validation errors
          const errorMessages = err.issues
            .map((issue) => {
              const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
              return `${path}: ${issue.message}`
            })
            .join(', ')
          setError(`Data validation failed: ${errorMessages}`)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch data')
        }
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {data?.message}
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <p className="text-sm text-gray-500 mb-4">
            Fetched at: {data?.timestamp}
          </p>
          
          <h2 className="text-xl font-semibold mb-4">Data Items:</h2>
          <div className="space-y-2">
            {data?.data.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded border"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-blue-600 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
