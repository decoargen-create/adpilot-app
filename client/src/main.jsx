import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { PublishProvider } from './context/PublishContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { LanguageProvider } from './context/LanguageContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PublishProvider>
          <CurrencyProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </CurrencyProvider>
        </PublishProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
