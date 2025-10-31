"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function AnalyticsTestPage() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    fetch(`http://localhost:3000/get-analytics-summary/${currentUser.uid}`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setData({ error: err.message })
        setLoading(false)
      })
  }, [currentUser])

  if (!currentUser) {
    return <div className="p-8">Please log in</div>
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Analytics Data (Raw JSON)</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-screen text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
