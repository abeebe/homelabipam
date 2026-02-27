import { useEffect, useState } from 'react'
import { auditLogAPI, APIError } from '../api'
import { AuditLogEntry } from '../types'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
  SYNC: 'badge-purple',
  POPULATE: 'badge-teal',
}

const ENTITY_TYPES = ['all', 'Network', 'IPAddress', 'Device', 'Setting']
const ACTIONS = ['all', 'CREATE', 'UPDATE', 'DELETE', 'SYNC', 'POPULATE']

function formatChanges(changesJson: string | null): string {
  if (!changesJson) return '—'
  try {
    const c = JSON.parse(changesJson)
    const parts: string[] = []

    for (const [key, val] of Object.entries(c)) {
      if (val && typeof val === 'object' && 'from' in val && 'to' in val) {
        const v = val as { from: unknown; to: unknown }
        parts.push(`${key}: ${String(v.from ?? '—')} → ${String(v.to ?? '—')}`)
      } else if (key === 'updatedKeys' && Array.isArray(val)) {
        parts.push(`keys: ${(val as string[]).join(', ')}`)
      } else if (key === 'created' && typeof val === 'number') {
        parts.push(`${val} IPs created`)
      } else if (key !== 'total' && key !== 'existing') {
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
        if (str.length < 40) parts.push(`${key}: ${str}`)
      }
    }

    return parts.slice(0, 3).join(' · ') || '—'
  } catch {
    return changesJson.slice(0, 80)
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const PAGE_SIZE = 50

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityType, setEntityType] = useState('all')
  const [action, setAction] = useState('all')

  async function load(p = page) {
    try {
      setLoading(true)
      setError(null)
      const result = await auditLogAPI.getAll({
        page: p,
        limit: PAGE_SIZE,
        entityType: entityType !== 'all' ? entityType : undefined,
        action: action !== 'all' ? action : undefined,
      })
      setLogs(result.logs)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof APIError) setError(`Error: ${err.message}`)
      else setError('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    load(1)
  }, [entityType, action])

  useEffect(() => {
    load(page)
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="audit-page">
      <div className="page-header">
        <h2>Audit Log</h2>
        <span className="filter-count">{total.toLocaleString()} events</span>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filters">
        <label htmlFor="audit-entity">Entity Type</label>
        <select
          id="audit-entity"
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
        >
          {ENTITY_TYPES.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
          ))}
        </select>

        <label htmlFor="audit-action">Action</label>
        <select
          id="audit-action"
          value={action}
          onChange={e => setAction(e.target.value)}
        >
          {ACTIONS.map(a => (
            <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>
          ))}
        </select>

        <button className="btn btn-sm" onClick={() => load(page)}>↻ Refresh</button>
      </div>

      {loading ? (
        <p>Loading audit log...</p>
      ) : logs.length === 0 ? (
        <p className="empty-state">No audit log entries found.</p>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity</th>
                  <th>Changes</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td title={formatDate(log.createdAt)}>
                      <span className="audit-time">{timeAgo(log.createdAt)}</span>
                      <br />
                      <small className="text-subtle">{formatDate(log.createdAt)}</small>
                    </td>
                    <td>
                      <span className={`action-badge ${ACTION_COLORS[log.action] ?? 'badge-gray'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="audit-entity-type">{log.entityType}</td>
                    <td className="audit-entity-name">{log.entityName ?? log.entityId ?? '—'}</td>
                    <td className="audit-changes">{formatChanges(log.changes)}</td>
                    <td>
                      <span className={`source-badge ${log.source === 'SYSTEM' ? 'source-system' : 'source-user'}`}>
                        {log.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
