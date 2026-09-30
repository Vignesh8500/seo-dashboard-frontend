import { Monitor, Tablet, Smartphone, HelpCircle } from 'lucide-react';

export default function DeviceIcon({ device, size = 20 }) {
  const key = (device || '').toLowerCase();
  if (key === 'desktop') return <Monitor size={size} />;
  if (key === 'tablet') return <Tablet size={size} />;
  if (key === 'mobile') return <Smartphone size={size} />;
  return <HelpCircle size={size} />;
}