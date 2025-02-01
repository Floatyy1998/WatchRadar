import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import { App } from './App';
export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<App />} />
      </Routes>
    </Router>
  );
}
