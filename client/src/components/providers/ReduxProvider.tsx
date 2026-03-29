'use client';
import { Provider } from 'react-redux';
import { useState } from 'react';
import { store } from '@/redux/store';

export default function ReduxProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Initializing the store once using lazy-initialization in useState
    // to avoid ref-access-during-render errors in React 18+.
    const [storeInstance] = useState(() => store());
    
    return <Provider store={storeInstance}>{children}</Provider>;
}
