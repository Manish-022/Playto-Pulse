import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Error handling for root element
const rootElement = document.getElementById('root');
if (!rootElement) {
    console.error('Failed to find the root element');
} else {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
}
