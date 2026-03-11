"use client";

import { ReactNode } from "react";
import { ConfigProvider, App, unstableSetRender } from "antd";
import { createRoot, Root } from "react-dom/client";

import {
  AuthProvider as AuthContextProvider,
  AuthContext,
  useAuth,
} from "@/hooks/useAuth";

import { LoginModal, RegisterModal, SessionListeners } from "@/components/auth";
import { FullScreenLoading } from "@/components/ui/loading";

const antdContainerToRoot = new WeakMap<Element | DocumentFragment, Root>();

// Ant Design v5 compatibility bridge for React 19+/Next 15 runtime.
unstableSetRender((node, container) => {
  let root = antdContainerToRoot.get(container);

  if (!root) {
    root = createRoot(container);
    antdContainerToRoot.set(container, root);
  }

  root.render(node);

  return async () => {
    await Promise.resolve();
    root.unmount();
    antdContainerToRoot.delete(container);
  };
});

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
