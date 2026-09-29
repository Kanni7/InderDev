import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ProfileProvider from './engine/ProfileProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProfileProvider>
      <App />
    </ProfileProvider>
  </React.StrictMode>,
)
