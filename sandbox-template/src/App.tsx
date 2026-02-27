import { HAProvider } from "./lib/ha-provider";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <HAProvider>
      <Dashboard />
    </HAProvider>
  );
}
