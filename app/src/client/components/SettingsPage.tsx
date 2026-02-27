import { useEffect, useState } from 'react'
import { settingsAPI, unifiAPI, APIError } from '../api'

const PLACEHOLDER = '***'

type SettingValues = Record<string, string> & {
  UNIFI_URL: string
  UNIFI_API_KEY: string
  PROXMOX_URL: string
  PROXMOX_TOKEN_ID: string
  PROXMOX_TOKEN_SECRET: string
  PIHOLE_URL: string
  PIHOLE_API_KEY: string
  ADGUARD_URL: string
  ADGUARD_PASSWORD: string
  DOCKER_URL: string
  PORTAINER_URL: string
  PORTAINER_API_KEY: string
}

const DEFAULTS: SettingValues = {
  UNIFI_URL: '',
  UNIFI_API_KEY: '',
  PROXMOX_URL: '',
  PROXMOX_TOKEN_ID: '',
  PROXMOX_TOKEN_SECRET: '',
  PIHOLE_URL: '',
  PIHOLE_API_KEY: '',
  ADGUARD_URL: '',
  ADGUARD_PASSWORD: '',
  DOCKER_URL: '',
  PORTAINER_URL: '',
  PORTAINER_API_KEY: '',
}

export default function SettingsPage() {
  const [values, setValues] = useState<SettingValues>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const data = await settingsAPI.getAll()
      setValues({
        UNIFI_URL: data.UNIFI_URL ?? '',
        UNIFI_API_KEY: data.UNIFI_API_KEY ?? '',
        PROXMOX_URL: data.PROXMOX_URL ?? '',
        PROXMOX_TOKEN_ID: data.PROXMOX_TOKEN_ID ?? '',
        PROXMOX_TOKEN_SECRET: data.PROXMOX_TOKEN_SECRET ?? '',
        PIHOLE_URL: data.PIHOLE_URL ?? '',
        PIHOLE_API_KEY: data.PIHOLE_API_KEY ?? '',
        ADGUARD_URL: data.ADGUARD_URL ?? '',
        ADGUARD_PASSWORD: data.ADGUARD_PASSWORD ?? '',
        DOCKER_URL: data.DOCKER_URL ?? '',
        PORTAINER_URL: data.PORTAINER_URL ?? '',
        PORTAINER_API_KEY: data.PORTAINER_API_KEY ?? '',
      })
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  function set(key: keyof SettingValues, value: string) {
    setValues(v => ({ ...v, [key]: value }))
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await settingsAPI.update(values)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await loadSettings()
    } catch (err) {
      if (err instanceof APIError) setError(`Save failed: ${err.message}`)
      else setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestUnifi() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await unifiAPI.getStatus()
      setTestResult({
        connected: result.connected,
        message: result.connected
          ? `Connected — ${result.url}${result.siteCount !== undefined ? ` (${result.siteCount} site${result.siteCount !== 1 ? 's' : ''})` : ''}`
          : `Failed — ${result.error || 'Could not connect'}`,
      })
    } catch {
      setTestResult({ connected: false, message: 'Connection test failed' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="settings-page"><p>Loading settings...</p></div>

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings</h2>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* ── UniFi Integration ── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <h3>UniFi Integration</h3>
            <p className="settings-section-desc">
              Connect to your UniFi Network controller to auto-discover devices and networks.
              Requires the Network Integration API key (Settings → System → Integrations in UniFi OS).
            </p>
          </div>
          <button className="btn btn-sm" onClick={handleTestUnifi} disabled={testing}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

        {testResult && (
          <div className={`test-result ${testResult.connected ? 'test-success' : 'test-fail'}`}>
            {testResult.connected ? '✓' : '✗'} {testResult.message}
          </div>
        )}

        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="unifi-url">Controller URL</label>
            <p className="field-hint">Base URL of your UniFi controller, e.g. <code>https://10.10.1.1</code></p>
            <input
              id="unifi-url" type="text" value={values.UNIFI_URL}
              onChange={e => set('UNIFI_URL', e.target.value)}
              placeholder="https://192.168.1.1" spellCheck={false}
            />
          </div>
          <div className="settings-field">
            <label htmlFor="unifi-api-key">API Key</label>
            <p className="field-hint">
              Generate in UniFi OS → Settings → Integrations → Add Integration Key.
              {values.UNIFI_API_KEY === PLACEHOLDER && <span className="configured-badge"> ✓ Configured</span>}
            </p>
            <input
              id="unifi-api-key" type="password" value={values.UNIFI_API_KEY}
              onChange={e => set('UNIFI_API_KEY', e.target.value)}
              placeholder={values.UNIFI_API_KEY === PLACEHOLDER ? 'Leave blank to keep existing key' : 'Paste API key here'}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* ── Proxmox Integration ── */}
      <div className="settings-section settings-section-disabled">
        <div className="settings-section-header">
          <div>
            <h3>Proxmox Integration <span className="coming-soon">Coming Soon</span></h3>
            <p className="settings-section-desc">
              Connect to Proxmox VE to discover VMs and containers with static IPs not visible via DHCP.
            </p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="proxmox-url">Proxmox URL</label>
            <p className="field-hint">Base URL of your Proxmox node, e.g. <code>https://10.10.1.2:8006</code></p>
            <input id="proxmox-url" type="text" value={values.PROXMOX_URL}
              onChange={e => set('PROXMOX_URL', e.target.value)}
              placeholder="https://proxmox.local:8006" disabled />
          </div>
          <div className="settings-field">
            <label htmlFor="proxmox-token-id">Token ID</label>
            <p className="field-hint">API token in the format <code>user@pam!tokenname</code></p>
            <input id="proxmox-token-id" type="text" value={values.PROXMOX_TOKEN_ID}
              onChange={e => set('PROXMOX_TOKEN_ID', e.target.value)}
              placeholder="root@pam!ipam" disabled />
          </div>
          <div className="settings-field">
            <label htmlFor="proxmox-token-secret">Token Secret</label>
            <p className="field-hint">
              UUID token secret from Proxmox.
              {values.PROXMOX_TOKEN_SECRET === PLACEHOLDER && <span className="configured-badge"> ✓ Configured</span>}
            </p>
            <input id="proxmox-token-secret" type="password" value={values.PROXMOX_TOKEN_SECRET}
              onChange={e => set('PROXMOX_TOKEN_SECRET', e.target.value)}
              placeholder="Paste token secret here" autoComplete="off" disabled />
          </div>
        </div>
      </div>

      {/* ── Pi-hole ── */}
      <div className="settings-section settings-section-disabled">
        <div className="settings-section-header">
          <div>
            <h3>Pi-hole <span className="coming-soon">Coming Soon</span></h3>
            <p className="settings-section-desc">
              Sync DNS records with Pi-hole so hostnames resolve automatically when IPs are assigned.
            </p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="pihole-url">Pi-hole URL</label>
            <p className="field-hint">Base URL of your Pi-hole instance, e.g. <code>http://pi.hole</code></p>
            <input id="pihole-url" type="text" value={values.PIHOLE_URL}
              onChange={e => set('PIHOLE_URL', e.target.value)}
              placeholder="http://192.168.1.2" disabled />
          </div>
          <div className="settings-field">
            <label htmlFor="pihole-api-key">API Key / Password</label>
            <p className="field-hint">
              Found in Pi-hole Admin → Settings → API.
              {values.PIHOLE_API_KEY === PLACEHOLDER && <span className="configured-badge"> ✓ Configured</span>}
            </p>
            <input id="pihole-api-key" type="password" value={values.PIHOLE_API_KEY}
              onChange={e => set('PIHOLE_API_KEY', e.target.value)}
              placeholder="Paste API key here" autoComplete="off" disabled />
          </div>
        </div>
      </div>

      {/* ── AdGuard Home ── */}
      <div className="settings-section settings-section-disabled">
        <div className="settings-section-header">
          <div>
            <h3>AdGuard Home <span className="coming-soon">Coming Soon</span></h3>
            <p className="settings-section-desc">
              Sync DNS records with AdGuard Home so hostnames resolve automatically when IPs are assigned.
            </p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="adguard-url">AdGuard Home URL</label>
            <p className="field-hint">Base URL of your AdGuard Home instance, e.g. <code>http://adguard.local:3000</code></p>
            <input id="adguard-url" type="text" value={values.ADGUARD_URL}
              onChange={e => set('ADGUARD_URL', e.target.value)}
              placeholder="http://192.168.1.3:3000" disabled />
          </div>
          <div className="settings-field">
            <label htmlFor="adguard-password">Admin Password</label>
            <p className="field-hint">
              Admin password for your AdGuard Home instance.
              {values.ADGUARD_PASSWORD === PLACEHOLDER && <span className="configured-badge"> ✓ Configured</span>}
            </p>
            <input id="adguard-password" type="password" value={values.ADGUARD_PASSWORD}
              onChange={e => set('ADGUARD_PASSWORD', e.target.value)}
              placeholder="Paste password here" autoComplete="off" disabled />
          </div>
        </div>
      </div>

      {/* ── Docker ── */}
      <div className="settings-section settings-section-disabled">
        <div className="settings-section-header">
          <div>
            <h3>Docker <span className="coming-soon">Coming Soon</span></h3>
            <p className="settings-section-desc">
              Connect directly to a Docker socket or remote host to discover container IPs automatically.
            </p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="docker-url">Docker Socket / Host URL</label>
            <p className="field-hint">Docker host URL or socket path, e.g. <code>unix:///var/run/docker.sock</code></p>
            <input id="docker-url" type="text" value={values.DOCKER_URL}
              onChange={e => set('DOCKER_URL', e.target.value)}
              placeholder="unix:///var/run/docker.sock" disabled />
          </div>
        </div>
      </div>

      {/* ── Portainer ── */}
      <div className="settings-section settings-section-disabled">
        <div className="settings-section-header">
          <div>
            <h3>Portainer <span className="coming-soon">Coming Soon</span></h3>
            <p className="settings-section-desc">
              Connect to Portainer to discover container IPs across all managed Docker environments.
            </p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="settings-field">
            <label htmlFor="portainer-url">Portainer URL</label>
            <p className="field-hint">Base URL of your Portainer instance, e.g. <code>http://portainer.local:9000</code></p>
            <input id="portainer-url" type="text" value={values.PORTAINER_URL}
              onChange={e => set('PORTAINER_URL', e.target.value)}
              placeholder="http://192.168.1.4:9000" disabled />
          </div>
          <div className="settings-field">
            <label htmlFor="portainer-api-key">API Key</label>
            <p className="field-hint">
              Generate in Portainer → My Account → Access Tokens.
              {values.PORTAINER_API_KEY === PLACEHOLDER && <span className="configured-badge"> ✓ Configured</span>}
            </p>
            <input id="portainer-api-key" type="password" value={values.PORTAINER_API_KEY}
              onChange={e => set('PORTAINER_API_KEY', e.target.value)}
              placeholder="Paste API key here" autoComplete="off" disabled />
          </div>
        </div>
      </div>
    </div>
  )
}
