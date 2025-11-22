"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from 'react-i18next'
import { Typography } from "antd"

import { ModelConfigSection, ModelConfigSectionRef } from './components/modelConfig'

const { Title } = Typography

// Add interface definition
interface AppModelConfigProps {
  skipModelVerification?: boolean;
  onSelectedModelsChange?: (
    selected: Record<string, Record<string, string>>
  ) => void;
  onEmbeddingConnectivityChange?: (status: {
    // can add multi_embedding in future
    embedding?: string;
  }) => void;
  // Expose a ref from parent to allow programmatic dropdown change
  forwardedRef?: React.Ref<ModelConfigSectionRef>;
}

export default function AppModelConfig({
  skipModelVerification = false,
  onSelectedModelsChange,
  onEmbeddingConnectivityChange,
  forwardedRef,
}: AppModelConfigProps) {
  const { t } = useTranslation();
  const [isClientSide, setIsClientSide] = useState(false);
  const modelConfigRef = useRef<ModelConfigSectionRef | null>(null);

  // Add useEffect hook for initial configuration loading
  useEffect(() => {
    setIsClientSide(true);

    return () => {
      setIsClientSide(false);
    };
  }, [skipModelVerification]);

  // Report selected models from child component to parent (if callback provided)
  useEffect(() => {
    if (!onSelectedModelsChange && !onEmbeddingConnectivityChange) return;
    const timer = setInterval(() => {
      const current = modelConfigRef.current?.getSelectedModels?.();
      const embeddingConn =
        modelConfigRef.current?.getEmbeddingConnectivity?.();
      if (current && onSelectedModelsChange) onSelectedModelsChange(current);
      if (embeddingConn && onEmbeddingConnectivityChange) {
        onEmbeddingConnectivityChange({
          embedding: embeddingConn.embedding,
        });
      }
    }, 300);
    return () => clearInterval(timer);
  }, [onSelectedModelsChange, onEmbeddingConnectivityChange]);

  // Bridge internal ref to external forwardedRef so parent can call simulateDropdownChange
  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === 'function') {
      forwardedRef(modelConfigRef.current);
    } else {
      // @ts-ignore allow writing current
      (forwardedRef as any).current = modelConfigRef.current;
    }
  }, [forwardedRef]);

  return (
    <div className="w-full h-full bg-[#FAFAF8] flex flex-col">
      {isClientSide ? (
        <>
          <div
            style={{
              padding: "20px 24px 12px 24px",
              borderBottom: "1px solid #E8E2D6",
              flexShrink: 0,
              backgroundColor: "#FDF8F2",
            }}
          >
            <Title level={4} style={{ margin: 0, color: "#1A1A1A" }}>{t("setup.config.modelSettings")}</Title>
          </div>
          <div
            style={{
              flex: 1,
              overflow: "auto",
            }}
          >
            <ModelConfigSection
              ref={modelConfigRef as any}
              skipVerification={skipModelVerification}
            />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span>{t("common.loading")}</span>
        </div>
      )}
    </div>
  );
}