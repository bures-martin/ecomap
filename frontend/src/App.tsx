import { Routes, Route } from 'react-router-dom'
import Navbar from './features/navbar/Navbar'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  )
}
