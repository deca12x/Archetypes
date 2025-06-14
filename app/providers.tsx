'use client';

import { ThirdwebProvider } from '@thirdweb-dev/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create a QueryClient only once per app instance
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        activeChain="ethereum"
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      >
        {children}
      </ThirdwebProvider>
    </QueryClientProvider>
  );
} 