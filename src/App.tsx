import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import About from './screens/About'
import BodyMap from './screens/BodyMap'
import CheckIn from './screens/CheckIn'
import Dashboard from './screens/Dashboard'
import Trends from './screens/Trends'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="check-in" element={<CheckIn />} />
        <Route path="trends" element={<Trends />} />
        <Route path="body-map" element={<BodyMap />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
