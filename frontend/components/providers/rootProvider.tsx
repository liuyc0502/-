"use client";

import { ReactNode } from "react";
import { ConfigProvider, App } from "antd";

import {
  AuthProvider as AuthContextProvider,
  AuthContext,
  useAuth,
} from "@/hooks/useAuth";

import { LoginModal, RegisterModal, SessionListeners } from "@/components/auth";
import { FullScreenLoading } from "@/components/ui/loading";

function AppReadyWrapper({ children }: { children: ReactNode }) {
  const { isReady } = useAuth();
  return isReady ? <>{children}</> : <FullScreenLoading />;
}

/**
 * RootProvider Component
 * Integrates all necessary providers for the application
 */
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      getPopupContainer={() => document.body}
      // Suppress React version compatibility warning for Next.js 15
      // This is a false positive - we're using React 18.2.0, but Next.js 15
      // may trigger this warning due to internal optimizations
      warning={{ strict: false }}
    >
      <App>
        <AuthContextProvider>
          {(authContextValue) => (
            <AuthContext.Provider value={authContextValue}>
              <AppReadyWrapper>
                <>
                  {children}
                  <SessionListeners />
                </>
              </AppReadyWrapper>
              <LoginModal />
              <RegisterModal />
            </AuthContext.Provider>
          )}
        </AuthContextProvider>
      </App>
    </ConfigProvider>
  );
}
