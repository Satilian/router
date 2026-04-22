import { createContext, useContext, ReactNode } from 'react';

const OutletContext = createContext<ReactNode>(null);

export const OutletProvider = OutletContext.Provider;
export const Outlet = () => useContext(OutletContext);
