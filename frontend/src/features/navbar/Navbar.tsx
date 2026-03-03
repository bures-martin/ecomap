import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-green-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-90">
          EcoMap
        </Link>
      </div>
    </nav>
  )
}
