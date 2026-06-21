import { useState } from 'react'
import './App.css'

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const [history, setHistory] = useState([])

  async function shorten(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.shortUrl)
      setHistory(prev => [{ original: url, short: data.shortUrl }, ...prev.slice(0, 9)])
      setUrl('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function copy(text, id) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="page">
      <div className="card">
        <h1>URL Shortener</h1>
        <p className="subtitle">Paste a long URL to get a short one instantly</p>

        <form onSubmit={shorten} className="form">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/very/long/url/here"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? '...' : 'Shorten'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {result && (
          <div className="result">
            <a href={result} target="_blank" rel="noopener noreferrer">{result}</a>
            <button className="copy-btn" onClick={() => copy(result, 'result')}>
              {copied === 'result' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="history">
            <p className="history-label">Recent</p>
            <ul>
              {history.map((item, i) => (
                <li key={i}>
                  <span className="original" title={item.original}>{item.original}</span>
                  <a href={item.short} target="_blank" rel="noopener noreferrer">{item.short}</a>
                  <button onClick={() => copy(item.short, i)}>
                    {copied === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
