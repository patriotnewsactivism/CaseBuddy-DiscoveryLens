import { AuthGuard } from './components/AuthGuard';
import DiscoveryApp from './components/DiscoveryApp';

export default function HomePage() {
  return (
    <AuthGuard>
      <DiscoveryApp />
    </AuthGuard>
  );
}
