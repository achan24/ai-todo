'use client';

import dynamic from 'next/dynamic';

// Dynamically import the NotificationCenter component with ssr: false
const NotificationCenter = dynamic(() => import('./NotificationCenter'), {
  ssr: false,
});

export default function ClientNotificationWrapper() {
  return <NotificationCenter />;
}
