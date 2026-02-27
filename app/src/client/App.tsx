import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import NetworkList from './components/NetworkList'
import IPAddressList from './components/IPAddressList'
import DevicesPage from './components/DevicesPage'
import SettingsPage from './components/SettingsPage'
import './styles.css'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/networks" element={<NetworkList />} />
          <Route path="/ips" element={<IPAddressList />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}