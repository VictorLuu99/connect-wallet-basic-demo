import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppPhoenixSDK from './App-PhoenixSDK.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppPhoenixSDK />
  </React.StrictMode>,
)
