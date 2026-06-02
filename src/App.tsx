import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { lazy, Suspense } from 'react'

const DesktopPage = lazy(() => import('./pages/DesktopPage'))
const MobilePage = lazy(() => import('./pages/MobilePage'))

function Loading() {
  return (
    <div className="flex items-center justify-center h-screen text-slate-400">
      <i className="fa-solid fa-spinner fa-spin text-2xl" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<DesktopPage />} />
          <Route path="/mobile" element={<MobilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
